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

    console.log('[check-reviews-job] status:', data?.status, 'jobId:', jobId)

    if (data?.status !== 'Success') {
      return res.status(200).json({ status: 'pending', jobStatus: data?.status })
    }

    // Try every possible data structure Outscraper might return
    let reviewsData = null
    let placeInfo = null

    const raw = data?.data
    if (Array.isArray(raw)) {
      // Structure: [[{...}]] or [{...}]
      const first = raw[0]
      if (Array.isArray(first)) {
        placeInfo = first[0]
      } else {
        placeInfo = first
      }
    }

    console.log('[check-reviews-job] placeInfo keys:', Object.keys(placeInfo || {}))

    // reviews_data is the standard Outscraper field
    reviewsData = placeInfo?.reviews_data || placeInfo?.reviews || []

    console.log('[check-reviews-job] reviews found:', reviewsData?.length)

    if (!reviewsData?.length) {
      // Job done but no reviews — return done with 0 so frontend doesn't keep polling
      return res.status(200).json({
        status: 'done',
        reviews: [],
        count: 0,
        businessInfo: {
          name: placeInfo?.name,
          address: placeInfo?.full_address,
          rating: placeInfo?.rating,
          totalReviews: placeInfo?.reviews,
        },
        warning: 'Outscraper returned 0 reviews. Check Place ID or Outscraper credit balance.'
      })
    }

    const reviews = reviewsData.map((rv, i) => ({
      author: rv.author_title || rv.name || 'Guest',
      rating: rv.review_rating || rv.stars || 3,
      platform: 'google',
      review_date: (rv.review_datetime_utc || rv.publishedAtDate || '').split(' ')[0] || new Date().toISOString().split('T')[0],
      text: rv.review_text || rv.text || '(No text)',
      responded: !!(rv.owner_answer || rv.responseFromOwnerText),
      response_text: rv.owner_answer || rv.responseFromOwnerText || null,
      google_review_id: rv.review_id || rv.reviewId || `outscraper_${jobId}_${i}`,
    }))

    return res.status(200).json({
      status: 'done',
      reviews,
      count: reviews.length,
      businessInfo: {
        name: placeInfo?.name,
        address: placeInfo?.full_address,
        phone: placeInfo?.phone,
        rating: placeInfo?.rating,
        totalReviews: placeInfo?.reviews,
      }
    })
  } catch (e) {
    console.error('[check-reviews-job] error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}