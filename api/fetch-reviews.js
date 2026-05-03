export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, identifier } = req.body
  if (!platform || !identifier) return res.status(400).json({ error: 'platform and identifier required' })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const googleKey     = process.env.GOOGLE_PLACES_KEY

  try {
    if (platform === 'google') {
      if (outscraperKey) {
        // Outscraper — ALL reviews
        const r = await fetch(`https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(identifier)}&reviewsLimit=0&language=en&async=false`, {
          headers: { 'X-API-KEY': outscraperKey }, signal: AbortSignal.timeout(28000)
        })
        const data = await r.json()
        const place = Array.isArray(data?.data?.[0]) ? data.data[0][0] : data?.data?.[0]
        if (!place?.reviews_data) {
          if (googleKey) return googlePlacesFallback(identifier, googleKey, res)
          return res.status(400).json({ error: 'No reviews data from Outscraper' })
        }
        const reviews = place.reviews_data.map((rv, i) => ({
          author: rv.author_title||'Guest', rating: rv.review_rating||3, platform: 'google',
          review_date: rv.review_datetime_utc?.split(' ')[0] || new Date().toISOString().split('T')[0],
          text: rv.review_text||'(No text)', responded: !!(rv.owner_answer), response_text: rv.owner_answer||null,
          google_review_id: rv.review_id||`outscraper_${identifier}_${i}`,
        }))
        return res.status(200).json({ platform:'google', count:reviews.length, reviews, businessInfo:{ name:place.name, address:place.full_address, phone:place.phone, rating:place.rating, totalReviews:place.reviews } })
      }
      if (googleKey) return googlePlacesFallback(identifier, googleKey, res)
      return res.status(500).json({ error: 'No API key configured. Add OUTSCRAPER_API_KEY or GOOGLE_PLACES_KEY to Vercel.' })
    }

    // TripAdvisor, Booking, etc via Outscraper
    if (outscraperKey) {
      const endpointMap = { tripadvisor:'tripadvisor/reviews', booking:'booking/reviews', facebook:'facebook/reviews', trustpilot:'trustpilot/reviews' }
      const endpoint = endpointMap[platform]
      if (!endpoint) return res.status(400).json({ error: `Unsupported platform: ${platform}` })

      const r = await fetch(`https://api.app.outscraper.com/${endpoint}?query=${encodeURIComponent(identifier)}&reviewsLimit=0&async=false`, {
        headers: { 'X-API-KEY': outscraperKey }, signal: AbortSignal.timeout(28000)
      })
      const data = await r.json()
      const place = data?.data?.[0]
      if (!place) return res.status(400).json({ error: `No data from Outscraper for ${platform}` })

      const reviews = (place.reviews || []).map((rv, i) => ({
        author: rv.username||rv.author_title||rv.name||'Guest',
        rating: rv.rating||rv.review_rating||rv.stars||3,
        platform,
        review_date: (rv.publishedDate||rv.date||rv.review_datetime_utc||'').split('T')[0] || new Date().toISOString().split('T')[0],
        text: rv.text||rv.review_text||rv.positive||'(No text)',
        responded: !!(rv.ownerResponse||rv.owner_answer||rv.hotel_response),
        response_text: rv.ownerResponse||rv.owner_answer||rv.hotel_response||null,
        google_review_id: `${platform}_${identifier}_${i}`,
      }))
      return res.status(200).json({ platform, count:reviews.length, reviews, businessInfo:{ name:place.name, rating:place.rating||place.totalScore } })
    }

    return res.status(500).json({ error: 'OUTSCRAPER_API_KEY required for ' + platform })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}

async function googlePlacesFallback(placeId, apiKey, res) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews,formatted_address,formatted_phone_number,geometry&key=${apiKey}&language=en&reviews_sort=newest`
  const r = await fetch(url)
  const data = await r.json()
  if (data.status !== 'OK') return res.status(400).json({ error: `Google: ${data.status}`, message: data.error_message })
  const place = data.result
  const reviews = (place.reviews||[]).map((rv,i)=>({ author:rv.author_name, rating:rv.rating, platform:'google', review_date:new Date(rv.time*1000).toISOString().split('T')[0], text:rv.text||'(No text)', responded:false, google_review_id:`google_${placeId}_${rv.time}_${i}` }))
  return res.status(200).json({ platform:'google', count:reviews.length, reviews, businessInfo:{ name:place.name, address:place.formatted_address, phone:place.formatted_phone_number, rating:place.rating, totalReviews:place.user_ratings_total, lat:place.geometry?.location?.lat, lng:place.geometry?.location?.lng } })
}
