import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_CONFIG = {
  starter: { plan:'starter', reveals_total:20,  searches_total:30, results_per_search:3 },
  pro:     { plan:'pro',     reveals_total:50,  searches_total:50, results_per_search:5 },
  team:    { plan:'team',    reveals_total:100, searches_total:80, results_per_search:10 },
};

// Trial allowance (Starter and Pro, no card). Capped so an unpaid trial costs at most
// searches_total x results_per_search = 30 PDL credits (about $8.40). Raise or lower here.
// The full plan quota is granted when the trial converts to a paid subscription.
const TRIAL_CONFIG = { reveals_total:10, searches_total:10, results_per_search:3 };

const TOPUP_CONFIG = {
  topup_small:  { reveals:10, searches:10 },
  topup_medium: { reveals:25, searches:25 },
  topup_large:  { reveals:50, searches:50 },
};

// LIVE Price IDs → plan. The subscription's current price is the source of truth
// for which plan a team is on (metadata.planId is only what they picked at checkout
// and never changes when they switch plans in the Customer Portal).
const PRICE_TO_PLAN = {
  'price_1UD4yLKozvMTxl0J8VfF0eTf': 'starter',
  'price_1UD4yMKozvMTxl0JvuEg3mDs': 'pro',
  'price_1UD4yGKozvMTxl0JeF0tT9Pn': 'team',
};

const FREE_STATE = {
  plan: null,
  reveals_total: 0,
  searches_total: 0,
  results_per_search: 3,
  stripe_subscription_id: null,
  trial_end: null,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const body = await getRawBody(req);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        // "Add a card" from the free trial (api/add-card.js): save the card and billing address
        // on the customer and turn automatic tax on, so the first paid invoice is taxed correctly.
        if (session.mode === 'setup' && session.metadata?.kind === 'add_card') {
          await handleCardAdded(session);
          break;
        }
        const { userId, teamId, planId } = session.metadata || {};
        if (!userId || !planId) break;

        if (planId.startsWith('topup_')) {
          // Top-up pack purchased — add credits on top of the current allowance
          const topup = TOPUP_CONFIG[planId];
          if (!topup) break;
          const resolvedTeamId = teamId || await teamIdForUser(userId);
          if (!resolvedTeamId) break;

          const { data: team } = await supabase
            .from('teams')
            .select('reveals_total, searches_total')
            .eq('id', resolvedTeamId)
            .single();

          if (team) {
            await supabase.from('teams').update({
              reveals_total: (team.reveals_total || 0) + topup.reveals,
              searches_total: (team.searches_total || 0) + topup.searches,
            }).eq('id', resolvedTeamId);
          }
        }
        // Subscriptions are handled by customer.subscription.created/updated
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { userId } = subscription.metadata || {};

        // Plan comes from the live price on the subscription; fall back to metadata
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const planId = PRICE_TO_PLAN[priceId] || subscription.metadata?.planId;
        const config = PLAN_CONFIG[planId];
        if (!config) break;

        const isActive = ['active', 'trialing'].includes(subscription.status);
        if (!isActive) break; // past_due/unpaid/canceled handled elsewhere or ignored

        const isTrialing = subscription.status === 'trialing';
        const quota = isTrialing ? TRIAL_CONFIG : config;
        const convertedFromTrial = event.type === 'customer.subscription.updated'
          && subscription.status === 'active'
          && event.data.previous_attributes?.status === 'trialing';

        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;

        let teamId = await resolveTeamId(subscription);
        if (!teamId && userId) teamId = await teamIdForUser(userId);

        if (teamId) {
          const { data: current } = await supabase
            .from('teams')
            .select('plan, stripe_subscription_id')
            .eq('id', teamId)
            .single();

          const isNewSubscription = !current?.stripe_subscription_id || current.stripe_subscription_id !== subscription.id;
          const planChanged = current?.plan !== config.plan;

          const update = {
            plan: config.plan,
            reveals_total: quota.reveals_total,
            searches_total: quota.searches_total,
            results_per_search: quota.results_per_search,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            trial_end: trialEnd,
          };
          // Only reset usage when the subscription is new or the plan actually changed.
          // Other updates (adding a card, cancel_at_period_end, renewal metadata) must
          // not wipe the team's usage counters.
          if (event.type === 'customer.subscription.created' || isNewSubscription || planChanged || convertedFromTrial) {
            update.reveals_used = 0;
            update.searches_used = 0;
          }

          await supabase.from('teams').update(update).eq('id', teamId);
        } else if (userId) {
          // No team found anywhere — create one and make the user its admin
          const { data: newTeam } = await supabase.from('teams').insert({
            name: `${planId} team`,
            plan: config.plan,
            reveals_total: quota.reveals_total,
            searches_total: quota.searches_total,
            results_per_search: quota.results_per_search,
            reveals_used: 0,
            searches_used: 0,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            trial_end: trialEnd,
          }).select().single();

          if (newTeam) {
            await supabase.from('team_members').insert({
              team_id: newTeam.id,
              user_id: userId,
              role: 'admin',
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const teamId = await resolveTeamId(subscription);
        if (!teamId) break;

        // Reset team to free state (trial expired with no card, or cancelled at period end)
        await supabase.from('teams').update(FREE_STATE).eq('id', teamId);
        await setCardFlag(teamId, false);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        // Stripe sends the customer reminder email (Settings → Subscriptions and emails).
        // Logged here so it's visible in Vercel; hook a custom email in later if needed.
        const subscription = event.data.object;
        const teamId = await resolveTeamId(subscription);
        console.log(`Trial ending soon for team ${teamId || '(unknown)'} sub ${subscription.id}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason !== 'subscription_cycle') break; // only renewals reset usage

        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const teamId = await resolveTeamId(subscription);
        if (!teamId) break;

        await supabase.from('teams').update({
          reveals_used: 0,
          searches_used: 0,
          reveals_reset_date: new Date().toISOString(),
        }).eq('id', teamId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const teamId = await resolveTeamId(subscription);
        // Stripe handles retries + dunning emails; flag here for visibility
        console.log(`Payment failed for team ${teamId || '(unknown)'} sub ${subscriptionId}`);
        break;
      }
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

// teams.has_payment_method is a convenience flag for the app ("card on file"). It is written in its
// own update so that a missing column can never break the main plan/quota updates.
async function setCardFlag(teamId, value) {
  try {
    const { error } = await supabase.from('teams').update({ has_payment_method: value }).eq('id', teamId);
    if (error) console.warn('has_payment_method not saved (column missing?):', error.message);
  } catch (e) { console.warn('has_payment_method not saved:', e.message); }
}

// Customer finished the "add a card" Checkout (setup mode).
async function handleCardAdded(session) {
  const { teamId, subscriptionId } = session.metadata || {};
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId || !session.setup_intent) { console.warn('card added: missing customer or setup intent'); return; }

  const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent, { expand: ['payment_method'] });
  const pm = setupIntent.payment_method;
  if (!pm || typeof pm === 'string') { console.warn('card added: no payment method on setup intent'); return; }

  const a = pm.billing_details?.address || {};
  const address = {};
  ['line1', 'line2', 'city', 'state', 'postal_code', 'country'].forEach(k => { if (a[k]) address[k] = a[k]; });
  const hasAddress = !!(address.line1 && address.postal_code && address.country);

  // Card + (if valid) billing address on the customer. validate_location 'immediately' makes Stripe
  // reject an address it cannot use for tax now, instead of failing quietly on the first invoice.
  let taxReady = false;
  try {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pm.id },
      name: pm.billing_details?.name || undefined,
      ...(hasAddress ? { address, tax: { validate_location: 'immediately' } } : {}),
    });
    taxReady = hasAddress;
  } catch (e) {
    console.error('TAX LOCATION PROBLEM: could not save billing address', customerId, e.message);
    // Still save the card so the customer is not left without a payment method
    await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
  }

  // Charge this card at the end of the trial, and calculate tax only if the address was accepted
  if (subscriptionId) {
    await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: pm.id,
      ...(taxReady ? { automatic_tax: { enabled: true } } : {}),
    });
  }
  if (!taxReady) console.error('TAX NOT ENABLED for subscription', subscriptionId, '- no valid billing address');

  const resolvedTeamId = teamId || (customerId ? (await supabase.from('teams').select('id').eq('stripe_customer_id', customerId).maybeSingle()).data?.id : null);
  if (resolvedTeamId) await setCardFlag(resolvedTeamId, true);
}

// Find the team for a subscription: metadata first, then by stored subscription id,
// then by stored customer id.
async function resolveTeamId(subscription) {
  const metaTeamId = subscription.metadata?.teamId;
  if (metaTeamId) return metaTeamId;

  const { data: bySub } = await supabase
    .from('teams').select('id').eq('stripe_subscription_id', subscription.id).maybeSingle();
  if (bySub?.id) return bySub.id;

  if (subscription.customer) {
    const { data: byCust } = await supabase
      .from('teams').select('id').eq('stripe_customer_id', subscription.customer).maybeSingle();
    if (byCust?.id) return byCust.id;
  }
  return null;
}

// Team a user belongs to (via team_members)
async function teamIdForUser(userId) {
  const { data: mem } = await supabase
    .from('team_members').select('team_id').eq('user_id', userId).maybeSingle();
  return mem?.team_id || null;
}

// Newer Stripe API versions moved invoice.subscription under invoice.parent
function invoiceSubscriptionId(invoice) {
  const sub = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  return typeof sub === 'string' ? sub : sub?.id || null;
}

// Raw body for Stripe signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export const config = {
  api: { bodyParser: false },
};
