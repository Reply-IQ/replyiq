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
      `${supabaseUrl}/rest/v1/clinics?select=id,name,owner_email,platform_connections,last_synced_at`,
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

        const url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(query)}&reviewsLimit=20&language=en&async=false&reviewsSort=newest`
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
          google_review_id: rv.review_id     || `sync_${clinic.id}_${(rv.author_title||'').replace(/\s/g,'_')}_${(rv.review_datetime_utc||'').slice(0,10)}`,
        }))

        let upserted = []
        const upsertRes = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
          method:  'POST',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body:    JSON.stringify(reviews)
        })
        upserted = await upsertRes.json()
        if (!Array.isArray(upserted)) upserted = []
        const newCount = upserted.length

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

        // Send email notification if there are new reviews and clinic has an email
        if (newCount > 0 && clinic.owner_email) {
          const newReviews = upserted.slice(0, 3) // show up to 3 in email
          const negCount   = newReviews.filter(r => r.rating <= 2).length
          const subject    = negCount > 0
            ? `⚠ ${newCount} new review${newCount>1?'s':''} — ${negCount} need${negCount===1?'s':''} attention · ${clinic.name}`
            : `${newCount} new review${newCount>1?'s':''} imported · ${clinic.name}`

          const previewRows = newReviews.map(r =>
            '<div style="padding:12px;background:#1C2430;border-radius:8px;margin-bottom:8px;border-left:3px solid ' +
            (r.rating<=2?'#B85C38':r.rating>=4?'#4A7C6F':'#C9A96E') + '">' +
            '<div style="font-size:11px;color:#6B7280;margin-bottom:4px">' + '★'.repeat(r.rating||3) + '  ' + (r.author||'Guest') + '</div>' +
            '<div style="font-size:12px;color:#A0A0B8;line-height:1.5">' + (r.text||'(No text)').slice(0,120) + (r.text?.length>120?'…':'') + '</div></div>'
          ).join('')

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
            body: JSON.stringify({
              from: 'ReplyIQ <info@replyiq.ch>',
              to: [clinic.owner_email],
              subject,
              html: '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,sans-serif;color:#E8E4DC">' +
                '<div style="max-width:520px;margin:0 auto;padding:28px 20px">' +
                '<div style="font-family:Georgia,serif;font-size:22px;color:#fff;margin-bottom:4px">Reply<span style="color:#C9A96E">IQ</span></div>' +
                '<div style="font-size:10px;color:#6B7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px">New Reviews Detected</div>' +
                '<div style="background:#1C2430;border-radius:12px;padding:20px;margin-bottom:16px;border:1px solid #2A3545">' +
                '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px">' + newCount + ' new review' + (newCount>1?'s':'') + ' for ' + clinic.name + '</div>' +
                '<div style="font-size:12px;color:#6B7280;margin-bottom:16px">Imported overnight · ' + new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long'}) + '</div>' +
                previewRows +
                '</div>' +
                '<a href="https://app.replyiq.ch/inbox" style="display:block;padding:14px;background:linear-gradient(135deg,#F5C842,#D4860E);border-radius:10px;color:#141920;font-size:14px;font-weight:700;text-decoration:none;text-align:center;margin-bottom:16px">Open Inbox and Reply →</a>' +
                '<div style="font-size:10px;color:#2A3545;text-align:center">ReplyIQ · app.replyiq.ch</div>' +
                '</div></body></html>'
            })
          }).catch(e => console.log('[sync-all] email notify failed:', e.message))
        }

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
