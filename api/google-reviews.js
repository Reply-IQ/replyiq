export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { placeId } = req.body
  if (!placeId) return res.status(400).json({ error: 'placeId required' })

  if (process.env.OUTSCRAPER_API_KEY) return fetchOutscraper(placeId, process.env.OUTSCRAPER_API_KEY, res)
  if (process.env.GOOGLE_PLACES_KEY)  return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
  return res.status(500).json({ error: 'No API key configured' })
}

async function fetchOutscraper(placeId, apiKey, res) {
  try {
    // Use reviewsLimit=100 to get up to 100 reviews per request
    // Keep async=false but increase Vercel function timeout via config
    const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(placeId)}&reviewsLimit=100&language=en&async=false&fields=name,full_address,phone,rating,reviews,reviews_data`
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000) // 25 second timeout
    
    let r
    try {
      r = await fetch(url, {
        headers: { 'X-API-KEY': apiKey },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!r.ok) {
      const errText = await r.text()
      // Fall back to Google Places if Outscraper fails
      if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
      return res.status(r.status).json({ error: 'Outscraper error: ' + errText })
    }

    const data = await r.json()
    const place = data?.data?.[0]?.[0]

    if (!place) {
      // Fall back to Google Places
      if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
      return res.status(400).json({ error: 'No data returned from Outscraper. Trying Google Places fallback.' })
    }

    const reviews = (place.reviews_data || []).map((rv, i) => ({
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
    // If timeout or any error, fall back to Google Places
    if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
    return res.status(500).json({ error: e.message })
  }
}

async function fetchGooglePlaces(placeId, apiKey, res) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews,formatted_address,formatted_phone_number&key=${apiKey}&language=en&reviews_sort=newest`
    const r = await fetch(url)
    const data = await r.json()
    if (data.status !== 'OK') return res.status(400).json({
      error: `Google: ${data.status}`,
      message: data.error_message || 'Check your Place ID'
    })
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
    })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
