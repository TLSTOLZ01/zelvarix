export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.PDL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'PDL_API_KEY not configured' });

  try {
    const payload = {
      query: {
        bool: {
          must: [
            { exists: { field: "job_title" } }
          ]
        }
      },
      size: 5,
      from: 0,
      pretty: false,
      required: "job_title AND full_name"
    };

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
    console.log('PDL response:', text.slice(0, 800));

    const data = JSON.parse(text);
    return res.status(pdlRes.status).json(data);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
