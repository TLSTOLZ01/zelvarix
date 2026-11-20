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

// Same price-to-plan map the Stripe webhook uses
const PRICE_TO_PLAN = {
  'price_1UD4yLKozvMTxl0J8VfF0eTf': 'starter',
  'price_1UD4yMKozvMTxl0JvuEg3mDs': 'pro',
  'price_1UD4yGKozvMTxl0JeF0tT9Pn': 'team',
};

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
    const DAY = 24 * 60 * 60 * 1000;

    // ── People: auth users + profiles + teams, joined in memory ──
    const { data: authList, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authErr) throw authErr;
    const authUsers = authList?.users || [];

    const { data: profs } = await supabase.from('profiles').select('id, name, signup_ref, signup_at');
    const profById = new Map((profs || []).map(p => [p.id, p]));

    const { data: members } = await supabase.from('team_members').select('team_id, user_id');
    const teamIdByUser = new Map((members || []).map(m => [m.user_id, m.team_id]));

    // is_internal is added by the cleanup SQL. If the column isn't there yet, fall back gracefully.
    let teams = [];
    let hasInternalCol = true;
    {
      const r = await supabase.from('teams').select('id, plan, stripe_subscription_id, trial_end, reveals_used, created_at, is_internal');
      if (r.error) {
        hasInternalCol = false;
        const r2 = await supabase.from('teams').select('id, plan, stripe_subscription_id, trial_end, reveals_used, created_at');
        if (r2.error) throw r2.error;
        teams = r2.data || [];
      } else {
        teams = r.data || [];
      }
    }
    const teamById = new Map(teams.map(t => [t.id, t]));

    const users = authUsers.map(u => {
      const prof = profById.get(u.id) || {};
      const team = teamById.get(teamIdByUser.get(u.id)) || {};
      return {
        id: u.id,
        email: u.email || '',
        name: prof.name || '',
        source: prof.signup_ref || 'direct / organic',
        signedUpAt: prof.signup_at || u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        plan: team.plan || null,
        trialEnd: team.trial_end || null,
        revealsUsed: team.reveals_used ?? 0,
        isInternal: !!team.is_internal,
      };
    }).sort((a, b) => new Date(b.signedUpAt) - new Date(a.signedUpAt));

    const internalEmails = new Set(users.filter(u => u.isInternal).map(u => u.email.toLowerCase()));
    const realUsers = users.filter(u => !u.isInternal);

    // ── Subscriptions: Stripe is the source of truth (Supabase only mirrors current state) ──
    const subs = [];
    for await (const s of stripe.subscriptions.list({ status: 'all', limit: 100, expand: ['data.customer'] })) {
      subs.push(s);
      if (subs.length >= 500) break;
    }
    const subRows = subs.map(s => {
      const priceId = s.items?.data?.[0]?.price?.id;
      const plan = PRICE_TO_PLAN[priceId] || s.metadata?.planId || null;
      const email = (s.customer && typeof s.customer === 'object' ? s.customer.email : '') || '';
      const trialEnd = s.trial_end ? s.trial_end * 1000 : null;
      const endedAt = s.ended_at ? s.ended_at * 1000 : null;
      // A subscription that ended at its trial end was never converted: that is an expired trial, not churn
      const trialExpired = s.status === 'canceled' && trialEnd && endedAt && Math.abs(endedAt - trialEnd) < 2 * 60 * 60 * 1000;
      return {
        id: s.id, email, plan, status: s.status,
        created: s.created * 1000, trialEnd, endedAt,
        hadTrial: !!s.trial_end,
        trialExpired: !!trialExpired,
        internal: internalEmails.has(email.toLowerCase()),
      };
    }).filter(r => !r.internal);

    const paying = subRows.filter(r => r.status === 'active' && PLAN_PRICE[r.plan]);
    const trialing = subRows.filter(r => r.status === 'trialing');
    const byPlan = { starter: 0, pro: 0, team: 0 };
    paying.forEach(r => { byPlan[r.plan] += 1; });
    const mrr = paying.reduce((sum, r) => sum + PLAN_PRICE[r.plan], 0);

    const trialSubs = subRows.filter(r => r.hadTrial);
    const trialsStartedThisWeek = trialSubs.filter(r => r.created >= startOfWeek.getTime()).length;
    const trialsStartedThisMonth = trialSubs.filter(r => r.created >= startOfMonth.getTime()).length;
    const trialsExpired30d = subRows.filter(r => r.trialExpired && r.endedAt >= thirtyDaysAgo.getTime()).length;

    // True cancellations = ended subscriptions that were not just an unconverted trial
    const cancelled = subRows.filter(r => r.status === 'canceled' && !r.trialExpired && r.endedAt);
    const cancellationsThisWeek = cancelled.filter(r => r.endedAt >= startOfWeek.getTime()).length;
    const cancellationsThisMonth = cancelled.filter(r => r.endedAt >= startOfMonth.getTime()).length;
    const cancellationsLast30d = cancelled.filter(r => r.endedAt >= thirtyDaysAgo.getTime()).length;
    const churnRateThisMonth = paying.length + cancellationsThisMonth > 0
      ? Math.round((cancellationsThisMonth / (paying.length + cancellationsThisMonth)) * 1000) / 10
      : 0;

    const trialsEndingSoon = trialing
      .filter(r => r.trialEnd)
      .map(r => ({ email: r.email, plan: r.plan, trialEnd: new Date(r.trialEnd).toISOString(), daysLeft: Math.max(0, Math.ceil((r.trialEnd - now.getTime()) / DAY)) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    // ── Top-ups (unchanged) ──
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

    // ── Signups by source (real users only) ──
    const tally = {};
    for (const u of realUsers) {
      const source = u.source || 'direct / organic';
      if (!tally[source]) tally[source] = { source, last30d: 0, allTime: 0 };
      tally[source].allTime += 1;
      if (u.signedUpAt && new Date(u.signedUpAt) >= thirtyDaysAgo) tally[source].last30d += 1;
    }
    const sources = Object.values(tally).sort((a, b) => b.last30d - a.last30d || b.allTime - a.allTime);

    // ── Activation funnel (real users only) ──
    const realEmails = new Set(realUsers.map(u => u.email.toLowerCase()));
    const funnel = {
      signedUp: realUsers.length,
      revealedContact: realUsers.filter(u => u.revealsUsed > 0).length,
      startedTrial: new Set(trialSubs.filter(r => realEmails.has(r.email.toLowerCase())).map(r => r.email.toLowerCase())).size,
      paying: paying.length,
    };

    return res.status(200).json({
      generatedAt: now.toISOString(),
      internalExcluded: internalEmails.size,
      internalFlagReady: hasInternalCol,
      subscriptions: { active: paying.length, byPlan, mrr, trialing: trialing.length },
      trials: { startedThisWeek: trialsStartedThisWeek, startedThisMonth: trialsStartedThisMonth, expiredLast30d: trialsExpired30d },
      cancellations: { thisWeek: cancellationsThisWeek, thisMonth: cancellationsThisMonth, last30d: cancellationsLast30d, churnRateThisMonthPct: churnRateThisMonth },
      topups: { countLast30d: topups.length, revenueLast30d: Math.round(topupRevenueLast30d * 100) / 100 },
      signups: { total: realUsers.length, sources },
      funnel,
      trialsEndingSoon,
      users,
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: err.message });
  }
}
