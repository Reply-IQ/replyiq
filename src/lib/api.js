// ─── AI ENGINE ─────────────────────────────────────────────────────────────
// On Vercel: calls /api/claude (secure server-side proxy)
// On localhost: calls Anthropic directly using VITE_ANTHROPIC_KEY from .env

async function claude(system, user, maxTokens = 800) {
  try {
    const isLocal = window.location.hostname === 'localhost'
    let res

    if (isLocal) {
      // Direct call for local dev
      const key = import.meta.env.VITE_ANTHROPIC_KEY
      if (!key) return { error: 'Add VITE_ANTHROPIC_KEY to your .env file for local development' }
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      })
    } else {
      // Secure proxy on Vercel
      res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      })
    }

    if (!res.ok) return { error: `API error ${res.status}: ${await res.text()}` }
    const data = await res.json()
    const text = data.content?.map(b => b.text || '').join('') || ''
    try {
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
      if (s !== -1 && e !== -1) return JSON.parse(clean.slice(s, e + 1))
      return JSON.parse(clean)
    } catch { return { raw: text } }
  } catch (e) { return { error: e.message } }
}

// ─── GOOGLE REVIEWS ────────────────────────────────────────────────────────
export async function fetchGoogleReviews(placeId) {
  try {
    const res = await fetch('/api/google-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Failed to fetch reviews', message: data.message }
    return data
  } catch (e) { return { error: e.message } }
}

// ─── EMAIL ─────────────────────────────────────────────────────────────────
export async function sendEmail(to, subject, html) {
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    return await res.json()
  } catch (e) { return { error: e.message } }
}

// ─── REPORT EMAIL BUILDER ──────────────────────────────────────────────────
export function buildReportEmail(clinic, report) {
  const urgCol = { urgent: '#E84855', 'this-week': '#F4A261', 'this-month': '#028090' }
  const actions = (report.priorityActions || []).map(a => `
    <tr><td style="padding:10px 16px;border-bottom:1px solid #1A3040">
      <span style="background:${urgCol[a.urgency] || '#028090'}22;color:${urgCol[a.urgency] || '#028090'};font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">${a.deadline || a.urgency}</span>
      <div style="margin-top:6px;font-weight:600;color:#fff;font-size:14px">${a.action}</div>
      <div style="margin-top:2px;color:#B0C4CE;font-size:12px">${a.expectedImpact}</div>
    </td></tr>`).join('')

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#060D14;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0">
<tr><td style="background:#0D1B2A;border-radius:14px 14px 0 0;padding:32px 36px;border-bottom:3px solid #028090">
  <div style="font-size:28px;font-weight:700;color:#fff">ReplyIQ</div>
  <div style="font-size:11px;color:#02C39A;letter-spacing:3px;text-transform:uppercase;margin-top:4px">Weekly Intelligence Report</div>
  <div style="font-size:13px;color:#5A7A87;margin-top:8px">${clinic?.name || 'Your Clinic'} · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</td></tr>
<tr><td style="background:#0A1828;padding:28px 36px;border-left:3px solid #028090">
  <div style="font-size:11px;color:#028090;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;font-weight:600">Executive Summary</div>
  <div style="font-size:15px;color:#B0C4CE;line-height:1.7">${report.weekSummary || ''}</div>
</td></tr>
<tr><td style="background:#0C1F30;padding:24px 36px">
  <div style="font-size:11px;color:#028090;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;font-weight:600">Priority Actions</div>
  <table width="100%" style="background:#0A1828;border-radius:10px">${actions}</table>
</td></tr>
<tr><td style="background:#0D1B2A;border-radius:0 0 14px 14px;padding:24px 36px;text-align:center;border-top:1px solid #1A3040">
  <div style="font-size:12px;color:#5A7A87">ReplyIQ · replyiq.ch · Not automation. Revenue protection.</div>
</td></tr>
</table></td></tr></table>
</body></html>`
}

// ─── AI FUNCTIONS ──────────────────────────────────────────────────────────
export async function classifyReview(review) {
  return claude(
    'You are ReplyIQ, a dental reputation intelligence AI. Return ONLY valid JSON.',
    `Classify this dental Google review. Return JSON:
{ "sentiment":"positive"|"negative"|"neutral", "categories":["wait_time","billing","hygiene","staff","pain","treatment_quality","positive_experience","compliance_risk"], "severity":"low"|"medium"|"high"|"critical", "summary":"max 12 words", "riskFlag":true|false, "riskReason":null|"1 sentence", "suggestedAction":"1 sentence" }
Review (${review.rating}★, ${review.author}): "${review.text}"`, 450)
}

export async function draftResponse(review, tone = 'professional') {
  const tones = {
    professional: 'warm and professionally formal, non-defensive, acknowledging specific points',
    empathetic: 'highly empathetic, showing genuine care, personal and warm',
    concise: 'brief and direct, 2 sentences max, acknowledge and invite offline dialogue',
  }
  return claude(
    'You are ReplyIQ, a dental reputation AI. Return ONLY valid JSON.',
    `Draft a GDPR-compliant public response for a Swiss dental clinic. Tone: ${tones[tone]}. Max 3-4 sentences. Invite private contact.
Return JSON: { "response":"full response text", "approach":"1 sentence on strategy" }
Review (${review.rating}★): "${review.text}"`, 350)
}

export async function generateBrief(reviews) {
  const txt = reviews.map(r => `[${r.rating}★|${r.review_date}|${r.responded ? '✓' : '✗'}]: ${r.text}`).join('\n')
  return claude(
    'You are ReplyIQ, a dental reputation intelligence AI. Return ONLY valid JSON.',
    `Generate an intelligence brief for this dental clinic.
Return JSON: { "executiveSummary":"2 sentences", "topIssue":"max 5 words", "topIssueDetail":"1 sentence with evidence", "topStrength":"max 5 words", "topStrengthDetail":"1 sentence", "weeklyTrend":"improving"|"declining"|"stable", "urgentAction":"most important action this week", "riskCount":number, "unansweredCount":number }
Reviews:\n${txt}`, 700)
}

export async function generateRiskAnalysis(reviews) {
  const txt = reviews.map(r => `[${r.rating}★|${r.responded ? 'responded' : 'UNANSWERED'}|${r.review_date}]: ${r.text}`).join('\n')
  return claude(
    'You are ReplyIQ, a dental risk intelligence AI. Return ONLY valid JSON.',
    `Risk analysis for this dental clinic.
Return JSON: { "overallScore":number 0-100, "overallTrend":"increasing"|"decreasing"|"stable", "components":{ "ratingVolatility":{"score":number,"detail":"1 sentence"}, "responseGap":{"score":number,"detail":"1 sentence"}, "complianceRisk":{"score":number,"detail":"1 sentence"}, "sentimentTrend":{"score":number,"detail":"1 sentence"}, "competitorPressure":{"score":number,"detail":"1 sentence"} }, "topRiskFactor":"plain language", "complianceFlags":["flag 1"], "sevenDayPlan":[{"day":"Day 1-2","action":"specific","impact":"outcome"},{"day":"Day 3-4","action":"specific","impact":"outcome"},{"day":"Day 5-7","action":"specific","impact":"outcome"}] }
Reviews:\n${txt}`, 850)
}

export async function calculateRevenue(p) {
  return claude(
    'You are ReplyIQ revenue AI. Return ONLY valid JSON with numbers.',
    `Revenue impact: currentRating=${p.currentRating}, targetRating=${p.targetRating}, monthlyAppts=${p.monthlyAppts}, avgRevenueCHF=${p.avgRevenue}. Use HBS Luca 2016: 1 star = ~6% revenue uplift.
Return JSON: { "currentMonthlyRevenue":number, "projectedMonthlyRevenue":number, "monthlyGain":number, "annualGain":number, "newPatientsPerMonth":number, "ratingGap":number, "drisROIx":number, "paybackDays":number, "confidence":"high"|"medium"|"low", "modelNote":"1 sentence" }`, 450)
}

export async function analyseCompetitors(clinic, competitors) {
  const comps = competitors.map(c => `${c.name}: ${c.rating}★ (${c.reviews} reviews, trend ${c.trend})`).join('\n')
  return claude(
    'You are ReplyIQ competitive intelligence AI. Return ONLY valid JSON.',
    `Competitive analysis for ${clinic.name} (${clinic.google_rating}★).
Competitors:\n${comps}
Return JSON: { "marketPosition":"e.g. 3rd of 5", "ratingGapToLeader":number, "estimatedMonthlyRevenueLoss":"~CHF X,000", "urgency":"high"|"medium"|"low", "primaryOpportunity":"1 sentence", "threatAssessment":"1 sentence", "marketNarrative":"2 sentences", "quickWins":["win 1","win 2","win 3"] }`, 550)
}

export async function generateReport(clinic, reviews, riskScore) {
  const txt = reviews.slice(0, 12).map(r => `[${r.rating}★|${r.responded ? 'responded' : 'UNANSWERED'}|${r.review_date}]: ${r.text}`).join('\n')
  return claude(
    'You are ReplyIQ weekly report AI. Return ONLY valid JSON.',
    `Weekly intelligence report for ${clinic.name}. Rating: ${clinic.google_rating}★, ${reviews.length} reviews, risk: ${riskScore}/100.
Return JSON: { "weekSummary":"2 sentences", "ratingStatus":"e.g. 4.3★ — declining", "reviewsAnalysed":number, "negativeCount":number, "positiveCount":number, "unansweredUrgent":number, "riskScore":number, "riskTrend":"increasing"|"decreasing"|"stable", "estimatedRevenueRisk":"~CHF X,000/month", "topThreats":["threat 1","threat 2","threat 3"], "topStrengths":["strength 1","strength 2"], "priorityActions":[{"action":"text","urgency":"urgent","deadline":"Today","expectedImpact":"outcome"},{"action":"text","urgency":"this-week","deadline":"This week","expectedImpact":"outcome"},{"action":"text","urgency":"this-month","deadline":"This month","expectedImpact":"outcome"}], "winOfTheWeek":"1 highlight", "nextWeekFocus":"1 sentence" }
Reviews:\n${txt}`, 950)
}
