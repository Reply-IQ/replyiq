export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { placeId, clinicName, propertyType, starLevel, propertyFullName } = req.body
  const googleKey = process.env.GOOGLE_PLACES_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY
  if (!googleKey) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not configured' })

  try {
    // ── Step 1: Get coordinates + details from Place ID ─────────────────────
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,types,price_level,rating&key=${googleKey}`
    const detailRes  = await fetch(detailUrl)
    const detailData = await detailRes.json()

    if (detailData.status !== 'OK') {
      return res.status(400).json({ error: `Google Places: ${detailData.status}` })
    }

    const { lat, lng } = detailData.result.geometry.location
    const ownTypes     = detailData.result.types || []
    const ownPrice     = detailData.result.price_level   // 0-4
    const ownRating    = detailData.result.rating || starLevel || 0

    // ── Step 2: Determine search type based on property type ─────────────────
    // propertyType is passed from frontend ('hotel' or 'restaurant')
    // Also check Google's own types for the place
    const isRestaurant = propertyType === 'restaurant'
      || ownTypes.some(t => ['restaurant','food','cafe','bar','meal_takeaway','bakery'].includes(t))

    const isHotel = !isRestaurant
      || ownTypes.some(t => ['lodging','hotel','motel','hostel'].includes(t))

    // Google Places type to search for
    const searchType = isRestaurant ? 'restaurant' : 'lodging'

    // ── Step 3: Nearby search — 5km radius ───────────────────────────────────
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=${searchType}&key=${googleKey}&language=de`
    const nearbyRes  = await fetch(nearbyUrl)
    const nearbyData = await nearbyRes.json()

    if (!nearbyData.results) {
      return res.status(200).json({ competitors: [], lat, lng })
    }

    // ── Step 4: Filter to same industry segment ──────────────────────────────
    // For hotels: match star level (price_level within ±1)
    // For restaurants: match cuisine type from keyword search + price level
    const clinicNameLower  = (clinicName || '').toLowerCase()
    const fullNameLower    = (propertyFullName || clinicName || '').toLowerCase()

    // Detect cuisine type for restaurants
    const cuisineKeywords = {
      italian:    ['italian','italiano','ristorante','trattoria','pizza','pasta'],
      french:     ['french','français','brasserie','bistro','bistrot'],
      asian:      ['asian','chinese','japanese','sushi','thai','vietnamese','korean'],
      indian:     ['indian','curry','tandoor'],
      swiss:      ['swiss','chalet','fondue','raclette','rösti'],
      american:   ['american','burger','steakhouse','bbq','grill'],
      mediterranean: ['mediterranean','greek','turkish','lebanese','mezze'],
      seafood:    ['seafood','fish','oyster','lobster'],
    }

    let ownCuisine = null
    for (const [cuisine, words] of Object.entries(cuisineKeywords)) {
      if (words.some(w => fullNameLower.includes(w))) {
        ownCuisine = cuisine
        break
      }
    }

    // Rating band: ±0.5 stars from own rating (so 4.1★ hotel sees 3.6★–4.6★ competitors)
    const ratingMin = Math.max(0, ownRating - 0.7)
    const ratingMax = Math.min(5, ownRating + 0.7)

    const filtered = (nearbyData.results || [])
      .filter(p => {
        // Exclude self
        if (p.place_id === placeId) return false
        if (p.name?.toLowerCase() === clinicNameLower) return false

        // Must have a rating
        if (!p.rating) return false

        // Rating band filter (same tier of competitor)
        if (p.rating < ratingMin || p.rating > ratingMax) return false

        // Price level filter for hotels (±1 level)
        if (!isRestaurant && ownPrice !== undefined && ownPrice !== null && p.price_level !== undefined) {
          if (Math.abs((p.price_level || 0) - ownPrice) > 1) return false
        }

        // Cuisine match for restaurants (if we detected a cuisine)
        if (isRestaurant && ownCuisine) {
          const pNameL = (p.name || '').toLowerCase()
          const cuisineWords = cuisineKeywords[ownCuisine]
          // Allow if name matches OR if no cuisine keywords found in name (generic restaurant)
          const hasOtherCuisine = Object.entries(cuisineKeywords)
            .filter(([c]) => c !== ownCuisine)
            .some(([, words]) => words.some(w => pNameL.includes(w)))
          if (hasOtherCuisine) return false
        }

        return true
      })

    // If too few results after filtering, relax rating band and retry
    const relaxed = filtered.length < 3
      ? (nearbyData.results || []).filter(p =>
          p.place_id !== placeId &&
          p.name?.toLowerCase() !== clinicNameLower &&
          p.rating &&
          p.rating >= Math.max(0, ownRating - 1.2) &&
          p.rating <= Math.min(5, ownRating + 1.2)
        )
      : filtered

    const results = (relaxed.length >= 3 ? relaxed : nearbyData.results.filter(p => p.place_id !== placeId))
      .slice(0, 8)
      .map(p => {
        // Calculate real distance
        const dLat = (p.geometry.location.lat - lat) * 111000
        const dLng = (p.geometry.location.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180)
        const distM = Math.round(Math.sqrt(dLat*dLat + dLng*dLng))
        const distLabel = distM < 1000 ? `${distM}m` : `${(distM/1000).toFixed(1)}km`

        return {
          name:      p.name,
          rating:    p.rating || 0,
          reviews:   p.user_ratings_total || 0,
          trend:     '0.0',
          distance:  distLabel,
          place_id:  p.place_id,
          price_level: p.price_level || null,
          types:     (p.types || []).slice(0, 3),
        }
      })
      .sort((a, b) => b.rating - a.rating)

    return res.status(200).json({
      competitors: results,
      lat,
      lng,
      propertyType: isRestaurant ? 'restaurant' : 'hotel',
      ownRating,
      ownCuisine,
      radius: 5000,
    })

  } catch (e) {
    console.error('[competitors] error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
