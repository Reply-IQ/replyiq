// Daily cron job — runs at 3am UTC via Vercel cron
// Fetches new reviews for all connected clinics since last sync
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl   = process.env.VITE_SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_KEY
  const outscraperKey = process.env.OUTSCRAPER_API_KEY

  if (!supabaseUrl || !serviceKey || !outscraperKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  console.log('[sync-all] Starting daily sync...')

  try {
    const clinicsRes = await fetch(
      `${supabaseUrl}/rest/v1/clinics?select=id,name,platform_connections,last_synced_at`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    )
    const clinics = await clinicsRes.json()
    console.log('[sync-all] Found', clinics.length, 'clinics')

    const results = []

    for (const clinic of clinics) {
      const conns  = clinic.platform_connections || {}
      const google = conns.google
      if (!google?.identifier) { console.log('[sync-all] Skipping', clinic.name, '— no Google'); continue }

      console.log('[sync-all] Syncing', clinic.name)

      try {
        const identifier = google.identifier
        const query = (identifier.startsWith('ChIJ') || identifier.startsWith('Ei'))
          ? `https://www.google.com/maps/place/?q=place_id:${identifier}`
          : identifier

        const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(query)}&reviewsLimit=100&language=en&async=false&reviewsSort=newest`
        const r   = await fetch(url, { headers: { 'X-API-KEY': outscraperKey }, signal: AbortSignal.timeout(25000) })
        const data = await r.json()

        let placeInfo = null
        const raw = data?.data
        if (Array.isArray(raw) && raw.length > 0) {
          const first = raw[0]
          placeInfo = Array.isArray(first) ? first[0] : first
        }

        const reviewsData = placeInfo?.reviews_data || []
        console.log('[sync-all]', clinic.name, '— fetched', reviewsData.length, 'reviews')

        if (!reviewsData.length) { results.push({ clinic: clinic.name, synced: 0 }); continue }

        const reviews = reviewsData.map((rv, i) => ({
          clinic_id:        clinic.id,
          author:           rv.author_title  || 'Guest',
          rating:           rv.review_rating || 3,
          platform:         'google',
          review_date:      (rv.review_datetime_utc || '').split(' ')[0] || new Date().toISOString().split('T')[0],
          text:             rv.review_text   || '(No text)',
          responded:        !!(rv.owner_answer),
          response_text:    rv.owner_answer  || null,
          google_review_id: rv.review_id     || `sync_${clinic.id}_${i}`,
        }))

        const upsertRes = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
          method:  'POST',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body:    JSON.stringify(reviews)
        })
        const upserted = await upsertRes.json()
        const newCount = Array.isArray(upserted) ? upserted.length : 0

        await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinic.id}`, {
          method:  'PATCH',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            last_synced_at:      new Date().toISOString(),
            platform_connections: {
              ...conns,
              google: { ...google, reviewCount: (google.reviewCount||0)+newCount, lastSyncedAt: new Date().toISOString(), businessInfo: { ...google.businessInfo, rating: placeInfo?.rating, totalReviews: placeInfo?.reviews } }
            }
          })
        })

        console.log('[sync-all]', clinic.name, '— saved', newCount, 'new reviews')
        results.push({ clinic: clinic.name, fetched: reviewsData.length, newReviews: newCount })

      } catch (e) {
        console.error('[sync-all] Error for', clinic.name, ':', e.message)
        results.push({ clinic: clinic.name, error: e.message })
      }

      await new Promise(r => setTimeout(r, 1000))
    }

    console.log('[sync-all] Complete:', JSON.stringify(results))
    return res.status(200).json({ success: true, results })

  } catch (e) {
    console.error('[sync-all] Fatal:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
