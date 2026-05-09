// AI engine — calls /api/claude on Vercel
async function ai(system, user, max = 800) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: max,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
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
export async function draftResponse(review, property, tone = 'professional') {
  const profile   = property?.ai_profile || {}
  const name      = profile.businessName || property?.name || 'our property'
  const lang      = profile.responseLanguage || 'de'
  const industry  = profile.industry || 'hotel'
  const reviewer  = review?.author || ''
  const firstName = reviewer.split(' ')[0] || ''
  const rating    = review?.rating || 3
  const platform  = review?.platform || 'Google'
  const reviewText= review?.text || ''

  // Greeting in correct language
  const greetingMap = {
    de: firstName ? `Liebe/r ${firstName},` : 'Liebe Gästin, lieber Gast,',
    fr: firstName ? `Cher/Chère ${firstName},` : 'Cher(e) client(e),',
    it: firstName ? `Gentile ${firstName},` : 'Gentile ospite,',
    en: firstName ? `Dear ${firstName},` : 'Dear Guest,',
  }
  const greeting = profile.greetingStyle || greetingMap[lang] || greetingMap.de

  const signOff = profile.signOffStyle ||
    profile.autoResponseConfig?.signOff ||
    (lang === 'de' ? `Mit herzlichen Grüssen,\nDas Team von ${name}` :
     lang === 'fr' ? `Cordialement,\nL'équipe de ${name}` :
     lang === 'it' ? `Cordiali saluti,\nIl team di ${name}` :
                     `Warm regards,\nThe Team at ${name}`)

  const toneDesc = {
    professional: 'warm and professionally formal — sophisticated yet approachable',
    empathetic:   'deeply empathetic and human — lead with understanding before solutions',
    concise:      'brief and efficient — acknowledge the key point, offer next step, sign off',
    friendly:     'warm, friendly and personal — like a conversation, not a letter',
  }[tone] || 'warm and professionally formal'

  // Rating-specific strategy
  const ratingStrategy = rating >= 5
    ? `This is a 5-star review. Lead with genuine gratitude, highlight one specific detail they mentioned that shows you truly read their review, express warmth about welcoming them back. 3-4 sentences. Celebrate this win.`
    : rating >= 4
    ? `This is a 4-star review. Thank them warmly, gently acknowledge any concern without dwelling on it, express confidence in their next visit. 3-4 sentences.`
    : rating >= 3
    ? `This is a 3-star review. Acknowledge their experience respectfully, specifically address the concern they raised, show what you're doing or will do about it, invite private follow-up for a better next experience. 4-5 sentences.`
    : `This is a ${rating}-star review requiring careful de-escalation. Start by acknowledging their disappointment sincerely, specifically address each concern they raised (never be dismissive or defensive), apologise for the experience not meeting expectations, explain what you will do or have done about it, and invite them to contact you directly to discuss further. 5-6 sentences. This response may make the difference between them returning or never coming back.`

  const keyStrengths = profile.keyStrengths?.length
    ? `Property strengths to weave in naturally where relevant: ${profile.keyStrengths.join(', ')}`
    : ''

  const neverInclude = profile.autoResponseConfig?.neverInclude ||
    'Never make promises you cannot keep. Never offer refunds or compensation in a public review response. Never be defensive. Never copy-paste generic responses.'

  const systemPrompt = `You are the official AI response writer for ${name}, a ${industry} in ${profile.city || 'DACH region'}.

Your role is to write review responses that:
- Sound written by a real, caring human — never robotic or templated
- Reflect the specific brand voice of ${name}: ${profile.responsePersonality || `A ${profile.brandTone || 'professional and warm'} ${industry} that genuinely cares about every guest`}
- Are written in ${lang === 'de' ? 'German (Sie form — formal)' : lang === 'fr' ? 'French (vouvoiement)' : lang === 'it' ? 'Italian (Lei form)' : 'English'} — ALWAYS match the language of the review
- Follow Swiss/DACH hospitality standards and consumer protection norms

${ratingStrategy}

ALWAYS:
- Address the reviewer by first name using this greeting: "${greeting}"
- Sign off with: "${signOff}"
- Reference something specific from their review — never write a response that could work for any review
- Keep the response tightly focused — no padding

NEVER:
${neverInclude}

${keyStrengths}

Tone: ${toneDesc}

Return ONLY the response text — no preamble, no explanation, no quotes around it.`

  const userPrompt = `Write a review response for this ${rating}-star ${platform} review${firstName ? ` left by ${firstName}` : ''}:

"${reviewText}"

Remember: start with "${greeting}" and end with the sign-off. Reference something specific from this review.`

  return ai(systemPrompt, userPrompt, 600)
}



// ── REVENUE IMPACT (synchronous — based on Luca 2016 Harvard research) ────────
// ~9% revenue uplift per 1-star rating increase in hospitality
export function calcRevenue({ currentRating, targetRating, monthlyRevenue }) {
  const current  = parseFloat(currentRating) || 4.0
  const target   = parseFloat(targetRating)  || 4.7
  const base     = parseFloat(monthlyRevenue) || 150000
  const gap      = Math.max(0, target - current)
  const upliftPct= gap * 9  // 9% per star (Luca 2016)
  const projected= Math.round(base * (1 + upliftPct / 100))
  const uplift   = projected - base
  return {
    currentRating:         current,
    targetRating:          target,
    ratingGap:             +gap.toFixed(2),
    currentMonthlyRevenue: Math.round(base),
    projectedMonthlyRevenue: projected,
    monthlyUplift:         uplift,
    annualUplift:          uplift * 12,
    upliftPercent:         +upliftPct.toFixed(1),
    methodology:           `Based on Harvard Business School research (Luca, 2016): each 1-star increase in rating yields ~9% revenue uplift for hospitality businesses.`,
  }
}

// ── COMPETITOR ANALYSIS ───────────────────────────────────────────────────────
export async function analyseCompetitors(property, competitors) {
  const name = property?.name || 'your property'
  const compList = competitors.map(c =>
    `${c.name}: ${c.rating}★ (${c.reviews} reviews)`
  ).join('\n')

  return ai(
    `You are a hospitality competitive intelligence analyst for the DACH market.`,
    `Analyse competitive position for ${name}.

Your property stats from Google:
- Rating: ${property?.platform_connections?.google?.businessInfo?.rating || 'unknown'}★
- Reviews: ${property?.platform_connections?.google?.businessInfo?.totalReviews || 'unknown'}

Nearby competitors:
${compList}

Return JSON: {
  "competitivePosition": "LEADING|STRONG|AVERAGE|LAGGING",
  "summary": "2 sentence competitive summary",
  "strengths": ["competitive advantage 1", "competitive advantage 2"],
  "gaps": ["gap vs competitors 1", "gap 2"],
  "recommendations": ["specific action to improve competitive position 1", "action 2", "action 3"],
  "marketInsight": "1 insight about the local hospitality market"
}`,
    800
  )
}

// ── WEEKLY REPORT ─────────────────────────────────────────────────────────────
export async function generateReport(property, reviews) {
  const name       = property?.name || 'your property'
  const total      = reviews.length
  const avgRating  = total ? (reviews.reduce((s,r) => s+r.rating,0)/total).toFixed(1) : 0
  const unanswered = reviews.filter(r => !r.responded).length
  const negative   = reviews.filter(r => r.rating <= 2)
  const positive   = reviews.filter(r => r.rating >= 5)
  const recent     = reviews.slice(0,10).map(r =>
    `${r.rating}★ (${r.responded?'answered':'UNANSWERED'}): "${r.text?.slice(0,100)}"`
  ).join('\n')

  return ai(
    `You are the weekly intelligence briefing system for ReplyIQ, a hospitality reputation management platform. Write in a professional but direct tone. Be specific, not generic.`,
    `Generate the weekly reputation intelligence report for ${name}.

This week's data:
- Total reviews in system: ${total}
- Average rating: ${avgRating}★
- Unanswered reviews: ${unanswered} (${total ? Math.round(unanswered/total*100) : 0}% response rate)
- Negative reviews (1-2★): ${negative.length}
- 5-star reviews: ${positive.length}

Recent reviews sample:
${recent}

Return JSON with EXACTLY these fields:
{
  "weekSummary": "3 direct sentences summarising reputation health — be specific and honest",
  "riskScore": <integer 0-100>,
  "negativeCount": ${negative.length},
  "positiveCount": ${positive.length},
  "unansweredCount": ${unanswered},
  "revenueRisk": "e.g. CHF 12,000/month at risk — estimate based on rating gap",
  "topThreats": ["specific threat 1 from the reviews", "specific threat 2", "specific threat 3"],
  "topStrengths": ["specific strength from reviews 1", "strength 2"],
  "actions": [
    {"urgency": "urgent", "action": "specific action to do today", "impact": "why this matters right now"},
    {"urgency": "this-week", "action": "action for this week", "impact": "expected outcome"},
    {"urgency": "this-month", "action": "strategic action for this month", "impact": "long-term benefit"}
  ],
  "win": "the single most positive thing from this week's reviews — quote or paraphrase specifically",
  "nextFocus": "one clear actionable focus area for next week"
}`,
    1200
  )
}

// ── INTELLIGENCE BRIEF (Dashboard) ───────────────────────────────────────────
export async function generateBrief(property, reviews) {
  const name      = property?.name || 'your property'
  const total     = reviews.length
  const avgRating = total ? (reviews.reduce((s,r) => s+r.rating,0)/total).toFixed(1) : 0
  const unanswered= reviews.filter(r => !r.responded).length
  const negative  = reviews.filter(r => r.rating <= 2).length
  const recent    = reviews.slice(0,5).map(r =>
    `${r.rating}★: "${r.text?.slice(0,120)}"`
  ).join('\n')

  return ai(
    `You are the intelligence briefing AI for ${name}. Write like a sharp, experienced hospitality consultant — direct, insightful, specific. Never generic.`,
    `Generate today's intelligence brief for ${name}.

Current data:
- Reviews in system: ${total}
- Average rating: ${avgRating}★
- Unanswered: ${unanswered}
- Negative (1-2★): ${negative}

Recent reviews:
${recent}

Return JSON with EXACTLY these fields:
{
  "executiveSummary": "2-3 sentence sharp summary of reputation health right now",
  "topIssue": "4-6 word title of the main problem",
  "topIssueDetail": "1-2 sentences explaining the issue and its business impact",
  "topStrength": "4-6 word title of the main strength",
  "topStrengthDetail": "1-2 sentences on what is working well and why",
  "urgentAction": "the single most important action to take this week — be specific"
}`,
    600
  )
}

// ── CLASSIFY REVIEW ────────────────────────────────────────────────────────────
export async function classifyReview(review) {
  return ai(
    `You are a hospitality review analyst. Classify the review concisely and accurately.`,
    `Classify this ${review.rating}-star review:
"${review.text?.slice(0,500) || '(No text)'}"

Return JSON: {
  "ai_sentiment": "positive|neutral|negative",
  "ai_severity": "low|medium|high|critical",
  "ai_categories": ["cleanliness", "service", "location", "value", "food", "room", "amenities"],
  "ai_summary": "one sentence summary of the main point",
  "ai_action": "what to do — e.g. respond urgently, thank and invite back, address complaint offline",
  "ai_risk_flag": true or false
}`,
    400
  )
}

// ── RISK ANALYSIS (full) ───────────────────────────────────────────────────────
export async function generateRiskAnalysis(reviews, property) {
  const total      = reviews?.length || 0
  const unanswered = reviews?.filter(r => !r.responded).length || 0
  const negative   = reviews?.filter(r => r.rating <= 2).length || 0
  const avgRating  = total ? (reviews.reduce((s,r)=>s+r.rating,0)/total).toFixed(1) : 0
  const responseRate = total ? Math.round((total-unanswered)/total*100) : 0
  const name = property?.name || 'this property'

  return ai(
    `You are a hospitality reputation risk analyst specialising in DACH markets. Be specific and data-driven.`,
    `Analyse reputation risk for ${name}.

Data:
- Total reviews: ${total}
- Average rating: ${avgRating}★
- Response rate: ${responseRate}%
- Negative reviews (1-2★): ${negative}
- Unanswered: ${unanswered}

Return JSON with EXACTLY these fields:
{
  "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
  "summary": "2-3 sentence analysis of the overall risk situation",
  "topThreats": ["specific threat 1", "specific threat 2", "specific threat 3"],
  "immediateActions": ["do this today", "do this this week", "do this this month"],
  "positives": ["what is working", "strength to maintain"],
  "revenueImpact": "CHF estimate of revenue at risk monthly",
  "components": {
    "ratingVolatility":   { "score": <0-100>, "detail": "explanation" },
    "responseGap":        { "score": <0-100>, "detail": "explanation" },
    "complianceRisk":     { "score": <0-100>, "detail": "explanation" },
    "sentimentTrend":     { "score": <0-100>, "detail": "explanation" },
    "competitorPressure": { "score": <0-100>, "detail": "explanation" }
  }
}`,
    900
  )
}
