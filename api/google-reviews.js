export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { placeId } = req.body
  if (!placeId) return res.status(400).json({ error: 'placeId required' })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const googleKey = process.env.GOOGLE_PLACES_KEY

  if (outscraperKey) return fetchOutscraper(placeId, outscraperKey, res)
  if (googleKey)     return fetchGooglePlaces(placeId, googleKey, res)
  return res.status(500).json({ error: 'No API key configured' })
}

async function fetchOutscraper(placeId, apiKey, res) {
  try {
    // Use the correct Outscraper reviews endpoint with reviewsLimit=0 means ALL reviews
    const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(placeId)}&reviewsLimit=0&language=en&async=false`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 28000)
    let r
    try {
      r = await fetch(url, { headers: { 'X-API-KEY': apiKey }, signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }

    if (!r.ok) {
      const errText = await r.text()
      console.log('[Outscraper] HTTP error:', r.status, errText)
      if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
      return res.status(r.status).json({ error: errText })
    }

    const data = await r.json()
    console.log('[Outscraper] Status:', data?.status)
    console.log('[Outscraper] data.data type:', Array.isArray(data?.data), typeof data?.data?.[0])

    // Outscraper can return data in two structures:
    // Structure A: data.data[0][0] = place object (when wrapped in array)
    // Structure B: data.data[0] = place object directly
    let place = null
    if (Array.isArray(data?.data?.[0])) {
      place = data.data[0][0]  // Structure A
      console.log('[Outscraper] Using structure A (nested array)')
    } else if (data?.data?.[0] && typeof data.data[0] === 'object') {
      place = data.data[0]     // Structure B
      console.log('[Outscraper] Using structure B (direct object)')
    }

    // Check if place has reviews_data
    console.log('[Outscraper] place keys:', place ? Object.keys(place).slice(0, 10) : 'null')
    console.log('[Outscraper] reviews_data count:', place?.reviews_data?.length)

    if (!place || !place.reviews_data) {
      console.log('[Outscraper] No reviews_data found, falling back to Google Places')
      if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
      return res.status(400).json({ error: 'No reviews data returned from Outscraper' })
    }

    const reviews = place.reviews_data.map((rv, i) => ({
      author:           rv.author_title || 'Anonymous',
      rating:           rv.review_rating || 3,
      review_date:      rv.review_datetime_utc
                          ? rv.review_datetime_utc.split(' ')[0]
                          : new Date().toISOString().split('T')[0],
      text:             rv.review_text || rv.review_translated_text || '(No text provided)',
      platform:         'Google',
      responded:        !!(rv.owner_answer),
      response_text:    rv.owner_answer || null,
      google_review_id: rv.review_id || `outscraper_${placeId}_${i}`,
    }))

    console.log('[Outscraper] Successfully parsed', reviews.length, 'reviews')

    return res.status(200).json({
      name:         place.name || '',
      address:      place.full_address || place.address || '',
      phone:        place.phone || '',
      rating:       place.rating || 0,
      totalReviews: place.reviews || reviews.length,
      reviews,
      source:       'outscraper',
    })
  } catch (e) {
    console.log('[Outscraper] Exception:', e.message)
    if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
    return res.status(500).json({ error: e.message })
  }
}

async function fetchGooglePlaces(placeId, apiKey, res) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews,formatted_address,formatted_phone_number&key=${apiKey}&language=en&reviews_sort=newest`
    const r = await fetch(url)
    const data = await r.json()
    if (data.status !== 'OK') return res.status(400).json({ error: `Google: ${data.status}`, message: data.error_message })
    const place = data.result
    const reviews = (place.reviews || []).map((rv, i) => ({
      author:           rv.author_name,
      rating:           rv.rating,
      review_date:      new Date(rv.time * 1000).toISOString().split('T')[0],
      text:             rv.text || '(No text provided)',
      platform:         'Google',
      responded:        false,
      google_review_id: `google_${placeId}_${rv.time}_${i}`,
    }))
    return res.status(200).json({
      name: place.name, address: place.formatted_address,
      phone: place.formatted_phone_number || '',
      rating: place.rating, totalReviews: place.user_ratings_total,
      reviews, source: 'google_places',
      warning: `Google Places API only returns 5 reviews. ${reviews.length} imported. Add Outscraper for all ${place.user_ratings_total} reviews.`,
    })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
