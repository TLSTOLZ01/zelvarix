export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    const body = req.body || {};
    const size = body.size || 5;
    const scroll_token = body.scroll_token || null;
    const filters = body.filters || {};
    const query = body.query || '';

    // Build Elasticsearch must clauses from filters
    const must = [
      { exists: { field: "job_title" } },
      { exists: { field: "full_name" } }
    ];

    // Keyword search
    if (query && query.trim()) {
      must.push({
        bool: {
          should: [
            { match: { full_name: query.trim() } },
            { match: { job_title: query.trim() } },
            { match: { job_company_name: query.trim() } }
          ]
        }
      });
    }

    // Industry filter
    if (filters.industry && filters.industry !== 'All Industries') {
      must.push({ term: { job_company_industry: filters.industry.toLowerCase() } });
    }

    // Seniority filter
    const seniorityMap = {
      'Owner': 'owner', 'Founder': 'founder', 'C-Suite': 'c_suite',
      'Partner': 'partner', 'VP': 'vp', 'Head': 'director',
      'Director': 'director', 'Manager': 'manager', 'Senior': 'senior',
      'Entry-Level': 'entry', 'Intern': 'training'
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
      'Self-Employed': [1,1], '1-10': [1,10], '11-50': [11,50],
      '51-200': [51,200], '201-500': [201,500], '501-1,000': [501,1000],
      '1,001-5,000': [1001,5000], '5,001-10,000': [5001,10000], '10,001+': [10001,1000000]
    };
    if (filters.size && filters.size !== 'Any Size' && sizeMap[filters.size]) {
      const [min, max] = sizeMap[filters.size];
      must.push({ range: { job_company_employee_count: { gte: min, lte: max } } });
    }

    const payload = {
      query: { bool: { must } },
      size: size,
      pretty: false,
      required: "job_title AND full_name"
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
    return res.status(pdlRes.status).json(data);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
Now also update src/pdl-integration.js to pass filters and query to the proxy:
GitHub → src/pdl-integration.js → pencil → Ctrl+A → delete → paste:
jsconst PDL_PROXY = '/api/pdl-search';

export function searchPeople(options) {
  const filters  = (options && options.filters)  || {};
  const query    = (options && options.query)    || '';
  const pageSize = (options && options.pageSize) || 5;
  const scrollToken = (options && options.scrollToken) || null;

  const body = {
    size: pageSize,
    filters: filters,
    query: query,
  };

  if (scrollToken) body.scroll_token = scrollToken;

  return fetch(PDL_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function(res) {
    if (!res.ok) throw new Error('PDL search failed: ' + res.status);
    return res.json();
  }).then(function(data) {
    var people = data.data || [];
    return {
      contacts: people.map(function(p, i) { return mapPerson(p, i); }),
      total: data.total || people.length,
      scrollToken: data.scroll_token || null,
      hasMore: !!(data.scroll_token),
    };
  });
}

export function enrichPerson(contact) {
  return Promise.resolve(contact);
}

function mapPerson(p, i) {
  var exp = (p.experience && p.experience[0]) || {};
  var co  = exp.company || {};
  var lvl = (p.job_title_levels && p.job_title_levels[0]) || '';
  var em  = (p.emails && p.emails[0]) || {};
  var sm  = {
    owner:'Owner', founder:'Founder', c_suite:'C-Suite',
    partner:'Partner', vp:'VP', director:'Director',
    manager:'Manager', senior:'Senior', entry:'Entry-Level', training:'Intern'
  };

  var score = 50;
  if (em.valid) score += 15;
  if (['c_suite','vp','owner','founder'].indexOf(lvl) > -1) score += 15;
  if (['director','partner'].indexOf(lvl) > -1) score += 8;
  if (p.phone_numbers && p.phone_numbers.length) score += 7;
  if (p.linkedin_url) score += 3;
  if (score > 99) score = 99;

  return {
    id:          p.id || ('pdl_' + i),
    name:        p.full_name || 'Unknown',
    title:       p.job_title || '',
    company:     p.job_company_name || (co.name) || '',
    industry:    p.job_company_industry || co.industry || '',
    department:  p.job_title_role || '',
    seniority:   sm[lvl] || 'Unknown',
    location:    [p.location_locality, p.location_region, p.location_country].filter(Boolean).join(', '),
    email:       em.address || '',
    phone:       (p.phone_numbers && p.phone_numbers[0]) || '',
    employees:   mapEmployees(p.job_company_employee_count),
    revenue:     'Unknown',
    score:       score,
    verified:    !!(em.valid),
    linkedin:    !!(p.linkedin_url),
    tags:        [sm[lvl], p.job_company_industry].filter(Boolean),
    _pdlId:      p.id,
    _linkedinUrl: p.linkedin_url,
  };
}

function mapEmployees(count) {
  if (!count) return 'Unknown';
  if (count <= 1)     return 'Self-Employed';
  if (count <= 10)    return '1-10';
  if (count <= 50)    return '11-50';
  if (count <= 200)   return '51-200';
  if (count <= 500)   return '201-500';
  if (count <= 1000)  return '501-1,000';
  if (count <= 5000)  return '1,001-5,000';
  if (count <= 10000) return '5,001-10,000';
  return '10,001+';
}
