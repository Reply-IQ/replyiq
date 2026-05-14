// /api/widget.js — public endpoint for the embeddable review widget
// Returns property rating data by property ID
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate') // cache 1hr on CDN

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const propertyId   = req.query.id
  if (!propertyId)   return res.status(400).json({ error: 'id required' })

  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server config error' })

  try {
    // Fetch property
    const propRes = await fetch(
      `${supabaseUrl}/rest/v1/clinics?id=eq.${encodeURIComponent(propertyId)}&select=name,platform_connections`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    )
    const props = await propRes.json()
    const prop  = Array.isArray(props) ? props[0] : props

    if (!prop) return res.status(404).json({ error: 'Property not found' })

    const google = prop.platform_connections?.google
    if (!google) return res.status(404).json({ error: 'Google not connected' })

    return res.status(200).json({
      name:         prop.name,
      rating:       google.businessInfo?.rating || 0,
      totalReviews: google.businessInfo?.totalReviews || google.reviewCount || 0,
      platform:     'google',
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
