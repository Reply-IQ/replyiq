export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { jobId, clinicId, platform, identifier } = req.body
  if (!jobId || !clinicId) return res.status(400).json({ error: 'jobId and clinicId required' })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const supabaseUrl   = process.env.VITE_SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  try {
    const r    = await fetch(`https://api.app.outscraper.com/requests/${jobId}`, {
      headers: { 'X-API-KEY': outscraperKey }
    })
    const data = await r.json()

    // ── Full diagnostic logging ──────────────────────────────────────────────
    console.log('[crj] jobId:', jobId, '| status:', data?.status)
    if (data?.data) {
      const raw   = data.data
      const first = Array.isArray(raw) ? raw[0] : raw
      const place = Array.isArray(first) ? first[0] : first
      console.log('[crj] data length:', Array.isArray(raw) ? raw.length : 'not array')
      console.log('[crj] place keys:', Object.keys(place || {}).join(', '))
      console.log('[crj] place name:', place?.name)
      console.log('[crj] reviews_data:', place?.reviews_data?.length ?? 'missing')
      console.log('[crj] rating:', place?.rating, '| total reviews:', place?.reviews)
    }

    // Still running
    if (data?.status !== 'Success') {
      return res.status(200).json({ status: 'pending', jobStatus: data?.status })
    }
  } catch (e) {
    console.error('[crj] exception:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
