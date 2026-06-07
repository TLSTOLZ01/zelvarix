// ── Contact Form API ──────────────────────────────────────────────────────────
// Receives contact form submissions and sends via Resend email service
// Add RESEND_API_KEY to Vercel environment variables
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const { name, email, company, subject, message } = req.body || {};
  if (!name || !email || !message) return res.status(400).json({ error: 'Missing required fields' });
 
  const resendKey = process.env.RESEND_API_KEY;
 
  // If Resend not configured yet, just log and return success
  if (!resendKey) {
    console.log('Contact form submission:', { name, email, company, subject, message });
    return res.status(200).json({ success: true, note: 'Logged only — configure RESEND_API_KEY to send emails' });
  }
 
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'Zelvarix Contact <noreply@zelvarix.ai>',
        to: ['support@zelvarix.ai'],
        reply_to: email,
        subject: `[Contact] ${subject || 'New message'} — ${name} at ${company || 'Unknown'}`,
        html: `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company || '—'}</p>
          <p><strong>Subject:</strong> ${subject || '—'}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });
    const data = await emailRes.json();
    if (!emailRes.ok) throw new Error(data.message || 'Email send failed');
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact email error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
