export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { placeId } = req.body
  if (!placeId) return res.status(400).json({ error: 'placeId required' })
  const key = process.env.GOOGLE_PLACES_KEY
  if (!key) return res.status(500).json({ error: 'GOOGLE_PLACES_KEY not set in Vercel environment variables' })
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews,formatted_address,formatted_phone_number&key=${key}&language=en&reviews_sort=newest`
    const r = await fetch(url)
    const data = await r.json()
    if (data.status !== 'OK') return res.status(400).json({ error: `Google: ${data.status}`, message: data.error_message })
    const place = data.result
    const reviews = (place.reviews || []).map((rv, i) => ({
      author: rv.author_name,
      rating: rv.rating,
      review_date: new Date(rv.time * 1000).toISOString().split('T')[0],
      text: rv.text || '(No text provided)',
      platform: 'Google',
      responded: false,
      google_review_id: `${placeId}_${rv.time}_${i}`,
    }))
    return res.status(200).json({
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || '',
      rating: place.rating,
      totalReviews: place.user_ratings_total,
      reviews,
    })
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
