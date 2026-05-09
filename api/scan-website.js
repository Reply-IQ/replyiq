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

  let websiteText = `Website URL: ${url}`
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ReplyIQ/1.0; +https://replyiq.ch)' },
      signal: AbortSignal.timeout(10000)
    })
    const html = await r.text()
    // Extract meaningful text — remove scripts, styles, nav boilerplate
    websiteText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000) // More context for better results
  } catch (e) {
    console.log('[scan] fetch failed:', e.message)
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are an expert hospitality brand analyst. Your job is to deeply analyse a hospitality business website and extract precise brand intelligence to configure an AI that will write review responses on their behalf.

Be specific and concrete — extract actual phrases, terminology and style from the website content, not generic descriptions. If the website mentions specific services, awards, or unique selling points, capture them.`,
        messages: [{
          role: 'user',
          content: `Analyse this hospitality business website deeply to configure an AI review response system.

URL: ${url}
Website content: ${websiteText}

Return ONLY valid JSON with these exact fields:
{
  "businessName": "exact name of the business",
  "industry": "hotel|restaurant|bar|resort|spa|other",
  "category": "luxury|boutique|business|budget|casual|fine-dining|etc",
  "country": "CH|DE|AT|other",
  "city": "city name if found",
  "primaryLanguage": "de|fr|it|en",
  "responseLanguage": "de|fr|it|en (language to respond in — match website language)",
  "brandTone": "luxury|professional|warm|casual|family-friendly|modern",
  "keyStrengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "uniqueSellingPoints": ["USP extracted from website"],
  "services": ["actual services mentioned on website"],
  "complianceRules": "specific rules for review responses in this industry and country — e.g. never promise refunds, always invite direct contact for complaints, DACH consumer protection requirements",
  "responsePersonality": "2-3 precise sentences describing the exact voice and style AI should use, based on the actual brand language found on the website",
  "greetingStyle": "how to open a review response e.g. 'Liebe Gästin, lieber Gast,' or 'Dear Guest,'",
  "signOffStyle": "how to sign off e.g. 'Mit herzlichen Grüssen, Das Team vom Hotel X' or 'Warm regards, The Team at Restaurant Y'",
  "autoResponseConfig": {
    "positiveReview": "specific strategy for 5-star reviews — what to emphasise, what to invite",
    "negativeReview": "specific strategy for 1-2 star reviews — how to de-escalate, what to offer",
    "neutralReview": "strategy for 3-4 star reviews — how to acknowledge and improve",
    "neverInclude": "things to never say in this brand's voice",
    "alwaysInclude": "things to always include based on this brand's values"
  }
}`
        }]
      })
    })

    const d = await r.json()
    const t = d.content?.[0]?.text || ''
    const c = t.replace(/```json\n?|\n?```/g, '').trim()
    const s = c.indexOf('{')
    const e = c.lastIndexOf('}')
    const profile = JSON.parse(c.slice(s, e + 1))
    return res.status(200).json({ success: true, profile })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
