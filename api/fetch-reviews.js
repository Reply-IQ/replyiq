export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, identifier } = req.body
  if (!platform || !identifier) return res.status(400).json({ error: 'platform and identifier required' })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  if (!outscraperKey) return res.status(500).json({ error: 'OUTSCRAPER_API_KEY not configured' })

  try {
    const r = await fetch(
      `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(identifier)}&reviewsLimit=0&language=en&async=true&reviewsSort=newest`,
      { headers: { 'X-API-KEY': outscraperKey } }
    )
    const data = await r.json()
    const jobId = data?.id
    if (!jobId) return res.status(500).json({ error: 'Outscraper did not return a job ID', detail: data })
    return res.status(200).json({ jobId, status: 'pending' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}