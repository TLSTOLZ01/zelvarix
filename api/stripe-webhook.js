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
            reveals_total: config.reveals_total,
            searches_total: config.searches_total,
            results_per_search: config.results_per_search,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            trial_end: trialEnd,
          };
          // Only reset usage when the subscription is new or the plan actually changed.
          // Other updates (adding a card, cancel_at_period_end, renewal metadata) must
          // not wipe the team's usage counters.
          if (event.type === 'customer.subscription.created' || isNewSubscription || planChanged) {
            update.reveals_used = 0;
            update.searches_used = 0;
          }

          await supabase.from('teams').update(update).eq('id', teamId);
        } else if (userId) {
          // No team found anywhere — create one and make the user its admin
          const { data: newTeam } = await supabase.from('teams').insert({
            name: `${planId} team`,
            plan: config.plan,
            reveals_total: config.reveals_total,
            searches_total: config.searches_total,
            results_per_search: config.results_per_search,
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
