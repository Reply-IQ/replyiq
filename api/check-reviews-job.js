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
    const r    = await fetch(`https://api.app.outscraper.com/requests/${jobId}`, {
      headers: { 'X-API-KEY': outscraperKey }
    })
    const data = await r.json()

    // ── Full diagnostic logging ──────────────────────────────────────────────
    console.log('[crj] jobId:', jobId, '| status:', data?.status)
    if (data?.data) {
      const raw   = data.data
      const first = Array.isArray(raw) ? raw[0] : raw
      const place = Array.isArray(first) ? first[0] : first
      console.log('[crj] data length:', Array.isArray(raw) ? raw.length : 'not array')
      console.log('[crj] place keys:', Object.keys(place || {}).join(', '))
      console.log('[crj] place name:', place?.name)
      console.log('[crj] reviews_data:', place?.reviews_data?.length ?? 'missing')
      console.log('[crj] rating:', place?.rating, '| total reviews:', place?.reviews)
    }

    // Still running
    if (data?.status !== 'Success') {
      return res.status(200).json({ status: 'pending', jobStatus: data?.status })
    }

    // ── Parse Outscraper response ────────────────────────────────────────────
    let placeInfo   = null
    const raw       = data?.data

    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0]
      placeInfo   = Array.isArray(first) ? first[0] : first
    } else if (raw && typeof raw === 'object') {
      placeInfo = raw
    }

    // Try every possible field name Outscraper might use
    const reviewsData =
      placeInfo?.reviews_data    ||
      placeInfo?.reviews         ||
      placeInfo?.reviewsData     ||
      placeInfo?.data            ||
      []

    console.log('[crj] final reviewsData count:', reviewsData?.length)

    // Clear pending job regardless of result
    const clearJob = async () => {
      if (!supabaseUrl || !serviceKey) return
      // Get existing connections to preserve them while clearing importing flag
      try {
        const connRes = await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}&select=platform_connections`, {
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        })
        const connData = await connRes.json()
        const existing = (Array.isArray(connData) ? connData[0] : connData)?.platform_connections || {}
        const pid = platform || 'google'
        await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
          method: 'PATCH',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pending_review_job: null,
            last_synced_at: new Date().toISOString(),
            platform_connections: {
              ...existing,
              [pid]: { ...existing[pid], importing: false }  // ← clears spinner
            }
          })
        })
      } catch {
        // fallback: just clear the job
        await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
          method: 'PATCH',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ pending_review_job: null, last_synced_at: new Date().toISOString() })
        })
      }
    }

    if (!reviewsData?.length) {
      console.log('[crj] 0 reviews — place found:', placeInfo?.name, '| total on Google:', placeInfo?.reviews)
      await clearJob()
      return res.status(200).json({
        status:     'done',
        count:      0,
        placeFound: placeInfo?.name || null,
        totalOnGoogle: placeInfo?.reviews || 0,
        warning:    placeInfo?.name
          ? `Found "${placeInfo.name}" but 0 reviews returned. Place has ${placeInfo?.reviews || '?'} reviews on Google.`
          : 'Place not found. Double-check your Google Place ID.',
      })
    }

    // ── Build review rows ────────────────────────────────────────────────────
    const reviews = reviewsData.map((rv, i) => ({
      clinic_id:        clinicId,
      author:           rv.author_title   || rv.name                  || 'Guest',
      rating:           Math.round(rv.review_rating  || rv.stars || 3),
      platform:         platform          || 'google',
      review_date:      (rv.review_datetime_utc || rv.publishedAtDate || '').split(' ')[0] || new Date().toISOString().split('T')[0],
      text:             rv.review_text    || rv.text                  || '(No text)',
      responded:        !!(rv.owner_answer || rv.responseFromOwnerText),
      response_text:    rv.owner_answer   || rv.responseFromOwnerText || null,
      google_review_id: rv.review_id      || rv.reviewId              || `out_${(rv.author_title||rv.name||'').replace(/\s/g,'_')}_${(rv.review_datetime_utc||rv.publishedAtDate||'').slice(0,10)}`,
    }))

    console.log('[crj] built', reviews.length, 'review rows')

    // ── Save to Supabase in batches of 100 ───────────────────────────────────
    let saved = 0
    if (supabaseUrl && serviceKey) {
      for (let i = 0; i < reviews.length; i += 100) {
        const batch  = reviews.slice(i, i + 100)
        const result = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
          method:  'POST',
          headers: {
            'apikey':        serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type':  'application/json',
            'Prefer':        'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(batch)
        })
        const batchNum = Math.floor(i/100) + 1
        console.log('[crj] batch', batchNum, 'HTTP status:', result.status)
        const inserted = await result.json()
        if (!result.ok) {
          console.error('[crj] batch', batchNum, 'INSERT ERROR:', JSON.stringify(inserted))
          // Try without upsert preference as fallback
          const fallback = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
            method:  'POST',
            headers: {
              'apikey':        serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type':  'application/json',
              'Prefer':        'return=representation',
            },
            body: JSON.stringify(batch)
          })
          const fallbackData = await fallback.json()
          console.log('[crj] batch', batchNum, 'fallback status:', fallback.status)
          if (!fallback.ok) {
            console.error('[crj] batch', batchNum, 'FALLBACK ERROR:', JSON.stringify(fallbackData))
          } else {
            const count = Array.isArray(fallbackData) ? fallbackData.length : batch.length
            saved += count
            console.log('[crj] batch', batchNum, '— fallback saved', count)
          }
        } else {
          const count = Array.isArray(inserted) ? inserted.length : batch.length
          saved += count
          console.log('[crj] batch', batchNum, '— saved', count)
        }
      }

      // Update platform_connections with real data
      const connRes  = await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}&select=platform_connections`, {
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
      })
      const connData = await connRes.json()
      const existing = (Array.isArray(connData) ? connData[0] : connData)?.platform_connections || {}
      const pid      = platform || 'google'

      await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
        method:  'PATCH',
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_connections: {
            ...existing,
            [pid]: {
              ...existing[pid],
              identifier:   identifier || existing[pid]?.identifier,
              reviewCount:  reviews.length,
              importing:    false,   // ← critical: clears spinner on dashboard
              lastSyncedAt: new Date().toISOString(),
              connectedAt:  existing[pid]?.connectedAt || new Date().toISOString(),
              businessInfo: {
                name:         placeInfo?.name,
                address:      placeInfo?.full_address,
                phone:        placeInfo?.phone,
                rating:       placeInfo?.rating,
                totalReviews: placeInfo?.reviews,
              }
            }
          },
          pending_review_job: null,
          last_synced_at:     new Date().toISOString(),
        })
      })

      console.log('[crj] ✓ Done — saved', saved, 'reviews for clinic', clinicId)
    }

    return res.status(200).json({ status: 'done', count: reviews.length, saved })

  } catch (e) {
    console.error('[crj] exception:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
