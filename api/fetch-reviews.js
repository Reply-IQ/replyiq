export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, identifier, clinicId } = req.body
  if (!platform || !identifier || !clinicId) {
    return res.status(400).json({ error: 'platform, identifier and clinicId required' })
  }

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const supabaseUrl   = process.env.VITE_SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!outscraperKey) return res.status(500).json({ error: 'OUTSCRAPER_API_KEY not configured' })

  try {
    // Format query: Place IDs need Google Maps URL format for reliable Outscraper results
    const query = (identifier.startsWith('ChIJ') || identifier.startsWith('Ei'))
      ? `https://www.google.com/maps/place/?q=place_id:${identifier}`
      : identifier

    console.log('[fetch-reviews] Starting import — identifier:', identifier, '| clinicId:', clinicId)
    console.log('[fetch-reviews] Formatted query:', query)

    const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(query)}&reviewsLimit=1000&language=en&async=true&reviewsSort=newest`
    const r   = await fetch(url, { headers: { 'X-API-KEY': outscraperKey } })

    console.log('[fetch-reviews] Outscraper HTTP status:', r.status)
    const rawText = await r.text()
    console.log('[fetch-reviews] Outscraper response:', rawText.slice(0, 500))

    let data
    try { data = JSON.parse(rawText) } catch { data = { raw: rawText } }

    const jobId = data?.id
    if (!jobId) {
      console.error('[fetch-reviews] No jobId:', JSON.stringify(data))
      return res.status(500).json({
        error:  'Outscraper did not start the job.',
        reason: data?.message || data?.error || 'Check credits at app.outscraper.com/billing',
        httpStatus: r.status,
      })
    }

    console.log('[fetch-reviews] Job started:', jobId)
    // Frontend saves pending_review_job and platform_connections using authenticated session
    return res.status(200).json({ jobId, status: 'pending' })

  } catch (e) {
    console.error('[fetch-reviews] Exception:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
