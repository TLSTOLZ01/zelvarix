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
