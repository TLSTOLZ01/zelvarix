// api/add-card.js — sends a trialing customer to Stripe to add a card and their full billing address.
// The address is what lets Stripe Tax charge the right sales tax on the first paid invoice, so Checkout
// is told to always collect it. The webhook (stripe-webhook.js, "card added") then saves the card and
// address on the customer and turns automatic tax on for the subscription.
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zelvarix.ai';

function fail(res, status, code, message) {
  return res.status(status).json({ error: message, code });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return fail(res, 401, 'unauthorized', 'Please sign in.');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData || !userData.user) return fail(res, 401, 'unauthorized', 'Your session expired. Please sign in again.');
    const user = userData.user;

    const { data: mem } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle();
    if (!mem || !mem.team_id) return fail(res, 404, 'no_team', 'Account not found.');
    const { data: team } = await supabase.from('teams')
      .select('id, plan, stripe_customer_id, stripe_subscription_id').eq('id', mem.team_id).single();
    if (!team || !team.stripe_customer_id || !team.stripe_subscription_id) {
      return fail(res, 409, 'no_subscription', 'Start your free trial first.');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'usd',
      customer: team.stripe_customer_id,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      metadata: {
        kind: 'add_card',
        userId: user.id,
        teamId: team.id,
        subscriptionId: team.stripe_subscription_id,
      },
      success_url: `${APP_URL}/?card=added`,
      cancel_url: `${APP_URL}/?card=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('add-card error:', err);
    return res.status(500).json({ error: 'Could not open the card page. Please try again.', code: 'server_error' });
  }
}
