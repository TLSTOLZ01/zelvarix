export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    const body = req.body || {};
    const scroll_token = body.scroll_token || null;

    const payload = {
      query: {
        bool: {
          must: [
            { exists: { field: "job_title" } }
          ]
        }
      },
      size: 5,
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

    const text = await pdlRes.text();
    console.log('PDL status:', pdlRes.status);
    console.log('PDL response preview:', text.slice(0, 300));

    const data = JSON.parse(text);
    return res.status(pdlRes.status).json(data);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
