const PDL_BASE = 'https://api.peopledatalabs.com/v5';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'PDL_API_KEY not configured' });
  }

  try {
    if (req.method === 'POST') {
      const { sql, size = 25, from = 0 } = req.body;

      const pdlRes = await fetch(`${PDL_BASE}/person/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({ sql, size, from, pretty: false }),
      });

      const data = await pdlRes.json();
      return res.status(pdlRes.status).json(data);
    }

    if (req.method === 'GET') {
      const { pdl_id, name, company, profile } = req.query;
      const params = new URLSearchParams();
      if (pdl_id)  params.append('pdl_id',  pdl_id);
      if (name)    params.append('name',    name);
      if (company) params.append('company', company);
      if (profile) params.append('profile', profile);

      const pdlRes = await fetch(`${PDL_BASE}/person/enrich?${params.toString()}`, {
        headers: { 'X-Api-Key': apiKey },
      });

      const data = await pdlRes.json();
      return res.status(pdlRes.status).json({ data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('PDL proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
