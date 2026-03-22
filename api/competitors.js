export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { placeId, clinicName, lat, lng } = req.body
  const googleKey = process.env.GOOGLE_PLACES_KEY
  if (!googleKey) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not configured' })

  try {
    let latitude = lat
    let longitude = lng

    // If no coordinates provided, get them from the Place ID
    if (!latitude || !longitude) {
      if (!placeId) return res.status(400).json({ error: 'placeId or lat/lng required' })
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name&key=${googleKey}`
      const detailRes = await fetch(detailUrl)
      const detailData = await detailRes.json()
      if (detailData.status !== 'OK') {
        return res.status(400).json({ error: `Google: ${detailData.status} — ${detailData.error_message || 'Could not get clinic location'}` })
      }
      latitude  = detailData.result.geometry.location.lat
      longitude = detailData.result.geometry.location.lng
    }

    // Search nearby dentists within 2km
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=2000&type=dentist&key=${googleKey}&language=en`
    const nearbyRes = await fetch(nearbyUrl)
    const nearbyData = await nearbyRes.json()

    if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
      return res.status(400).json({ error: `Google nearby: ${nearbyData.status}` })
    }

    const competitors = (nearbyData.results || [])
      .filter(p => p.name !== clinicName && p.place_id !== placeId)
      .slice(0, 6)
      .map(p => {
        const dLat = (p.geometry.location.lat - latitude) * 111000
        const dLng = (p.geometry.location.lng - longitude) * 111000 * Math.cos(latitude * Math.PI / 180)
        const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng))
        const distStr = distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}km`
        return {
          name:     p.name,
          rating:   p.rating || 0,
          reviews:  p.user_ratings_total || 0,
          trend:    '0.0',
          distance: distStr,
          place_id: p.place_id,
        }
      })
      .sort((a, b) => b.rating - a.rating)

    return res.status(200).json({ competitors, lat: latitude, lng: longitude })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
