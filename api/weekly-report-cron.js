// /api/weekly-report-cron.js
// Runs every Monday at 7:00am UTC via Vercel cron
// Generates and emails a weekly intelligence report for each active/trial clinic
// Only sends if:
//   - subscription_status is 'active' OR ('trial' AND trial not expired)
//   - clinic has an owner_email set
//   - clinic has at least 10 reviews imported

export const maxDuration = 60

export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  const isManualCurl = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`
  if (!isVercelCron && !isManualCurl) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
  const resendKey   = process.env.RESEND_API_KEY
  if (!supabaseUrl || !serviceKey || !resendKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  console.log('[weekly-report] Starting Monday report run...')

  try {
    // ── 1. Fetch all eligible clinics ─────────────────────────────────────────
    const clinicsRes = await fetch(
      `${supabaseUrl}/rest/v1/clinics?select=id,name,owner_email,subscription_status,trial_ends_at,ai_profile,platform_connections`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
    )
    const allClinics = await clinicsRes.json()
    console.log('[weekly-report] Total clinics:', allClinics.length)

    const now = new Date()

    // Filter to eligible clinics
    const eligible = allClinics.filter(c => {
      // Must have email
      if (!c.owner_email) return false

      // Include active subscribers, trial users, AND manually onboarded clients
      // (manually onboarded clients won't have subscription_status set)
      const status = c.subscription_status
      if (!status || status === 'active' || status === 'paid') return true
      if (status === 'trial') {
        const trialEnd = c.trial_ends_at ? new Date(c.trial_ends_at) : null
        return !trialEnd || trialEnd > now
      }
      if (status === 'cancelled' || status === 'expired') return false
      return true // include anything else by default
    })

    console.log('[weekly-report] Eligible clinics:', eligible.length)

    const results = []

    for (const clinic of eligible) {
      try {
        // ── 2. Fetch this clinic's reviews ──────────────────────────────────
        const reviewsRes = await fetch(
          `${supabaseUrl}/rest/v1/reviews?clinic_id=eq.${clinic.id}&select=rating,text,responded,review_date,author&order=review_date.desc&limit=500`,
          { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } }
        )
        const reviews = await reviewsRes.json()

        // Skip if fewer than 10 reviews — not enough data for a meaningful report
        if (!Array.isArray(reviews) || reviews.length < 10) {
          console.log('[weekly-report] Skipping', clinic.name, '— only', reviews?.length || 0, 'reviews')
          continue
        }

        // ── 3. Generate the report with Claude ──────────────────────────────
        const report = await generateWeeklyReport(clinic, reviews)
        if (!report || report.error) {
          console.error('[weekly-report] Report generation failed for', clinic.name, ':', report?.error)
          results.push({ clinic: clinic.name, error: 'report generation failed' })
          continue
        }

        // ── 4. Save report to DB ─────────────────────────────────────────────
        await fetch(`${supabaseUrl}/rest/v1/weekly_reports`, {
          method:  'POST',
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinic_id: clinic.id, report_data: report, risk_score: report.riskScore || 0 })
        })

        // ── 5. Send the email ─────────────────────────────────────────────────
        const html = buildEmailHtml(report, clinic)
        const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

        const emailRes = await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
          body: JSON.stringify({
            from:     'ReplyIQ Intelligence <info@replyiq.ch>',
            to:       [clinic.owner_email],
            reply_to: 'alexriese410@gmail.com',
            subject:  `Your Weekly Reputation Report: ${clinic.name} | ${dateStr}`,
            html,
          })
        })

        const emailResult = await emailRes.json()
        if (!emailRes.ok) throw new Error(JSON.stringify(emailResult))

        console.log('[weekly-report]', clinic.name, '— report sent to', clinic.owner_email)
        results.push({ clinic: clinic.name, email: clinic.owner_email, sent: true })

      } catch (e) {
        console.error('[weekly-report] Error for', clinic.name, ':', e.message)
        results.push({ clinic: clinic.name, error: e.message })
      }

      // Small delay between clinics to avoid API rate limits
      await new Promise(r => setTimeout(r, 2000))
    }

    console.log('[weekly-report] Complete:', JSON.stringify(results))
    return res.status(200).json({ success: true, sent: results.filter(r => r.sent).length, results })

  } catch (e) {
    console.error('[weekly-report] Fatal:', e.message)
    return res.status(500).json({ error: e.message })
  }
}

// ── Generate report with Claude ───────────────────────────────────────────────
async function generateWeeklyReport(clinic, reviews) {
  const total      = reviews.length
  const unanswered = reviews.filter(r => !r.responded).length
  const negative   = reviews.filter(r => r.rating <= 2).length
  const positive   = reviews.filter(r => r.rating >= 4).length
  const avgRating  = total ? (reviews.reduce((s, r) => s + Number(r.rating), 0) / total).toFixed(2) : 0
  const responseRate = total ? Math.round(((total - unanswered) / total) * 100) : 0
  const name       = clinic.name || 'your property'
  const profile    = clinic.ai_profile || {}
  const industry   = profile.industry || 'hospitality property'

  // Sample recent negative reviews for context
  const recentNegative = reviews.filter(r => r.rating <= 2).slice(0, 5)
    .map(r => `${r.rating}★ — "${(r.text || '').slice(0, 150)}"`)
    .join('\n')

  try {
    const res = await fetch('https://app.replyiq.ch/api/claude', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:     'You are a reputation intelligence analyst specialising in DACH hospitality. You write precise, actionable weekly reports for hotel and restaurant managers. Be direct, specific, and use real numbers.',
        messages: [{ role: 'user', content: `Generate a weekly reputation intelligence report for ${name} (${industry}).

Data this week:
- Total reviews imported: ${total}
- Average rating: ${avgRating}★
- Unanswered reviews: ${unanswered} (${100 - responseRate}% silence rate)
- Negative reviews (1-2★): ${negative}
- Positive reviews (4-5★): ${positive}
- Response rate: ${responseRate}%
${recentNegative ? `\nRecent negative reviews:\n${recentNegative}` : ''}

Return JSON with EXACTLY these fields:
{
  "weekSummary": "3 direct sentences summarising reputation health — be specific with numbers",
  "riskScore": <integer 0-100>,
  "unansweredCount": ${unanswered},
  "negativeCount": ${negative},
  "positiveCount": ${positive},
  "responseRate": ${responseRate},
  "revenueRisk": "CHF estimate of monthly revenue at risk from current rating gap",
  "topThreats": ["specific threat from the data", "specific threat 2", "specific threat 3"],
  "topStrengths": ["specific strength from the data", "strength 2"],
  "actions": [
    {"urgency": "urgent", "action": "specific action to do this week", "impact": "why this matters"},
    {"urgency": "this-week", "action": "second priority action", "impact": "expected outcome"},
    {"urgency": "this-month", "action": "strategic action", "impact": "long-term benefit"}
  ],
  "win": "the single most positive thing from the recent reviews — quote or describe specifically",
  "nextFocus": "one clear actionable focus area for next week"
}`
        }]
      })
    })
    const data  = await res.json()
    const text  = data.content?.map(b => b.text || '').join('') || ''
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    const start = clean.indexOf('{'), end = clean.lastIndexOf('}')
    if (start !== -1 && end !== -1) return JSON.parse(clean.slice(start, end + 1))
    return JSON.parse(clean)
  } catch (e) {
    return { error: e.message }
  }
}

// ── Build the HTML email ──────────────────────────────────────────────────────
function buildEmailHtml(r, clinic) {
  const name     = clinic.name || 'Your Property'
  const date     = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const rScore   = r.riskScore || 0
  const rColor   = rScore >= 70 ? '#B85C38' : rScore >= 45 ? '#C9A96E' : '#4A7C6F'
  const rLabel   = rScore >= 70 ? 'HIGH RISK' : rScore >= 45 ? 'MODERATE' : 'STABLE'
  const swissFlag= `<svg width="12" height="12" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;display:inline-block;vertical-align:middle;margin-right:4px"><rect width="20" height="20" fill="#FF0000"/><rect x="3" y="7" width="14" height="6" fill="white"/><rect x="7" y="3" width="6" height="14" fill="white"/></svg>`

  const actionsHtml = (r.actions || []).map(a => `
    <div style="padding:12px;border-radius:8px;margin-bottom:8px;background:rgba(201,169,110,0.05);border:1px solid rgba(201,169,110,0.12)">
      <div style="font-size:10px;font-weight:700;color:#C9A96E;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">${(a.urgency||'').replace('-',' ')}</div>
      <div style="font-size:13px;color:#E8E4DC;font-weight:600;margin-bottom:3px">${a.action}</div>
      <div style="font-size:12px;color:#6B7280">${a.impact}</div>
    </div>`).join('')

  const threatsHtml = (r.topThreats || []).map(t => `
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #2A3545;font-size:13px">
      <span style="color:#B85C38;flex-shrink:0">▲</span>
      <span style="color:#C8C3BC">${t}</span>
    </div>`).join('')

  const strengthsHtml = (r.topStrengths || []).map(t => `
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #2A3545;font-size:13px">
      <span style="color:#4A7C6F;flex-shrink:0">✓</span>
      <span style="color:#C8C3BC">${t}</span>
    </div>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#E8E4DC">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:28px">
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff;letter-spacing:-0.5px">
      Reply<span style="color:#C9A96E">IQ</span>
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px;letter-spacing:2px;text-transform:uppercase">Weekly Intelligence Report</div>
    <div style="font-size:13px;color:#C9A96E;margin-top:8px;font-weight:600">${name}</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:3px">${date}</div>
  </div>

  <!-- Risk score banner -->
  <div style="background:#1C2430;border:1px solid ${rColor}40;border-left:4px solid ${rColor};border-radius:10px;padding:16px 20px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">Risk Score</div>
      <div style="font-size:11px;font-weight:700;color:${rColor};letter-spacing:1px">${rLabel}</div>
    </div>
    <div style="font-size:44px;font-weight:700;color:${rColor};font-family:Georgia,serif;line-height:1">${rScore}</div>
  </div>

  <!-- KPI row -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
    ${[
      ['Unanswered', r.unansweredCount || 0, '#B85C38'],
      ['Negative', r.negativeCount || 0, '#B85C38'],
      ['Response Rate', (r.responseRate || 0) + '%', '#4A7C6F'],
    ].map(([label, val, color]) => `
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:8px;padding:14px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:${color};font-family:Georgia,serif">${val}</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:1px;margin-top:3px">${label}</div>
    </div>`).join('')}
  </div>

  <!-- Summary -->
  <div style="background:#1C2430;border:1px solid #2A3545;border-left:3px solid #C9A96E;border-radius:10px;padding:18px 20px;margin-bottom:16px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#C9A96E;margin-bottom:8px;font-weight:600">Executive Summary</div>
    <div style="font-size:14px;line-height:1.75;color:#C8C3BC">${r.weekSummary || ''}</div>
  </div>

  <!-- Priority Actions -->
  ${actionsHtml ? `
  <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:18px 20px;margin-bottom:16px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#C9A96E;margin-bottom:12px;font-weight:600">Priority Actions</div>
    ${actionsHtml}
  </div>` : ''}

  <!-- Threats + Strengths -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
    ${threatsHtml ? `
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#B85C38;margin-bottom:10px;font-weight:600">Top Threats</div>
      ${threatsHtml}
    </div>` : ''}
    ${strengthsHtml ? `
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#4A7C6F;margin-bottom:10px;font-weight:600">Strengths</div>
      ${strengthsHtml}
    </div>` : ''}
  </div>

  <!-- Win of the week -->
  ${r.win ? `
  <div style="background:rgba(74,124,111,0.07);border:1px solid rgba(74,124,111,0.2);border-radius:10px;padding:18px 20px;margin-bottom:16px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#4A7C6F;margin-bottom:8px;font-weight:600">Win of the Week</div>
    <div style="font-size:13px;color:#C8C3BC;line-height:1.65;font-style:italic">"${r.win}"</div>
  </div>` : ''}

  <!-- Next focus -->
  ${r.nextFocus ? `
  <div style="background:#1C2430;border:1px solid rgba(201,169,110,0.15);border-radius:10px;padding:16px 20px;margin-bottom:20px">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#C9A96E;margin-bottom:6px;font-weight:600">Next Week Focus</div>
    <div style="font-size:13px;color:#C8C3BC">${r.nextFocus}</div>
  </div>` : ''}

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:24px">
    <a href="https://app.replyiq.ch" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F5C842,#D4860E);border-radius:10px;color:#141920;font-size:14px;font-weight:700;text-decoration:none;font-family:Georgia,serif">
      Open Dashboard and Respond →
    </a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0;border-top:1px solid #2A3545;font-size:10px;color:rgba(255,255,255,0.2);line-height:1.8">
    ${swissFlag} ReplyIQ · Zürich, Switzerland · Swiss data privacy<br>
    <a href="https://app.replyiq.ch" style="color:#C9A96E;text-decoration:none">app.replyiq.ch</a>
  </div>

</div>
</body>
</html>`
}
