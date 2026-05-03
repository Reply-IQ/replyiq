// AI engine — calls /api/claude on Vercel, direct on localhost
async function ai(system, user, max = 800, consumeFn = null) {
  if (consumeFn) {
    const check = await consumeFn()
    if (!check.allowed) return { error: check.reason || 'Trial limit reached. Please upgrade.' }
  }
  try {
    const isLocal = window.location.hostname === 'localhost'
    let res
    if (isLocal) {
      const key = import.meta.env.VITE_ANTHROPIC_KEY
      if (!key) return { error: 'Add VITE_ANTHROPIC_KEY to your .env file' }
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: max, system, messages: [{ role: 'user', content: user }] }),
      })
    } else {
      res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: max, system, messages: [{ role: 'user', content: user }] }),
      })
    }
    if (!res.ok) return { error: `API error ${res.status}` }
    const data = await res.json()
    const text = data.content?.map(b => b.text || '').join('') || ''
    try {
      const c = text.replace(/```json\n?|\n?```/g, '').trim()
      const s = c.indexOf('{'), e = c.lastIndexOf('}')
      if (s !== -1 && e !== -1) return JSON.parse(c.slice(s, e + 1))
      return JSON.parse(c)
    } catch { return { raw: text } }
  } catch (e) { return { error: e.message } }
}

// ── WEBSITE SCANNER ───────────────────────────────────────────────────────────
export async function scanWebsite(url) {
  try {
    const r = await fetch('/api/scan-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    return await r.json()
  } catch (e) { return { error: e.message } }
}

// ── DRAFT RESPONSE ────────────────────────────────────────────────────────────
export async function draftResponse(review, property, tone = 'professional', consumeFn = null) {
  const profile = property?.ai_profile || {}
  const tones = {
    professional: 'warm and professionally formal, acknowledging specific points raised by the guest',
    empathetic:   'highly empathetic and caring, showing genuine concern for the guest experience',
    concise:      'brief and direct, 2 sentences max, acknowledge and invite private follow-up',
  }
  return ai(
    `You are the AI response assistant for ${profile.businessName || property?.name || 'this hospitality property'}.
Property type: ${profile.industry || 'hotel or restaurant'} in ${profile.country || 'Switzerland'}
Respond in: ${profile.responseLanguage || 'en'}
Brand personality: ${profile.responsePersonality || 'Warm, professional hospitality brand that genuinely cares about every guest experience.'}
Tone: ${tones[tone] || tones.professional}

HOSPITALITY RESPONSE RULES:
- Maximum 3-4 sentences
- Never mention specific room numbers, table numbers, or staff names
- Never make promises about refunds or compensation publicly
- Invite private contact for unresolved issues (email or phone)
- Sound human and genuine, not corporate
- For negative reviews: acknowledge, apologise sincerely, invite private resolution
- For positive reviews: thank warmly, mention specific positive they highlighted, invite return visit
- Sign off as: ${profile.autoResponseConfig?.signOff || `The ${property?.name || 'Management'} Team`}
- Comply with Swiss/DACH hospitality standards — no medical claims, no price commitments`,
    `Write a ${review.rating}-star ${review.platform || 'Google'} review response.
Return ONLY valid JSON: { "response": "full response text here", "approach": "1 sentence explaining strategy" }
Review: "${review.text}"`,
    400, consumeFn
  )
}

// ── AI BRIEF ──────────────────────────────────────────────────────────────────
export async function generateBrief(reviews, property, consumeFn = null) {
  const type = property?.ai_profile?.industry || 'hotel/restaurant'
  const txt = reviews.slice(0, 20).map(r => `[${r.rating}★|${r.platform || 'Google'}|${r.review_date}|${r.responded ? 'replied' : 'UNANSWERED'}]: ${r.text}`).join('\n')
  return ai(
    'You are ReplyIQ, a hospitality reputation intelligence AI for hotels and restaurants in the DACH region. Return ONLY valid JSON.',
    `Generate an intelligence brief for this ${type} property.
Return JSON: { "executiveSummary":"2 sentences on reputation health", "topIssue":"max 5 words", "topIssueDetail":"1 sentence with evidence from reviews", "topStrength":"max 5 words", "topStrengthDetail":"1 sentence", "weeklyTrend":"improving|declining|stable", "urgentAction":"single most important action this week", "riskCount":number, "unansweredCount":number }
Reviews:\n${txt}`, 700, consumeFn
  )
}

// ── REVENUE IMPACT (deterministic math — no AI) ───────────────────────────────
export function calcRevenue({ currentRating, targetRating, monthlyRevenue }) {
  const ELASTICITY = 0.054 // HBS Luca 2016: 1 star = 5.4% revenue uplift
  const gap = Math.max(0, targetRating - currentRating)
  const pct = gap * ELASTICITY
  const projected = Math.round(monthlyRevenue * (1 + pct))
  const monthly = projected - monthlyRevenue
  const SUBSCRIPTION = 249
  return {
    currentMonthlyRevenue: monthlyRevenue,
    projectedMonthlyRevenue: projected,
    monthlyGain: monthly,
    annualGain: monthly * 12,
    ratingGap: Math.round(gap * 10) / 10,
    upliftPct: Math.round(pct * 1000) / 10,
    roiX: monthly > 0 ? Math.round((monthly / SUBSCRIPTION) * 10) / 10 : 0,
    paybackDays: monthly > 0 ? Math.round((SUBSCRIPTION / monthly) * 30) : 0,
    confidence: gap <= 0.3 ? 'high' : gap <= 0.7 ? 'medium' : 'low',
  }
}

// ── COMPETITOR ANALYSIS ───────────────────────────────────────────────────────
export async function analyseCompetitors(property, competitors) {
  const type = property?.ai_profile?.industry || 'hotel'
  const comps = competitors.map(c => `${c.name}: ${c.rating}★ (${c.reviews} reviews)`).join('\n')
  return ai(
    'You are ReplyIQ hospitality competitive intelligence AI for DACH region. Return ONLY valid JSON.',
    `Competitive analysis for ${property.name} (${property.google_rating}★) — ${type}.
Competitors:\n${comps}
Return JSON: { "marketPosition":"e.g. #2 of 6", "gapToLeader":number, "revenueAtRisk":"~CHF X,000/month", "urgency":"high|medium|low", "primaryOpportunity":"1 sentence", "threat":"1 sentence", "narrative":"2 sentences", "quickWins":["win 1","win 2","win 3"] }`, 500
  )
}

// ── WEEKLY REPORT ─────────────────────────────────────────────────────────────
export async function generateReport(property, reviews, riskScore, consumeFn = null) {
  const type = property?.ai_profile?.industry || 'hotel/restaurant'
  const txt = reviews.slice(0, 15).map(r => `[${r.rating}★|${r.platform || 'Google'}|${r.responded ? 'replied' : 'UNANSWERED'}]: ${r.text}`).join('\n')
  return ai(
    'You are ReplyIQ hospitality intelligence AI for DACH region hotels and restaurants. Return ONLY valid JSON.',
    `Weekly reputation report for ${property.name} (${type}). Rating: ${property.google_rating}★, ${reviews.length} total reviews, risk score: ${riskScore}/100.
Return JSON: { "weekSummary":"2 sentences", "negativeCount":number, "positiveCount":number, "unansweredCount":number, "riskScore":number, "riskTrend":"increasing|decreasing|stable", "revenueRisk":"~CHF X,000/month", "topThreats":["threat 1","threat 2"], "topStrengths":["strength 1","strength 2"], "actions":[{"action":"text","urgency":"urgent|this-week|this-month","impact":"outcome"}], "win":"highlight of the week", "nextFocus":"1 sentence priority for next week" }
Reviews:\n${txt}`, 900, consumeFn
  )
}

// ── CLASSIFY REVIEW ───────────────────────────────────────────────────────────
export async function classifyReview(review) {
  return ai(
    'You are ReplyIQ hospitality reputation AI for hotels and restaurants in DACH. Return ONLY valid JSON.',
    `Classify this hospitality guest review.
Return JSON: { "sentiment":"positive|negative|neutral", "categories":["cleanliness","staff","food_quality","value","location","noise","check_in","breakfast","room_quality","service_speed","positive_experience"], "severity":"low|medium|high|critical", "summary":"max 12 words describing the review", "riskFlag":true|false, "riskReason":null, "suggestedAction":"1 sentence recommended action" }
Review (${review.rating}★ on ${review.platform || 'Google'}): "${review.text}"`, 400
  )
}

// ── RISK ANALYSIS ─────────────────────────────────────────────────────────────
export async function generateRiskAnalysis(reviews) {
  const txt = reviews.slice(0, 20).map(r => `[${r.rating}★|${r.responded ? 'replied' : 'UNANSWERED'}]: ${r.text}`).join('\n')
  return ai(
    'You are ReplyIQ hospitality risk intelligence AI for DACH region. Return ONLY valid JSON.',
    `Analyse reputation risk for this hospitality property.
Return JSON: { "overallScore":number, "components":{ "ratingVolatility":{"score":number,"detail":"text"}, "responseGap":{"score":number,"detail":"text"}, "complianceRisk":{"score":number,"detail":"text"}, "sentimentTrend":{"score":number,"detail":"text"}, "competitorPressure":{"score":number,"detail":"text"} }, "sevenDayPlan":[{"day":"Day 1-2","action":"text","impact":"text"},{"day":"Day 3-4","action":"text","impact":"text"},{"day":"Day 5-7","action":"text","impact":"text"}] }
Reviews:\n${txt}`, 800
  )
}
