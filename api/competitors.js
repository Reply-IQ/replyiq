// api/competitors.js
// Fetches real nearby dental clinics from Google Places API
// Called when clinic connects their Google Business Profile

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { lat, lng, excludeName } = req.body
  if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' })

  const googleKey = process.env.GOOGLE_PLACES_KEY
  if (!googleKey) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not configured' })

  try {
    // Search for nearby dental clinics within 2km
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=dentist&key=${googleKey}&language=en`
    const r = await fetch(url)
    const data = await r.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return res.status(400).json({ error: `Google: ${data.status}`, message: data.error_message })
    }

    // Filter out the clinic itself and format competitors
    const competitors = (data.results || [])
      .filter(p => p.name !== excludeName)
      .slice(0, 6) // max 6 competitors
      .map(p => {
        // Calculate distance (approximate)
        const dLat = (p.geometry.location.lat - lat) * 111000
        const dLng = (p.geometry.location.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180)
        const distMeters = Math.round(Math.sqrt(dLat * dLat + dLng * dLng))
        const distStr = distMeters < 1000 ? `${distMeters}m` : `${(distMeters / 1000).toFixed(1)}km`

        return {
          name: p.name,
          rating: p.rating || 0,
          reviews: p.user_ratings_total || 0,
          trend: '0.0', // Google doesn't provide trend data
          distance: distStr,
          place_id: p.place_id,
        }
      })
      .sort((a, b) => b.rating - a.rating) // sort by rating desc

    return res.status(200).json({ competitors })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
