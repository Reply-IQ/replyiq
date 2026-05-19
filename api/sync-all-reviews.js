import Anthropic from '@anthropic-ai/sdk'
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

        // Send professional email notification when new reviews arrive
        if (newCount > 0 && clinic.owner_email) {
          const toShow   = upserted.slice(0, 3)
          const negCount = toShow.filter(r => r.rating <= 2).length
          const posCount = toShow.filter(r => r.rating >= 4).length
          const dateStr  = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })

          const subject = negCount > 0
            ? `⚠ ${newCount} new review${newCount>1?'s':''} — ${negCount} need${negCount===1?'s':''} urgent attention · ${clinic.name}`
            : `${newCount} new review${newCount>1?'s':''} — ${posCount > 0 ? posCount+' positive' : 'ready to reply'} · ${clinic.name}`

          // Build review preview cards
          const reviewCards = toShow.map(r => {
            const stars  = parseInt(r.rating) || 3
            const color  = stars <= 2 ? '#B85C38' : stars >= 4 ? '#4A7C6F' : '#C9A96E'
            const starStr= '★'.repeat(stars) + '☆'.repeat(5 - stars)
            const urgent = stars <= 2
            return (
              '<div style="margin-bottom:10px;border-radius:10px;overflow:hidden;border:1px solid ' + (urgent ? 'rgba(184,92,56,0.3)' : '#2A3545') + '">' +
              '<div style="padding:10px 14px;background:' + (urgent ? 'rgba(184,92,56,0.08)' : '#1C2430') + ';display:flex;justify-content:space-between;align-items:center">' +
              '<div>' +
              '<span style="color:' + color + ';font-size:13px;font-weight:700;letter-spacing:0.5px">' + starStr + '</span>' +
              '<span style="color:#6B7280;font-size:11px;margin-left:8px">' + (r.author || 'Guest') + '</span>' +
              '</div>' +
              (urgent ? '<span style="background:rgba(184,92,56,0.15);color:#B85C38;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;letter-spacing:1px">URGENT</span>' : '') +
              '</div>' +
              '<div style="padding:12px 14px;background:#13131A">' +
              '<div style="font-size:13px;color:#A0A0B8;line-height:1.65;font-style:italic">' +
              (r.text && r.text !== '(No text)' ? '"' + r.text.slice(0, 160) + (r.text.length > 160 ? '…"' : '"') : '<span style="color:#404060">(No text — star rating only)</span>') +
              '</div>' +
              '</div>' +
              '</div>'
            )
          }).join('')

          // Score bar — response rate context
          const responded  = toShow.filter(r => r.responded).length
          const totalInDB  = parseInt(clinic._reviewCount) || newCount
          const swissFlag  = '<svg width="11" height="11" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;display:inline-block;vertical-align:middle;margin-right:4px"><rect width="20" height="20" fill="#FF0000"/><rect x="3" y="7" width="14" height="6" fill="white"/><rect x="7" y="3" width="6" height="14" fill="white"/></svg>'

          const html =
            '<!DOCTYPE html><html>' +
            '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
            '<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#E8E4DC">' +
            '<div style="max-width:560px;margin:0 auto;padding:32px 20px">' +

            // Header
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">' +
            '<div>' +
            '<div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.5px">Reply<span style="color:#C9A96E">IQ</span></div>' +
            '<div style="font-size:9px;color:rgba(255,255,255,0.25);letter-spacing:2.5px;text-transform:uppercase;margin-top:3px">Reputation Intelligence</div>' +
            '</div>' +
            '<div style="text-align:right">' +
            '<div style="font-size:12px;color:#C9A96E;font-weight:600">' + clinic.name + '</div>' +
            '<div style="font-size:10px;color:#6B7280;margin-top:2px">' + dateStr + '</div>' +
            '</div>' +
            '</div>' +

            // Alert banner
            '<div style="background:' + (negCount > 0 ? 'rgba(184,92,56,0.08)' : 'rgba(74,124,111,0.06)') + ';border:1px solid ' + (negCount > 0 ? 'rgba(184,92,56,0.25)' : 'rgba(74,124,111,0.2)') + ';border-left:4px solid ' + (negCount > 0 ? '#B85C38' : '#4A7C6F') + ';border-radius:10px;padding:16px 20px;margin-bottom:20px">' +
            '<div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#fff;margin-bottom:6px">' +
            (negCount > 0
              ? '⚠ ' + negCount + ' review' + (negCount > 1 ? 's need' : ' needs') + ' urgent attention'
              : newCount + ' new review' + (newCount > 1 ? 's' : '') + ' arrived overnight') +
            '</div>' +
            '<div style="font-size:13px;color:#A0A0B8;line-height:1.6">' +
            (negCount > 0
              ? 'Unanswered negative reviews hurt your Google ranking and deter future guests. Respond within 24 hours to show prospective guests you care.'
              : 'Your guests took time to share their experience. A personal reply builds loyalty and improves your visibility on Google and TripAdvisor.') +
            '</div>' +
            '</div>' +

            // Review cards
            '<div style="margin-bottom:20px">' +
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#6B7280;font-weight:600;margin-bottom:12px">' +
            (toShow.length < newCount ? 'Preview — ' + toShow.length + ' of ' + newCount + ' new reviews' : newCount + ' new review' + (newCount > 1 ? 's' : '')) +
            '</div>' +
            reviewCards +
            (newCount > toShow.length
              ? '<div style="text-align:center;font-size:12px;color:#6B7280;padding:8px 0">+ ' + (newCount - toShow.length) + ' more in your inbox</div>'
              : '') +
            '</div>' +

            // CTA button
            '<a href="https://app.replyiq.ch/inbox" style="display:block;padding:16px;background:linear-gradient(135deg,#F5C842,#D4860E);border-radius:12px;color:#141920;font-size:15px;font-weight:700;text-decoration:none;text-align:center;margin-bottom:20px;letter-spacing:0.3px">' +
            (negCount > 0 ? '⚡ Respond Now — Protect Your Rating →' : 'Open Inbox and Reply →') +
            '</a>' +

            // Why respond tip
            '<div style="background:#1C2430;border-radius:10px;padding:14px 18px;margin-bottom:20px;border:1px solid #2A3545">' +
            '<div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#C9A96E;font-weight:600;margin-bottom:8px">Why responding matters</div>' +
            '<div style="font-size:12px;color:#6B7280;line-height:1.8">' +
            '📈 Properties that respond to every review rank <strong style="color:#A0A0B8">higher on Google</strong><br>' +
            '⭐ Responding to 1-star reviews <strong style="color:#A0A0B8">increases trust</strong> with future guests<br>' +
            '💬 Guests who feel heard are <strong style="color:#A0A0B8">2× more likely to return</strong>' +
            '</div>' +
            '</div>' +

            // Footer
            '<div style="text-align:center;padding-top:16px;border-top:1px solid #1C2430;font-size:10px;color:#2A3545;line-height:1.8">' +
            swissFlag + ' ReplyIQ &nbsp;·&nbsp; <a href="https://app.replyiq.ch" style="color:#C9A96E;text-decoration:none">app.replyiq.ch</a> &nbsp;·&nbsp; Zürich, Switzerland<br>' +
            'You receive this because you are a ReplyIQ client. <a href="mailto:info@replyiq.ch" style="color:#404060;text-decoration:none">Unsubscribe</a>' +
            '</div>' +

            '</div></body></html>'

          await fetch('https://api.resend.com/emails', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
            body: JSON.stringify({
              from:    'ReplyIQ Alerts <info@replyiq.ch>',
              to:      [clinic.owner_email],
              subject,
              html,
            })
          }).catch(e => console.log('[sync-all] notify email failed:', e.message))
        }

        // Auto-classify new negative reviews (1-2★) so Flagged tab works immediately
        const newNegatives = upserted.filter(r => parseInt(r.rating) <= 2 && !r.ai_analysed_at)
        if (newNegatives.length > 0 && process.env.ANTHROPIC_API_KEY) {
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
          for (const rev of newNegatives.slice(0, 5)) { // max 5 per sync to control cost
            try {
              const msg = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001', // cheapest model for classification
                max_tokens: 200,
                messages: [{ role: 'user', content:
                  'Classify this hotel/restaurant review. Return JSON only:\n' +
                  '{"sentiment":"negative","severity":"low|medium|high|critical","categories":["cleanliness|staff|food|location|price|noise|maintenance|other"],"ai_risk_flag":true|false,"ai_summary":"one sentence"}\n\n' +
                  'ai_risk_flag=true only if review contains: threats, legal language, health/safety concerns, or severe public reputation damage.\n\n' +
                  'Review ('+rev.rating+'★): "' + (rev.text||'').slice(0,300) + '"'
                }]
              })
              const raw = (msg.content?.[0]?.text || '').trim()
              const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}')+1))
              await fetch(`${supabaseUrl}/rest/v1/reviews?id=eq.${rev.id}`, {
                method: 'PATCH',
                headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                body: JSON.stringify({
                  ai_sentiment:   'negative',
                  ai_severity:    parsed.severity    || 'medium',
                  ai_categories:  parsed.categories  || [],
                  ai_summary:     parsed.ai_summary  || '',
                  ai_risk_flag:   parsed.ai_risk_flag ?? false,
                  ai_analysed_at: new Date().toISOString(),
                })
              })
            } catch (classErr) {
              console.log('[sync-all] classify error:', classErr.message)
            }
          }
          console.log('[sync-all] auto-classified', Math.min(newNegatives.length, 5), 'negative reviews for', clinic.name)
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
