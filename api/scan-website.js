export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })
  const key = process.env.ANTHROPIC_KEY
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_KEY not configured' })

  let websiteText = `Website: ${url}`
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReplyIQ/1.0)' }, signal: AbortSignal.timeout(8000) })
    const html = await r.text()
    websiteText = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,4000)
  } catch (e) { console.log('[scan] fetch failed:', e.message) }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        messages: [{ role: 'user', content: `Analyse this hospitality business website to configure an AI review response system.
URL: ${url}
Content: ${websiteText}
Return ONLY valid JSON: { "businessName":"name", "industry":"hotel|restaurant|bar|resort|other", "country":"CH|DE|AT|other", "primaryLanguage":"de|fr|it|en", "responseLanguage":"de|fr|it|en", "brandTone":"professional|warm|luxury|casual", "services":["service 1","service 2"], "complianceRules":"key compliance rules for review responses in this industry", "responsePersonality":"2 sentences on how AI should sound", "autoResponseConfig":{ "greeting":"how to start", "alwaysInclude":"what to always say", "neverInclude":"what to never say", "negativeReview":"strategy for negative", "positiveReview":"strategy for positive", "signOff":"how to sign off" } }` }]
      })
    })
    const d = await r.json()
    const t = d.content?.[0]?.text || ''
    const c = t.replace(/```json\n?|\n?```/g,'').trim()
    const s = c.indexOf('{'), e = c.lastIndexOf('}')
    const profile = JSON.parse(c.slice(s, e+1))
    return res.status(200).json({ success: true, profile })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
