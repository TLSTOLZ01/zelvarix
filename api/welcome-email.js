export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    console.log('Welcome email (no RESEND_API_KEY configured):', email);
    return res.status(200).json({ success: true });
  }

  const firstName = (name || 'there').split(' ')[0];

  const htmlBody = [
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1814">',
    '<div style="background:#1a1814;padding:28px 32px;border-radius:8px 8px 0 0">',
    '<span style="font-family:Georgia,serif;font-size:24px;color:#faf8f4">Zelvarix</span>',
    '</div>',
    '<div style="padding:32px;background:#fff;border:1px solid #e8e3d9;border-top:none;border-radius:0 0 8px 8px">',
    '<h1 style="font-family:Georgia,serif;font-size:26px;color:#1a1814;margin:0 0 16px">Welcome, ' + firstName + '!</h1>',
    '<p style="font-size:15px;line-height:1.7;color:#3d3a35">Your 7-day free trial is active. No credit card needed — full access to every feature.</p>',
    '<p style="font-size:15px;line-height:1.7;color:#3d3a35">Here is how to get started:</p>',
    '<table style="width:100%;border-collapse:collapse;margin:20px 0">',
    '<tr><td style="padding:10px 0;border-bottom:1px solid #e8e3d9;font-size:14px;color:#1a1814">',
    '<strong>1. Search for contacts</strong><br>',
    '<span style="color:#7a7570">Use the Discover tab to filter by industry, seniority, location and more.</span>',
    '</td></tr>',
    '<tr><td style="padding:10px 0;border-bottom:1px solid #e8e3d9;font-size:14px;color:#1a1814">',
    '<strong>2. Try the AI Intelligence panel</strong><br>',
    '<span style="color:#7a7570">Click the AI button on any contact for ice breakers, lead scoring, and a ready-to-send email draft.</span>',
    '</td></tr>',
    '<tr><td style="padding:10px 0;font-size:14px;color:#1a1814">',
    '<strong>3. Build your pipeline</strong><br>',
    '<span style="color:#7a7570">Star contacts to add them to your Pipeline, then drag them through stages as you progress.</span>',
    '</td></tr>',
    '</table>',
    '<div style="text-align:center;margin:28px 0">',
    '<a href="https://www.zelvarix.ai" style="display:inline-block;background:#1a5c3a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:5px">Open Zelvarix</a>',
    '</div>',
    '<p style="font-size:13px;line-height:1.7;color:#7a7570">Questions? Reply to this email or use the chat widget in the app.</p>',
    '<p style="font-size:13px;color:#7a7570;margin-top:24px">The Zelvarix team</p>',
    '</div>',
    '<div style="text-align:center;padding:16px;font-size:11px;color:#b0aaa2">',
    '2026 Zelvarix.ai',
    '</div>',
    '</div>'
  ].join('');

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + resendKey
      },
      body: JSON.stringify({
        from: 'Zelvarix <hello@zelvarix.ai>',
        to: [email],
        subject: 'Welcome to Zelvarix',
        html: htmlBody
      })
    });
    const data = await emailRes.json();
    if (!emailRes.ok) {
      console.error('Resend error:', data);
      return res.status(200).json({ success: false, error: data.message || 'Send failed' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Welcome email error:', err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
}
