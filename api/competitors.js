export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { placeId, clinicName } = req.body
  const googleKey = process.env.GOOGLE_PLACES_KEY
  if (!googleKey) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not configured' })

  try {
    // Get coordinates from Place ID
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name&key=${googleKey}`
    const detailRes = await fetch(detailUrl)
    const detailData = await detailRes.json()
    if (detailData.status !== 'OK') return res.status(400).json({ error: `Google: ${detailData.status}` })
    const { lat, lng } = detailData.result.geometry.location

    // Search nearby hotels/restaurants
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=lodging|restaurant&key=${googleKey}&language=en`
    const nearbyRes = await fetch(nearbyUrl)
    const nearbyData = await nearbyRes.json()

    const competitors = (nearbyData.results || [])
      .filter(p => p.name !== clinicName && p.place_id !== placeId)
      .slice(0, 6)
      .map(p => {
        const dLat = (p.geometry.location.lat - lat) * 111000
        const dLng = (p.geometry.location.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180)
        const distM = Math.round(Math.sqrt(dLat*dLat + dLng*dLng))
        return { name:p.name, rating:p.rating||0, reviews:p.user_ratings_total||0, trend:'0.0', distance:distM<1000?`${distM}m`:`${(distM/1000).toFixed(1)}km`, place_id:p.place_id }
      })
      .sort((a,b) => b.rating - a.rating)

    return res.status(200).json({ competitors, lat, lng })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
