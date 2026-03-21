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

  // Log which keys are available (visible in Vercel Runtime Logs)
  console.log('[google-reviews] OUTSCRAPER_API_KEY present:', !!outscraperKey)
  console.log('[google-reviews] GOOGLE_PLACES_KEY present:', !!googleKey)
  console.log('[google-reviews] placeId:', placeId)

  if (outscraperKey) return fetchOutscraper(placeId, outscraperKey, res)
  if (googleKey)     return fetchGooglePlaces(placeId, googleKey, res)
  return res.status(500).json({ error: 'No API key configured. Add OUTSCRAPER_API_KEY to Vercel environment variables.' })
}

async function fetchOutscraper(placeId, apiKey, res) {
  try {
    console.log('[Outscraper] Starting request for:', placeId)
    const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(placeId)}&reviewsLimit=100&language=en&async=false`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 28000)

    let r
    try {
      r = await fetch(url, {
        headers: { 'X-API-KEY': apiKey },
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    console.log('[Outscraper] Response status:', r.status)

    if (!r.ok) {
      const errText = await r.text()
      console.log('[Outscraper] Error:', errText)
      if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
      return res.status(r.status).json({ error: 'Outscraper error: ' + errText })
    }

    const data = await r.json()
    console.log('[Outscraper] Data keys:', Object.keys(data || {}))
    console.log('[Outscraper] Data status:', data?.status)

    const place = data?.data?.[0]?.[0]
    if (!place) {
      console.log('[Outscraper] No place data found, full response:', JSON.stringify(data).slice(0, 500))
      if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
      return res.status(400).json({ error: 'No data from Outscraper' })
    }

    console.log('[Outscraper] Place found:', place.name, '| Reviews:', place.reviews_data?.length)

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
    console.log('[Outscraper] Exception:', e.message)
    if (process.env.GOOGLE_PLACES_KEY) return fetchGooglePlaces(placeId, process.env.GOOGLE_PLACES_KEY, res)
    return res.status(500).json({ error: e.message })
  }
}

async function fetchGooglePlaces(placeId, apiKey, res) {
  try {
    console.log('[GooglePlaces] Fetching:', placeId)
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
      warning: `Google Places API provides the 5 most recent reviews. ${reviews.length} reviews imported into your dashboard. Add OUTSCRAPER_API_KEY to Vercel for all ${place.user_ratings_total} reviews.`,
    })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
