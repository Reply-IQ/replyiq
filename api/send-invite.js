// /api/send-invite.js
// Call this manually (or from a simple admin page) to send a welcome email
// with login credentials to an approved user.
// POST { to, name, password, hotelName }
// Protected by ADMIN_SECRET env var

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const secret = process.env.ADMIN_SECRET
  if (secret && req.headers['x-admin-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorised' })
  }

  const { to, name, password, hotelName } = req.body
  if (!to || !name || !password) return res.status(400).json({ error: 'Missing fields' })

  const key = process.env.RESEND_API_KEY
  if (!key) return res.status(500).json({ error: 'RESEND_API_KEY not set' })

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F0F0F5">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">

  <!-- Logo -->
  <div style="text-align:center;margin-bottom:36px">
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:-1px">
      Reply<span style="color:#C9A96E">IQ</span>
    </div>
    <div style="font-size:10px;letter-spacing:3px;color:rgba(255,255,255,0.25);text-transform:uppercase;margin-top:6px">Reputation Intelligence</div>
    <div style="display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:3px 10px;background:rgba(255,0,0,0.05);border:1px solid rgba(255,0,0,0.12);border-radius:20px">
      <svg width="11" height="11" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px"><rect width="20" height="20" fill="#FF0000"/><rect x="3" y="7" width="14" height="6" fill="white"/><rect x="7" y="3" width="6" height="14" fill="white"/></svg>
      <span style="font-size:9px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;text-transform:uppercase;font-weight:600">Swiss</span>
    </div>
  </div>

  <!-- Card -->
  <div style="background:#1C2430;border:1px solid #2A3545;border-radius:16px;padding:36px;margin-bottom:20px">
    <div style="font-size:22px;font-weight:700;color:#fff;font-family:Georgia,serif;margin-bottom:8px">
      Welcome, ${name} 👋
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.45);line-height:1.7;margin-bottom:28px">
      Your Early Access account for ${hotelName || 'your property'} is ready. Here are your login credentials — please keep them safe.
    </div>

    <!-- Credentials -->
    <div style="background:#0A0A0F;border:1px solid #2A3545;border-radius:12px;padding:20px;margin-bottom:28px">
      <div style="margin-bottom:14px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.25);margin-bottom:6px">Login URL</div>
        <a href="https://app.replyiq.ch" style="color:#C9A96E;font-size:14px;font-weight:600;text-decoration:none">app.replyiq.ch</a>
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.25);margin-bottom:6px">Email</div>
        <div style="color:#F0F0F5;font-size:14px;font-family:monospace">${to}</div>
      </div>
      <div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.25);margin-bottom:6px">Password</div>
        <div style="color:#C9A96E;font-size:16px;font-family:monospace;font-weight:700;letter-spacing:2px">${password}</div>
      </div>
    </div>

    <!-- CTA -->
    <a href="https://app.replyiq.ch" style="display:block;text-align:center;padding:16px;background:linear-gradient(135deg,#F5C842,#D4860E);border-radius:10px;color:#141920;font-size:15px;font-weight:700;text-decoration:none;font-family:Georgia,serif">
      Sign In and Get Started →
    </a>
  </div>

  <!-- What to expect -->
  <div style="background:#1C2430;border:1px solid #2A3545;border-radius:12px;padding:24px;margin-bottom:20px">
    <div style="font-size:12px;font-weight:700;color:#C9A96E;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px">What happens next</div>
    ${['Enter your hotel name and website — we scan it and build your AI brand voice automatically.',
       'Connect your Google Place ID — we import your last 500 reviews in under 2 minutes.',
       'Open the Inbox and generate your first AI response. It will know your guest\'s name, language, and brand tone.'
      ].map((step, i) => `
    <div style="display:flex;gap:14px;margin-bottom:12px">
      <div style="width:22px;height:22px;border-radius:50%;background:#C9A96E;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#141920;flex-shrink:0">${i+1}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.55);line-height:1.6;padding-top:2px">${step}</div>
    </div>`).join('')}
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:20px;font-size:11px;color:rgba(255,255,255,0.18);line-height:1.8">
    <div>Questions? Reply to this email or write to <a href="mailto:info@replyiq.ch" style="color:#C9A96E;text-decoration:none">info@replyiq.ch</a></div>
    <div style="margin-top:6px">
      <svg width="10" height="10" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;display:inline-block;vertical-align:middle;margin-right:4px"><rect width="20" height="20" fill="#FF0000"/><rect x="3" y="7" width="14" height="6" fill="white"/><rect x="7" y="3" width="6" height="14" fill="white"/></svg>
      ReplyIQ · Zürich, Switzerland · Swiss data privacy
    </div>
  </div>

</div>
</body>
</html>`

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        from: 'Alex at ReplyIQ <info@replyiq.ch>',
        to: [to],
        subject: `Welcome to ReplyIQ — your login credentials`,
        html,
        reply_to: 'alexriese410@gmail.com',
      })
    })
    const d = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: d })
    return res.status(200).json({ success: true, id: d.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
