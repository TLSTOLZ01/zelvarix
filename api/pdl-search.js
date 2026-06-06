export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    if (req.method === 'POST') {
      const body = req.body;
      const pdlRes = await fetch('https://api.peopledatalabs.com/v5/person/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({ sql: body.sql, size: body.size || 5, from: body.from || 0 }),
      });
      const data = await pdlRes.json();
      return res.status(pdlRes.status).json(data);
    }

    if (req.method === 'GET') {
      const params = new URLSearchParams();
      if (req.query.pdl_id)  params.append('pdl_id',   req.query.pdl_id);
      if (req.query.name)    params.append('name',     req.query.name);
      if (req.query.company) params.append('company',  req.query.company);
      if (req.query.profile) params.append('profile',  req.query.profile);
      const pdlRes = await fetch('https://api.peopledatalabs.com/v5/person/enrich?' + params.toString(), {
        headers: { 'X-Api-Key': apiKey },
      });
      const data = await pdlRes.json();
      return res.status(pdlRes.status).json({ data: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
