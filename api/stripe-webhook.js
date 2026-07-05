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
          // Top-up pack purchased
          const topup = TOPUP_CONFIG[planId];
          if (!topup || !teamId) break;
 
          const { data: team } = await supabase
            .from('teams')
            .select('reveals_total, searches_total')
            .eq('id', teamId)
            .single();
 
          if (team) {
            await supabase.from('teams').update({
              reveals_total: (team.reveals_total || 0) + topup.reveals,
              searches_total: (team.searches_total || 0) + topup.searches,
            }).eq('id', teamId);
          }
        }
        break;
      }
 
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { userId } = subscription.metadata || {};
        let { teamId, planId } = subscription.metadata || {};
        if (!userId || !planId) break;
 
        // Defensive fallback: if teamId is missing from metadata (e.g. a React state
        // timing issue on signup), look up the user's real team instead of creating
        // an orphaned duplicate team row.
        if (!teamId) {
          const { data: mem } = await supabase.from('team_members').select('team_id').eq('user_id', userId).maybeSingle();
          teamId = mem?.team_id || null;
        }
 
        const config = PLAN_CONFIG[planId];
        if (!config) break;
 
        const isActive = ['active', 'trialing'].includes(subscription.status);
        if (!isActive) break;
 
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
 
        if (teamId) {
          // Update existing team
          await supabase.from('teams').update({
            plan: config.plan,
            reveals_total: config.reveals_total,
            searches_total: config.searches_total,
            results_per_search: config.results_per_search,
            reveals_used: 0,
            searches_used: 0,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            trial_end: trialEnd,
          }).eq('id', teamId);
        } else {
          // Create new team for this user
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
            // Add user as admin of the new team
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
        const { teamId } = subscription.metadata || {};
        if (!teamId) break;
 
        // Reset team to free state
        await supabase.from('teams').update({
          plan: null,
          reveals_total: 0,
          searches_total: 0,
          results_per_search: 3,
          stripe_subscription_id: null,
          trial_end: null,
        }).eq('id', teamId);
        break;
      }
 
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_cycle') {
          // Monthly renewal — reset usage counters
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const { teamId } = subscription.metadata || {};
          if (!teamId) break;
 
          await supabase.from('teams').update({
            reveals_used: 0,
            searches_used: 0,
            reveals_reset_date: new Date().toISOString(),
          }).eq('id', teamId);
        }
        break;
      }
 
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const { teamId } = subscription.metadata || {};
        if (!teamId) break;
 
        // Flag team as payment failed — could show warning in app
        console.log(`Payment failed for team ${teamId}`);
        break;
      }
    }
 
    return res.status(200).json({ received: true });
 
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
 
// Helper to get raw body for Stripe signature verification
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
