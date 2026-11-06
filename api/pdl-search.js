// v4 - PDL native industry search, now authenticated and quota-enforced server-side
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HARD_MAX_RESULTS = 10; // never request more than this from PDL in one call

function fail(res, status, type, message) {
  return res.status(status).json({ error: { type, message } });
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    const body = req.body || {};

    // 1. Who is asking? Every search must come from a signed-in user.
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return fail(res, 401, 'unauthorized', 'Please sign in to search.');
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData || !userData.user) return fail(res, 401, 'unauthorized', 'Your session expired. Please sign in again.');
    const userId = userData.user.id;

    // 2. Which team (and plan) do they belong to?
    const { data: mems } = await supabase.from('team_members').select('team_id').eq('user_id', userId).limit(1);
    const teamId = mems && mems[0] && mems[0].team_id;
    if (!teamId) return fail(res, 402, 'no_plan', 'Start your free trial to run live searches.');
    const { data: team } = await supabase.from('teams')
      .select('id, plan, searches_used, searches_total, results_per_search')
      .eq('id', teamId).single();
    if (!team || !team.plan || !(team.searches_total > 0)) {
      return fail(res, 402, 'no_plan', 'Start your free trial to run live searches.');
    }

    // 2b. Refuse a search with nothing to search for. It would return random people and cost
    //     PDL credits. "Load more" (scroll_token) continues an earlier search, so it is exempt.
    const f0 = body.filters || {};
    const hasCriteria = !!(
      (body.query || '').trim() || (body.companyName || '').trim() || (body.companyKeyword || '').trim() ||
      (f0.pdlIndustry || '').trim() || (f0.city || '').trim() ||
      (f0.size && f0.size !== 'Any Size') || (f0.seniority && f0.seniority !== 'Any Seniority') ||
      (f0.department && f0.department !== 'Any Department') || (f0.state && f0.state !== 'Any State')
    );
    if (!body.scroll_token && !hasCriteria) {
      return fail(res, 400, 'no_criteria', 'Add at least one filter or a name to search. Nothing was spent.');
    }

    // 3. Any searches left this period?
    const used = team.searches_used || 0;
    if (used >= team.searches_total) {
      return fail(res, 403, 'quota_exceeded', 'You have used all your searches for this period.');
    }

    // 4. Reserve the search before spending PDL credits. The compare-and-set stops parallel
    //    requests from slipping past the limit. It is refunded below if PDL returns nothing.
    const { data: reserved } = await supabase.from('teams')
      .update({ searches_used: used + 1 })
      .eq('id', team.id).eq('searches_used', used).select('searches_used');
    if (!reserved || reserved.length === 0) {
      return fail(res, 409, 'busy', 'Please try that search again.');
    }
    const refund = () => supabase.from('teams').update({ searches_used: used }).eq('id', team.id);

    // Result count comes from the plan, not from the browser, and is capped.
    const requested = parseInt(body.size, 10) || 3;
    const size = Math.max(1, Math.min(requested, team.results_per_search || 3, HARD_MAX_RESULTS));
    const scroll_token = body.scroll_token || null;
    const filters = body.filters || {};
    const query = body.query || '';
    const company_keyword = body.companyKeyword || '';
    const company_name = body.companyName || '';

    const must = [
      { exists: { field: 'job_title' } },
      { exists: { field: 'full_name' } }
    ];

    // Person name search
    if (query && query.trim()) {
      must.push({
        bool: {
          should: [
            { match: { full_name: query.trim() } },
            { match: { job_title: query.trim() } }
          ]
        }
      });
    }

    // Exact company name (e.g. "Chevron"). Uses match_phrase, not match: a plain
    // "match" tokenizes the input and matches ANY of the words anywhere in the
    // field, so a two-word company name like "Senior Estate" was matching every
    // company containing "senior" OR "estate" — millions of unrelated records.
    // match_phrase requires the words to appear together, in order.
    if (company_name && company_name.trim()) {
      must.push({ match_phrase: { job_company_name: company_name.trim() } });
    }

    // Company keyword — broad match (e.g. "funeral", "beauty salon")
    if (company_keyword && company_keyword.trim() && !company_name.trim()) {
      must.push({ match: { job_company_name: company_keyword.trim().toLowerCase() } });
    }

    // PDL native industry filter
    if (filters.pdlIndustry && filters.pdlIndustry.trim()) {
      must.push({ term: { job_company_industry: filters.pdlIndustry.toLowerCase() } });
    }

    // Seniority filter
    const seniorityMap = {
      'Owner':'owner','Founder':'founder','C-Suite':'c_suite',
      'Partner':'partner','VP':'vp','Head':'director',
      'Director':'director','Manager':'manager','Senior':'senior',
      'Entry-Level':'entry','Intern':'training'
    };
    if (filters.seniority && filters.seniority !== 'Any Seniority' && seniorityMap[filters.seniority]) {
      must.push({ term: { job_title_levels: seniorityMap[filters.seniority] } });
    }

    // Department filter
    if (filters.department && filters.department !== 'Any Department') {
      must.push({ term: { job_title_role: filters.department.toLowerCase() } });
    }

    // Company size filter
    const sizeMap = {
      'Self-Employed':[1,1],'1-10':[1,10],'11-50':[11,50],
      '51-200':[51,200],'201-500':[201,500],'501-1,000':[501,1000],
      '1,001-5,000':[1001,5000],'5,001-10,000':[5001,10000],'10,001+':[10001,1000000]
    };
    if (filters.size && filters.size !== 'Any Size' && sizeMap[filters.size]) {
      const range = sizeMap[filters.size];
      must.push({ range: { job_company_employee_count: { gte: range[0], lte: range[1] } } });
    }

    // State filter
    if (filters.state && filters.state !== 'Any State') {
      must.push({ term: { location_region: filters.state.toLowerCase() } });
    }

    // City filter
    if (filters.city && filters.city.trim()) {
      must.push({ match: { location_locality: filters.city.trim().toLowerCase() } });
    }

    const payload = {
      query: { bool: { must } },
      size: size,
      pretty: false,
      required: 'job_title AND full_name'
    };

    if (scroll_token) payload.scroll_token = scroll_token;

    const pdlRes = await fetch('https://api.peopledatalabs.com/v5/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await pdlRes.json();
    console.log('PDL status:', pdlRes.status, 'results:', (data.data || []).length);

    // Only a successful search uses up one of the customer's searches.
    if (pdlRes.status === 200) {
      data.zelvarix = { searches_used: used + 1, searches_total: team.searches_total };
    } else {
      await refund();
    }
    return res.status(pdlRes.status).json(data);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
