export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { placeId, clinicName, propertyType, starLevel, city, brandTone, industry } = req.body
  const googleKey = process.env.GOOGLE_PLACES_API_KEY
    || process.env.VITE_GOOGLE_PLACES_API_KEY
    || process.env.GOOGLE_PLACES_KEY

  if (!googleKey) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY not set in Vercel environment variables' })
  }

  try {
    // ── Search mode: find a specific competitor by name ───────────────────────
    if (req.body.searchQuery) {
      const { searchQuery, placeId: refPlaceId } = req.body

      // Get lat/lng of the property first for distance calculation
      let refLat = 0, refLng = 0
      if (refPlaceId) {
        const dr = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(refPlaceId)}&fields=geometry&key=${googleKey}`)
        const dd = await dr.json()
        if (dd.status === 'OK') {
          refLat = dd.result.geometry.location.lat
          refLng = dd.result.geometry.location.lng
        }
      }

      // Text search for the query
      const tsUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleKey}${refLat ? `&location=${refLat},${refLng}&radius=50000` : ''}`
      const tsRes  = await fetch(tsUrl)
      const tsData = await tsRes.json()

      if (tsData.status !== 'OK' && tsData.status !== 'ZERO_RESULTS') {
        return res.status(400).json({ error: `Google Text Search: ${tsData.status}` })
      }

      const results = (tsData.results || []).slice(0, 8).map(p => {
        const dLat = refLat ? (p.geometry.location.lat - refLat) * 111000 : 0
        const dLng = refLng ? (p.geometry.location.lng - refLng) * 111000 * Math.cos(refLat * Math.PI / 180) : 0
        const distM = refLat ? Math.round(Math.sqrt(dLat*dLat + dLng*dLng)) : null
        return {
          name:     p.name,
          rating:   p.rating || 0,
          reviews:  p.user_ratings_total || 0,
          place_id: p.place_id,
          address:  distM !== null ? (distM < 1000 ? `${distM}m away` : `${(distM/1000).toFixed(1)}km away`) : (p.formatted_address || ''),
        }
      })

      return res.status(200).json({ competitors: results })
    }

    // ── Step 1: Get lat/lng + details from Place ID ───────────────────────────
    const detailRes  = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,name,rating,types,price_level,vicinity&key=${googleKey}`
    )
    const detailData = await detailRes.json()

    if (detailData.status !== 'OK') {
      return res.status(400).json({
        error: `Google Places Details API: ${detailData.status}. Ensure Places API is enabled in your Google Cloud project.`
      })
    }

    const { lat, lng } = detailData.result.geometry.location
    const ownGoogleRating = detailData.result.rating || starLevel || 4.0
    const ownPriceLevel   = detailData.result.price_level ?? null  // 0=free, 1=cheap, 2=moderate, 3=expensive, 4=very expensive
    const ownTypes        = detailData.result.types || []
    const vicinity        = detailData.result.vicinity || city || ''

    // Extract city from vicinity (e.g. "Zürich" from "Hardstrasse 12, Zürich")
    const cityName = city || vicinity.split(',').pop()?.trim() || ''

    // ── Step 2: Determine tier keyword ───────────────────────────────────────
    const isRestaurant = propertyType === 'restaurant'
      || ownTypes.some(t => ['restaurant','food','cafe','bar','meal_takeaway','bakery'].includes(t))

    // Map brandTone + Google rating to a tier keyword for Text Search
    // This is the key improvement — we search like a guest would
    function getTierKeyword(tone, rating) {
      const t = (tone || '').toLowerCase()
      if (t.includes('luxury') || t.includes('premium') || rating >= 4.5) return 'luxury'
      if (t.includes('boutique') || t.includes('design'))                  return 'boutique'
      if (t.includes('casual') || t.includes('budget') || rating < 3.5)   return 'budget'
      if (rating >= 4.0)                                                    return 'upscale'
      return ''
    }

    const tier = getTierKeyword(brandTone, ownGoogleRating)
    const cat  = isRestaurant ? 'restaurant' : 'hotel'

    // Build 2 search queries — one specific, one broader fallback
    // e.g. "luxury hotel Zürich" or "upscale hotel Zurich city center"
    const queries = []
    if (tier && cityName) {
      queries.push(`${tier} ${cat} ${cityName}`)
    }
    if (cityName) {
      queries.push(`${cat} ${cityName}`)
    }
    // Always add a nearby fallback so we never return zero
    queries.push(`${cat} near ${lat},${lng}`)

    // ── Step 3: Run searches and collect unique results ────────────────────────
    let pool = []
    const seenIds = new Set([placeId]) // exclude self

    for (const query of queries) {
      if (pool.length >= 20) break

      // Text Search API
      const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=5000&key=${googleKey}`
      const textRes  = await fetch(textUrl)
      const textData = await textRes.json()

      if (textData.status === 'OK' && textData.results?.length > 0) {
        for (const p of textData.results) {
          if (!seenIds.has(p.place_id) && p.name?.toLowerCase() !== (clinicName||'').toLowerCase()) {
            seenIds.add(p.place_id)
            pool.push(p)
          }
        }
      }

      // Also run Nearby Search for the first query to get genuinely close properties
      if (queries.indexOf(query) === 0) {
        const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=${isRestaurant?'restaurant':'lodging'}&key=${googleKey}`
        const nearbyRes  = await fetch(nearbyUrl)
        const nearbyData = await nearbyRes.json()
        if (nearbyData.status === 'OK' && nearbyData.results?.length > 0) {
          for (const p of nearbyData.results) {
            if (!seenIds.has(p.place_id) && p.name?.toLowerCase() !== (clinicName||'').toLowerCase()) {
              seenIds.add(p.place_id)
              pool.push(p)
            }
          }
        }
      }
    }

    if (pool.length === 0) {
      return res.status(200).json({
        competitors: [],
        message: 'No results from Google. Check your API key has Text Search and Nearby Search enabled.'
      })
    }

    // ── Step 4: Filter + score by relevance ───────────────────────────────────
    // HARD filter: hotels only see hotels, restaurants only see restaurants
    const typeFiltered = pool.filter(p => {
      if (!p.types || p.types.length === 0) return false
      if (isRestaurant) {
        return p.types.some(t => ['restaurant','food','cafe','bar','meal_takeaway','bakery','meal_delivery'].includes(t))
          && !p.types.includes('lodging')
      } else {
        // Hotel: must have lodging type
        return p.types.some(t => ['lodging','hotel','motel','resort'].includes(t))
      }
    })

    // TIER filter: match price_level within +/-1 so luxury hotels don't see budget hostels
    // Only apply if we have price_level for our own property
    let tierFiltered = typeFiltered
    if (ownPriceLevel !== null && typeFiltered.length > 5) {
      const sameTier = typeFiltered.filter(p =>
        p.price_level === undefined || p.price_level === null ||
        Math.abs((p.price_level ?? ownPriceLevel) - ownPriceLevel) <= 1
      )
      // Only use tier filter if it leaves at least 3 results
      if (sameTier.length >= 3) tierFiltered = sameTier
    }

    // RATING filter: within 1.5 stars of our rating so we see real competition
    const ratingFiltered = tierFiltered.filter(p =>
      Math.abs((p.rating || 0) - ownGoogleRating) <= 1.5
    )

    // Fallback chain: rating filter → tier filter → type filter → full pool
    const filteredPool = (ratingFiltered.length >= 3 ? ratingFiltered
      : tierFiltered.length >= 3 ? tierFiltered
      : typeFiltered.length >= 3 ? typeFiltered
      : pool).filter(p => p.rating && p.rating > 0)

    const scored = filteredPool
      .filter(p => p.rating && p.rating > 0) // must have a rating
      .map(p => {
        const dLat = ((p.geometry?.location?.lat || lat) - lat) * 111000
        const dLng = ((p.geometry?.location?.lng || lng) - lng) * 111000 * Math.cos(lat * Math.PI / 180)
        const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng))

        const sameType = isRestaurant
          ? p.types?.some(t => ['restaurant','food','cafe','bar','meal_takeaway','bakery','lodging'].includes(t) === false &&
              ['restaurant','food','cafe','bar','meal_takeaway','bakery'].includes(t))
          : p.types?.some(t => ['lodging','hotel','motel','resort'].includes(t))

        const ratingDiff = Math.abs((p.rating || 0) - ownGoogleRating)

        // Scoring: closer = better, similar rating = better, same type = better
        const distScore   = Math.max(0, 100 - (distM / 50))   // lose 1pt per 50m
        const ratingScore = Math.max(0, 50  - (ratingDiff * 20))
        const typeScore   = sameType ? 30 : 0
        const reviewScore = Math.min(20, Math.log10(p.user_ratings_total || 1) * 5)

        return {
          ...p,
          _distM:    distM,
          _score:    distScore + ratingScore + typeScore + reviewScore,
          _sameType: sameType,
        }
      })
      .sort((a, b) => {
        // Primary: same type first, secondary: score
        if (a._sameType && !b._sameType) return -1
        if (!a._sameType && b._sameType) return 1
        return b._score - a._score
      })

    // Take top 8 — already scored by relevance
    const results = scored.slice(0, 8).map(p => ({
      name:        p.name,
      rating:      p.rating || 0,
      reviews:     p.user_ratings_total || 0,
      place_id:    p.place_id,
      price_level: p.price_level ?? null,
      address:     p._distM < 1000
        ? `${p._distM}m away`
        : `${(p._distM / 1000).toFixed(1)}km away`,
    }))

    // Also return our own property's Google data for reference
    const ownData = {
      rating:      ownGoogleRating,
      price_level: ownPriceLevel,
    }

    return res.status(200).json({
      competitors: results,
      lat,
      lng,
      tier,
      cityName,
      queries,
      ownGoogleRating,
      ownData,
    })

  } catch (e) {
    console.error('[competitors]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
