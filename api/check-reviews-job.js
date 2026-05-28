export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { jobId, clinicId, platform, identifier } = req.body
  if (!jobId || !clinicId) return res.status(400).json({ error: 'jobId and clinicId required' })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const supabaseUrl   = process.env.VITE_SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_KEY

  try {
    // ── Poll Outscraper for job status ────────────────────────────────────────
    const r    = await fetch(`https://api.app.outscraper.com/requests/${jobId}`, {
      headers: { 'X-API-KEY': outscraperKey }
    })
    const data = await r.json()

    console.log('[crj] jobId:', jobId, '| status:', data?.status, '| platform:', platform || 'google')

    if (data?.status !== 'Success') {
      return res.status(200).json({ status: 'pending', jobStatus: data?.status })
    }

    // ── Parse Outscraper response based on platform ────────────────────────────
    const isGoogle = !platform || platform === 'google'
    const raw      = data?.data
    let reviewsData = []

    if (isGoogle) {
      // Google: [[{ name, rating, reviews_data: [...] }]]
      const first = Array.isArray(raw) && raw.length > 0 ? raw[0] : raw
      const place  = Array.isArray(first) ? first[0] : first
      console.log('[crj] place name:', place?.name, '| total reviews:', place?.reviews)
      reviewsData = place?.reviews_data || place?.reviewsData || place?.data || []
    } else {
      // TripAdvisor/Booking: flat array of review objects
      const first = Array.isArray(raw) && raw.length > 0 ? raw[0] : raw
      reviewsData = Array.isArray(first) ? first : (Array.isArray(raw) ? raw : [])
      reviewsData = reviewsData.filter(r => r.review_text || r.review_rating || r.author_title)
      console.log('[crj] non-Google flat reviews:', reviewsData.length)
    }

    if (!reviewsData?.length) {
      await clearJob()
      return res.status(200).json({
        status:  'done',
        count:   0,
        warning: isGoogle
          ? 'No reviews returned. Check your Google Place ID.'
          : `No reviews returned from ${platform}. Check the URL is correct.`,
      })
    }

    // ── Map to our review schema ──────────────────────────────────────────────
    const reviews = reviewsData.map(rv => {
      const author   = rv.author_title  || rv.name      || rv.reviewer_name || 'Guest'
      const rating   = Math.round(Number(rv.review_rating || rv.rating || rv.stars || 3)) || 3
      const text     = rv.review_text   || rv.text      || rv.review_body   || ''
      const dateRaw  = rv.review_datetime_utc || rv.review_date || rv.publishedAtDate || rv.date || ''
      const date     = dateRaw.toString().split('T')[0].split(' ')[0] || new Date().toISOString().split('T')[0]
      const responded= !!(rv.owner_response || rv.owner_answer || rv.responseFromOwnerText)
      const response = rv.owner_response || rv.owner_answer || rv.responseFromOwnerText || null
      // Stable unique ID — review_link is best for TripAdvisor, review_id for Google
      const uid      = rv.review_id || rv.reviewId || rv.review_link ||
        `${platform||'google'}_${author.replace(/\s/g,'_')}_${date}`
      // Store review_link so we can link directly to the review later
      const reviewLink = rv.review_link || rv.reviewUrl || null

      return {
        clinic_id:        clinicId,
        author,
        rating,
        platform:         platform || 'google',
        review_date:      date,
        text,
        responded,
        response_text:    response,
        google_review_id: uid,
        review_link:      reviewLink,
      }
    })

    console.log('[crj] mapped', reviews.length, 'reviews — saving to Supabase...')

    // ── Upsert in batches of 100 ──────────────────────────────────────────────
    let savedCount = 0
    const upserted = []
    for (let i = 0; i < reviews.length; i += 100) {
      const batch  = reviews.slice(i, i + 100)
      const result = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
        method: 'POST',
        headers: {
          'apikey':        serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type':  'application/json',
          'Prefer':        'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify(batch),
      })
      const inserted = await result.json()
      if (Array.isArray(inserted)) {
        savedCount += inserted.length
        upserted.push(...inserted)
      } else {
        savedCount += batch.length
      }
    }

    console.log('[crj] saved', savedCount, 'reviews')

    // ── Update platform_connections ───────────────────────────────────────────
    const connRes  = await fetch(
      `${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}&select=platform_connections`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    )
    const connData   = await connRes.json()
    const existing   = (Array.isArray(connData) ? connData[0] : connData)?.platform_connections || {}
    const platKey    = platform || 'google'
    const googleInfo = isGoogle ? (data?.data?.[0]?.[0] || data?.data?.[0] || {}) : {}

    await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
      method: 'PATCH',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        platform_connections: {
          ...existing,
          [platKey]: {
            ...existing[platKey],
            identifier:   identifier || existing[platKey]?.identifier,
            reviewCount:  reviews.length,
            importing:    false,
            lastSyncedAt: new Date().toISOString(),
            connectedAt:  existing[platKey]?.connectedAt || new Date().toISOString(),
            ...(isGoogle ? {
              businessInfo: {
                name:         googleInfo.name         || existing[platKey]?.businessInfo?.name,
                address:      googleInfo.address      || existing[platKey]?.businessInfo?.address,
                phone:        googleInfo.phone         || existing[platKey]?.businessInfo?.phone,
                rating:       googleInfo.rating        || existing[platKey]?.businessInfo?.rating,
                totalReviews: googleInfo.reviews       || existing[platKey]?.businessInfo?.totalReviews,
              }
            } : {})
          }
        },
        pending_review_job: null,
        last_synced_at:     new Date().toISOString(),
      })
    })

    return res.status(200).json({ status: 'done', count: reviews.length, saved: savedCount })

  } catch (e) {
    console.error('[crj] exception:', e.message)
    return res.status(500).json({ error: e.message })
  }

  async function clearJob() {
    if (!supabaseUrl || !serviceKey) return
    await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
      method: 'PATCH',
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending_review_job: null, last_synced_at: new Date().toISOString() })
    })
  }
}
