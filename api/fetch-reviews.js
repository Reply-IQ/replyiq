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
    // Start Outscraper async job — returns instantly with a jobId
    const r = await fetch(
      `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(identifier)}&reviewsLimit=1500&language=en&async=true&reviewsSort=newest`,
      { headers: { 'X-API-KEY': outscraperKey } }
    )
    const data = await r.json()
    const jobId = data?.id

    if (!jobId) {
      return res.status(500).json({ error: 'Outscraper did not return a job ID. Check your API key and Place ID.', detail: data })
    }

    // Save jobId to Supabase so we can resume if browser closes
    if (supabaseUrl && serviceKey) {
      await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pending_review_job: JSON.stringify({ jobId, platformId: platform, identifier, clinicId })
        })
      })
    }

    return res.status(200).json({ jobId, status: 'pending' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
