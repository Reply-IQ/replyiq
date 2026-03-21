export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, subject, html } = req.body
  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing fields' })

  const key = process.env.RESEND_API_KEY
  if (!key) return res.status(200).json({ skipped: true, message: 'Add RESEND_API_KEY to Vercel' })

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        from: 'ReplyIQ <info@replyiq.ch>',
        to: [to],
        subject,
        html,
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: JSON.stringify(data) })
    return res.status(200).json({ success: true, id: data.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
