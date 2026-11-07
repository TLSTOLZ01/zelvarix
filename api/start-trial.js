// api/start-trial.js — starts the 7-day, no-card free trial straight from the app.
// No Stripe checkout page: this creates the Stripe customer and a trialing subscription in the
// background. The customer's billing address and card are collected later, by api/add-card.js,
// when they decide to keep the plan (Stripe Tax needs that address before the first paid invoice).
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// LIVE Price IDs (same as stripe-checkout.js and stripe-webhook.js)
const PRICE_IDS = {
  starter: 'price_1UD4yLKozvMTxl0J8VfF0eTf',
  pro:     'price_1UD4yMKozvMTxl0JvuEg3mDs',
};
// Keep identical to TRIAL_CONFIG in stripe-webhook.js (10 searches x 3 results = 30 PDL credits)
const TRIAL_CONFIG = { reveals_total: 10, searches_total: 10, results_per_search: 3 };

function fail(res, status, code, message) {
  return res.status(status).json({ error: message, code });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Who is asking? Must be a signed-in user.
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return fail(res, 401, 'unauthorized', 'Please sign in to start your trial.');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData || !userData.user) return fail(res, 401, 'unauthorized', 'Your session expired. Please sign in again.');
    const user = userData.user;

    // 2. Which plan? Trials exist for Starter and Pro only.
    const planId = (req.body && req.body.planId) || 'pro';
    const priceId = PRICE_IDS[planId];
    if (!priceId) return fail(res, 400, 'invalid_plan', 'Free trials are available on Starter and Pro.');

    // 3. Soft-flagged duplicate email (set at signup): no free trial, they subscribe instead.
    const { data: profile } = await supabase.from('profiles').select('trial_flag').eq('id', user.id).maybeSingle();
    if (profile && profile.trial_flag) {
      return fail(res, 403, 'trial_unavailable', 'A free trial was already used with a similar email address. Choose a plan to subscribe.');
    }

    // 4. Find the user's team (create one if signup didn't, e.g. Google sign-in).
    let teamId = null;
    const { data: mem } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle();
    teamId = mem && mem.team_id;
    if (!teamId) {
      const name = (user.user_metadata && user.user_metadata.name) || (user.email || 'My').split('@')[0];
      const { data: created } = await supabase.from('teams').insert({
        name: `${name}'s Team`, plan: null, reveals_total: 0, searches_total: 0,
        credits_total: 1000, credits_used: 0, seats_total: 10,
      }).select('id').single();
      if (!created) return fail(res, 500, 'team_create_failed', 'Could not set up your account. Please try again.');
      teamId = created.id;
      await supabase.from('team_members').insert({ team_id: teamId, user_id: user.id, role: 'admin', status: 'active' });
    }

    const { data: team } = await supabase.from('teams')
      .select('id, plan, stripe_customer_id, stripe_subscription_id').eq('id', teamId).single();
    if (!team) return fail(res, 404, 'no_team', 'Account not found.');
    if (team.stripe_subscription_id) return fail(res, 409, 'already_started', 'Your trial or plan is already active.');

    // 5. One trial per team, ever. A canceled trial clears the team row, so ask Stripe.
    let customerId = team.stripe_customer_id || null;
    if (customerId) {
      const prior = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
      if (prior.data.length > 0) {
        return fail(res, 409, 'trial_used', 'Your free trial has already been used. Choose a plan to subscribe.');
      }
    } else {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { userId: user.id, teamId } },
        { idempotencyKey: `trial-customer-${user.id}` }
      );
      customerId = customer.id;
    }

    // 6. Create the trialing subscription. No payment method, no automatic tax yet:
    //    add-card.js turns automatic tax on once it has the customer's billing address.
    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 7,
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        automatic_tax: { enabled: false },
        metadata: { userId: user.id, teamId, planId },
      },
      { idempotencyKey: `trial-sub-${user.id}-${customerId}` }
    );

    // 7. Write the trial allowance now so the app updates instantly (the webhook writes the same values).
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
    const resultsPerSearch = TRIAL_CONFIG.results_per_search;
    const teamUpdate = {
      plan: planId,
      reveals_total: TRIAL_CONFIG.reveals_total,
      searches_total: TRIAL_CONFIG.searches_total,
      results_per_search: resultsPerSearch,
      reveals_used: 0,
      searches_used: 0,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      trial_end: trialEnd,
    };
    await supabase.from('teams').update(teamUpdate).eq('id', teamId);

    return res.status(200).json({ ok: true, team_id: teamId, plan: planId, trial_end: trialEnd });
  } catch (err) {
    console.error('start-trial error:', err);
    return res.status(500).json({ error: 'Could not start your trial. Please try again.', code: 'server_error' });
  }
}
