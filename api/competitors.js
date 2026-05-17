export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { placeId, clinicName, propertyType } = req.body
  const googleKey = process.env.GOOGLE_PLACES_API_KEY
    || process.env.VITE_GOOGLE_PLACES_API_KEY
    || process.env.GOOGLE_PLACES_KEY

  if (!googleKey) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY not set in Vercel environment variables' })
  }

  try {
    // ── Step 1: Get lat/lng from the Place ID ─────────────────────────────────
    const detailRes  = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,rating,types,price_level&key=${googleKey}`
    )
    const detailData = await detailRes.json()

    if (detailData.status !== 'OK') {
      return res.status(400).json({
        error: `Google Places Details API returned: ${detailData.status}. Check your API key and that Places API is enabled.`
      })
    }

    const { lat, lng } = detailData.result.geometry.location
    const ownRating   = detailData.result.rating || 4.0
    const ownTypes    = detailData.result.types || []

    // Determine if hotel or restaurant
    const isRestaurant = propertyType === 'restaurant'
      || ownTypes.some(t => ['restaurant','food','cafe','bar','meal_takeaway','bakery'].includes(t))
    const searchType = isRestaurant ? 'restaurant' : 'lodging'

    // ── Step 2: Nearby search — try with type first ───────────────────────────
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=${searchType}&key=${googleKey}`
    const nearbyRes  = await fetch(nearbyUrl)
    const nearbyData = await nearbyRes.json()

    let pool = []

    if (nearbyData.status === 'OK' && nearbyData.results?.length > 0) {
      pool = nearbyData.results
    } else {
      // Fallback: search without type filter — just get everything nearby
      const fallbackRes  = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&key=${googleKey}`
      )
      const fallbackData = await fallbackRes.json()
      pool = fallbackData.results || []
    }

    // Remove self from pool
    pool = pool.filter(p =>
      p.place_id !== placeId &&
      p.name?.toLowerCase() !== (clinicName || '').toLowerCase()
    )

    if (pool.length === 0) {
      return res.status(200).json({
        competitors: [],
        error: `Google returned no nearby places at (${lat}, ${lng}). This is unexpected — please check your API key has Nearby Search enabled.`
      })
    }

    // ── Step 3: Smart filter — prefer same type + similar rating ─────────────
    // Try strict: same type + within ±1.0 stars
    let filtered = pool.filter(p => {
      if (!p.rating) return false
      const sameType = isRestaurant
        ? p.types?.some(t => ['restaurant','food','cafe','bar','meal_takeaway'].includes(t))
        : p.types?.some(t => ['lodging','hotel'].includes(t))
      if (!sameType) return false
      return p.rating >= ownRating - 1.0 && p.rating <= ownRating + 1.0
    })

    // Relax 1: same type, any rating
    if (filtered.length < 3) {
      filtered = pool.filter(p =>
        p.types?.some(t =>
          isRestaurant
            ? ['restaurant','food','cafe','bar','meal_takeaway'].includes(t)
            : ['lodging','hotel'].includes(t)
        )
      )
    }

    // Relax 2: any business with a rating (nuclear fallback — always returns results)
    if (filtered.length < 3) {
      filtered = pool.filter(p => p.rating)
    }

    // Final fallback: everything nearby regardless
    if (filtered.length === 0) {
      filtered = pool
    }

    // ── Step 4: Build result — top 8 sorted by rating ─────────────────────────
    const results = filtered
      .slice(0, 12) // take more before sorting
      .map(p => {
        const dLat = (p.geometry.location.lat - lat) * 111000
        const dLng = (p.geometry.location.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180)
        const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng))
        return {
          name:     p.name,
          rating:   p.rating   || 0,
          reviews:  p.user_ratings_total || 0,
          place_id: p.place_id,
          address:  distM < 1000 ? `${distM}m away` : `${(distM / 1000).toFixed(1)}km away`,
        }
      })
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8)

    return res.status(200).json({ competitors: results, lat, lng })

  } catch (e) {
    console.error('[competitors]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
