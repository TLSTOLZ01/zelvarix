import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// LIVE mode Price IDs (cut over Sep 7, 2026)
const PRICE_IDS = {
  starter: 'price_1UD4yLKozvMTxl0J8VfF0eTf',
  pro:     'price_1UD4yMKozvMTxl0JvuEg3mDs',
  team:    'price_1UD4yGKozvMTxl0JeF0tT9Pn',
  topup_small:  'price_1UD4yJKozvMTxl0Jmc9HaV5O',
  topup_medium: 'price_1UD4yKKozvMTxl0Jwv92VJVC',
  topup_large:  'price_1UD4yGKozvMTxl0JNJT7nLqD',
};
const TRIAL_PLANS = ['starter', 'pro']; // Team is annual-only with no free trial

// Used for paid plans and top-ups. Free trials do NOT come through here any more:
// they start from the app via api/start-trial.js (no Stripe page).
// This endpoint now requires a signed-in user and takes the user and team from the sign-in
// token, not from the request body.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { planId } = req.body || {};
    if (!planId) return res.status(400).json({ error: 'Missing required fields' });
    const priceId = PRICE_IDS[planId];
    if (!priceId) return res.status(400).json({ error: 'Invalid plan ID' });

    // Who is asking?
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Please sign in.' });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData || !userData.user) return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    const user = userData.user;
    const userId = user.id;
    const email = user.email;

    const { data: mem } = await supabase.from('team_members').select('team_id').eq('user_id', userId).maybeSingle();
    const teamId = (mem && mem.team_id) || '';
    let customerId = null;
    if (teamId) {
      const { data: team } = await supabase.from('teams').select('stripe_customer_id').eq('id', teamId).maybeSingle();
      customerId = (team && team.stripe_customer_id) || null;
    }

    const isTopUp = planId.startsWith('topup_');
    const isSubscription = !isTopUp;
    const sessionConfig = {
      payment_method_types: ['card'],
      metadata: { userId, teamId, planId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zelvarix.ai'}?payment=success&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zelvarix.ai'}?payment=cancelled`,
      // Stripe Tax: calculate and collect sales tax automatically based on the
      // customer's billing address. Requires Stripe Tax to be activated in the
      // Dashboard with an origin address and state registrations (e.g. Texas)
      // set up — see Tax settings. Applies to both subscriptions and top-ups.
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
    };
    // Reuse the team's Stripe customer so history stays in one place
    if (customerId) {
      sessionConfig.customer = customerId;
      sessionConfig.customer_update = { address: 'auto', name: 'auto' };
    } else {
      sessionConfig.customer_email = email;
    }

    if (isSubscription) {
      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
      sessionConfig.subscription_data = { metadata: { userId, teamId, planId } };
      // A free trial is only offered once, and never on Team. Everyone else subscribes with a card now.
      let trialAllowed = TRIAL_PLANS.includes(planId);
      if (trialAllowed) {
        const { data: profile } = await supabase.from('profiles').select('trial_flag').eq('id', userId).maybeSingle();
        if (profile && profile.trial_flag) trialAllowed = false;
      }
      if (trialAllowed && customerId) {
        const prior = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
        if (prior.data.length > 0) trialAllowed = false;
      }
      if (trialAllowed) {
        sessionConfig.subscription_data.trial_period_days = 7;
        // No-card trials: cancel cleanly at trial end instead of leaving the
        // subscription past_due with an unpaid invoice. Fires
        // customer.subscription.deleted, which downgrades the team to free.
        sessionConfig.subscription_data.trial_settings = { end_behavior: { missing_payment_method: 'cancel' } };
        sessionConfig.payment_method_collection = 'if_required';
      }
    } else {
      // Top-up pack — one-time payment
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
      // Ensures a Customer object is created even for one-time payments, which
      // Stripe Tax needs to properly record and report the transaction.
      if (!customerId) sessionConfig.customer_creation = 'always';
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
