export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    const size = (req.body && req.body.size) || 5;
    const from = (req.body && req.body.from) || 0;

    const esQuery = {
      bool: {
        must: [
          { exists: { field: "job_title" } },
          { exists: { field: "full_name" } }
        ]
      }
    };

    const payload = {
      query: esQuery,
      size: size,
      from: from,
      pretty: false
    };

    const pdlRes = await fetch('https://api.peopledatalabs.com/v5/person/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await pdlRes.json();
    console.log('PDL status:', pdlRes.status, 'error:', data.error);
    return res.status(pdlRes.status).json(data);

  } catch (err) {
    console.error('PDL proxy error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
