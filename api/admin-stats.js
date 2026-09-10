import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Only this email may pull KPI data. Checked against the verified Supabase session,
// not a value the client can send — a spoofed request body can't get past this.
const ADMIN_EMAIL = 't_stolzenburg@hotmail.com';

const PLAN_PRICE = { starter: 59, pro: 99, team: 249 }; // matches Stripe list prices

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify the caller against their Supabase session token, not a client-supplied email
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid session' });
    if ((userData.user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const now = new Date();
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // All teams — one row per team, plan null = free/no active subscription
    const { data: teams, error: teamsErr } = await supabase
      .from('teams')
      .select('id, plan, stripe_subscription_id, trial_end, created_at');
    if (teamsErr) throw teamsErr;

    const active = teams.filter(t => t.plan && PLAN_PRICE[t.plan]);
    const byPlan = { starter: 0, pro: 0, team: 0 };
    active.forEach(t => { byPlan[t.plan] = (byPlan[t.plan] || 0) + 1; });
    const mrr = active.reduce((sum, t) => sum + (PLAN_PRICE[t.plan] || 0), 0);

    const trialing = teams.filter(t => t.trial_end && new Date(t.trial_end) > now && t.plan);
    const trialsStartedThisWeek = teams.filter(t => t.created_at && new Date(t.created_at) >= startOfWeek).length;
    const trialsStartedThisMonth = teams.filter(t => t.created_at && new Date(t.created_at) >= startOfMonth).length;

    // Cancellations: pull recent subscription.deleted events from Stripe directly,
    // since Supabase overwrites the team row rather than keeping cancellation history
    const cancelEvents = await stripe.events.list({
      type: 'customer.subscription.deleted',
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
      limit: 100,
    });
    const cancellationsThisWeek = cancelEvents.data.filter(e => new Date(e.created * 1000) >= startOfWeek).length;
    const cancellationsThisMonth = cancelEvents.data.filter(e => new Date(e.created * 1000) >= startOfMonth).length;
    const cancellationsLast30d = cancelEvents.data.length;

    // Rough churn: cancellations this month over (active now + cancellations this month) as a stand-in for "active at start of month"
    const churnRateThisMonth = active.length + cancellationsThisMonth > 0
      ? Math.round((cancellationsThisMonth / (active.length + cancellationsThisMonth)) * 1000) / 10
      : 0;

    // Top-up revenue: successful one-time checkout sessions in the last 30 days
    const checkoutEvents = await stripe.events.list({
      type: 'checkout.session.completed',
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
      limit: 100,
    });
    const topups = checkoutEvents.data.filter(e => {
      const planId = e.data?.object?.metadata?.planId || '';
      return planId.startsWith('topup_');
    });
    const topupRevenueLast30d = topups.reduce((sum, e) => sum + ((e.data.object.amount_total || 0) / 100), 0);

    return res.status(200).json({
      generatedAt: now.toISOString(),
      subscriptions: {
        active: active.length,
        byPlan,
        mrr,
        trialing: trialing.length,
      },
      trials: {
        startedThisWeek: trialsStartedThisWeek,
        startedThisMonth: trialsStartedThisMonth,
      },
      cancellations: {
        thisWeek: cancellationsThisWeek,
        thisMonth: cancellationsThisMonth,
        last30d: cancellationsLast30d,
        churnRateThisMonthPct: churnRateThisMonth,
      },
      topups: {
        countLast30d: topups.length,
        revenueLast30d: Math.round(topupRevenueLast30d * 100) / 100,
      },
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: err.message });
  }
}
