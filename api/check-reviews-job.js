export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ error: 'jobId required' })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY

  try {
    const r = await fetch(`https://api.app.outscraper.com/requests/${jobId}`, {
      headers: { 'X-API-KEY': outscraperKey }
    })
    const data = await r.json()

    if (data?.status !== 'Success') return res.status(200).json({ status: 'pending' })

    const place = Array.isArray(data?.data?.[0]) ? data.data[0][0] : data?.data?.[0]
    if (!place?.reviews_data) return res.status(200).json({ status: 'pending' })

    const reviews = place.reviews_data.map((rv, i) => ({
      author: rv.author_title || 'Guest',
      rating: rv.review_rating || 3,
      platform: 'google',
      review_date: rv.review_datetime_utc?.split(' ')[0] || new Date().toISOString().split('T')[0],
      text: rv.review_text || '(No text)',
      responded: !!(rv.owner_answer),
      response_text: rv.owner_answer || null,
      google_review_id: rv.review_id || `outscraper_${jobId}_${i}`,
    }))

    return res.status(200).json({
      status: 'done',
      reviews,
      count: reviews.length,
      businessInfo: {
        name: place.name,
        address: place.full_address,
        phone: place.phone,
        rating: place.rating,
        totalReviews: place.reviews,
      }
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}