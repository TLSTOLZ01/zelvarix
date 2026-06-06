export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    if (req.method === 'POST') {
      const size = (req.body && req.body.size) || 5;
      const from = (req.body && req.body.from) || 0;

      const pdlRes = await fetch('https://api.peopledatalabs.com/v5/person/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          query: {
            bool: {
              must: [
                { exists: { field: "job_title" } }
              ]
            }
          },
          size: size,
          from: from,
        }),
      });

      const data = await pdlRes.json();
      return res.status(pdlRes.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
