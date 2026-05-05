export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { jobId, clinicId, platform, identifier } = req.body
  if (!jobId || !clinicId) return res.status(400).json({ error: 'jobId and clinicId required' })

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const supabaseUrl   = process.env.VITE_SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  try {
    // Check Outscraper job status
    const r = await fetch(`https://api.app.outscraper.com/requests/${jobId}`, {
      headers: { 'X-API-KEY': outscraperKey }
    })
    const data = await r.json()

    // Still running
    if (data?.status !== 'Success') {
      return res.status(200).json({ status: 'pending', jobStatus: data?.status || 'processing' })
    }

    // Parse Outscraper response — handle both array structures
    let placeInfo = null
    const raw = data?.data
    if (Array.isArray(raw)) {
      const first = raw[0]
      placeInfo = Array.isArray(first) ? first[0] : first
    }

    const reviewsData = placeInfo?.reviews_data || []

    if (!reviewsData.length) {
      // Done but empty — clear pending job and return
      if (supabaseUrl && serviceKey) {
        await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
          method: 'PATCH',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ pending_review_job: null })
        })
      }
      return res.status(200).json({ status: 'done', count: 0, warning: 'No reviews found. Double-check your Google Place ID.' })
    }

    // Build review rows
    const reviews = reviewsData.map((rv, i) => ({
      clinic_id: clinicId,
      author: rv.author_title || 'Guest',
      rating: rv.review_rating || 3,
      platform: platform || 'google',
      review_date: rv.review_datetime_utc?.split(' ')[0] || new Date().toISOString().split('T')[0],
      text: rv.review_text || '(No text)',
      responded: !!(rv.owner_answer),
      response_text: rv.owner_answer || null,
      google_review_id: rv.review_id || `outscraper_${jobId}_${i}`,
    }))

    // Save reviews to Supabase in batches of 100
    let saved = 0
    if (supabaseUrl && serviceKey) {
      for (let i = 0; i < reviews.length; i += 100) {
        const batch = reviews.slice(i, i + 100)
        const upsertRes = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(batch)
        })
        const upserted = await upsertRes.json()
        if (Array.isArray(upserted)) saved += upserted.length
        else saved += batch.length // Assume success if not array
      }

      // Update platform_connections with new count and clear pending job
      const connRes = await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}&select=platform_connections`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
      })
      const [clinic] = await connRes.json()
      const existingConns = clinic?.platform_connections || {}
      const newConns = {
        ...existingConns,
        [platform || 'google']: {
          ...existingConns[platform || 'google'],
          identifier: identifier || existingConns[platform || 'google']?.identifier,
          reviewCount: reviews.length,
          lastSyncedAt: new Date().toISOString(),
          businessInfo: {
            name: placeInfo?.name,
            address: placeInfo?.full_address,
            phone: placeInfo?.phone,
            rating: placeInfo?.rating,
            totalReviews: placeInfo?.reviews,
          }
        }
      }

      await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform_connections: newConns,
          pending_review_job: null,
          last_synced_at: new Date().toISOString(),
        })
      })
    }

    return res.status(200).json({
      status: 'done',
      count: reviews.length,
      saved,
    })

  } catch (e) {
    console.error('[check-reviews-job] error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
