import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// LIVE mode Price IDs (cut over Sep 7, 2026)
const PRICE_IDS = {
  starter: 'price_1UD4yLKozvMTxl0J8VfF0eTf',
  pro:     'price_1UD4yMKozvMTxl0JvuEg3mDs',
  team:    'price_1UD4yGKozvMTxl0JeF0tT9Pn',
  topup_small:  'price_1UD4yJKozvMTxl0Jmc9HaV5O',
  topup_medium: 'price_1UD4yKKozvMTxl0Jwv92VJVC',
  topup_large:  'price_1UD4yGKozvMTxl0JNJT7nLqD',
};
const PLAN_CONFIG = {
  starter: { reveals_total:20, searches_total:30, results_per_search:3 },
  pro:     { reveals_total:50, searches_total:50, results_per_search:5 },
  team:    { reveals_total:100, searches_total:80, results_per_search:10 },
};
const TOPUP_CONFIG = {
  topup_small:  { reveals:10, searches:10 },
  topup_medium: { reveals:25, searches:25 },
  topup_large:  { reveals:50, searches:50 },
};
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { planId, userId, teamId, email, mode } = req.body;
    if (!planId || !userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }
    const isTopUp = planId.startsWith('topup_');
    const isSubscription = !isTopUp;
    const sessionConfig = {
      payment_method_types: ['card'],
      customer_email: email,
      metadata: {
        userId,
        teamId: teamId || '',
        planId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zelvarix.ai'}?payment=success&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zelvarix.ai'}?payment=cancelled`,
      // Stripe Tax: calculate and collect sales tax automatically based on the
      // customer's billing address. Requires Stripe Tax to be activated in the
      // Dashboard with an origin address and state registrations (e.g. Texas)
      // set up — see Tax settings. Applies to both subscriptions and top-ups.
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
    };
    if (isSubscription) {
      sessionConfig.mode = 'subscription';
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
      // 7-day free trial, no card required upfront
      sessionConfig.subscription_data = {
        trial_period_days: 7,
        metadata: { userId, teamId: teamId || '', planId },
      };
      sessionConfig.payment_method_collection = 'if_required';
    } else {
      // Top-up pack — one-time payment
      sessionConfig.mode = 'payment';
      sessionConfig.line_items = [{ price: priceId, quantity: 1 }];
      // Ensures a Customer object is created even for one-time payments, which
      // Stripe Tax needs to properly record and report the transaction.
      sessionConfig.customer_creation = 'always';
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
