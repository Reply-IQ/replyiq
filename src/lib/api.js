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

// ── RISK ANALYSIS ─────────────────────────────────────────────────────────────
export async function generateRiskAnalysis(reviews, property) {
  const name = property?.name || 'this property'
  const negative = reviews.filter(r => r.rating <= 2)
  const unanswered = reviews.filter(r => !r.responded)
  const avgRating = reviews.length ? (reviews.reduce((s,r) => s+r.rating,0)/reviews.length).toFixed(1) : 0

  const sample = negative.slice(0,5).map(r => `${r.rating}★: "${r.text?.slice(0,150)}"`).join('\n')

  return ai(
    `You are a hospitality reputation analyst specialising in DACH markets. Be specific and actionable.`,
    `Analyse the reputation risk for ${name}.

Stats:
- Total reviews: ${reviews.length}
- Average rating: ${avgRating}★
- Unanswered reviews: ${unanswered.length} (${Math.round(unanswered.length/Math.max(reviews.length,1)*100)}%)
- Negative reviews (1-2★): ${negative.length}

Sample of recent negative reviews:
${sample}

Return JSON: {
  "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
  "summary": "2 sentence executive summary of the risk situation",
  "topThreats": ["specific threat 1", "specific threat 2", "specific threat 3"],
  "immediateActions": ["action to take this week", "action 2", "action 3"],
  "positives": ["what is working well", "strength to maintain"],
  "revenueImpact": "estimated revenue impact of current rating vs target"
}`,
    1000
  )
}

// ── REVENUE IMPACT ────────────────────────────────────────────────────────────
export async function calcRevenue(property, reviews) {
  const avgRating = reviews?.length
    ? (reviews.reduce((s,r) => s+r.rating,0)/reviews.length).toFixed(2)
    : 0
  const monthlyRevenue = property?.avg_revenue || 150000
  const targetRating   = property?.target_rating || 4.7

  return ai(
    `You are a hospitality revenue analyst. Use real hospitality industry research for DACH markets.`,
    `Calculate revenue impact for ${property?.name || 'this property'}.

Current average rating: ${avgRating}★
Target rating: ${targetRating}★
Monthly revenue baseline: CHF ${monthlyRevenue.toLocaleString()}
Total reviews: ${reviews?.length || 0}
Response rate: ${reviews?.length ? Math.round(reviews.filter(r=>r.responded).length/reviews.length*100) : 0}%

Return JSON: {
  "currentRating": ${avgRating},
  "targetRating": ${targetRating},
  "ratingGap": ${(targetRating - avgRating).toFixed(2)},
  "estimatedRevenueUplift": <number in CHF per month if target rating achieved>,
  "annualUplift": <annualised CHF>,
  "responseRateImpact": "<sentence on how improving response rate affects ranking and bookings>",
  "methodology": "<1 sentence explaining the calculation basis>",
  "confidence": "LOW|MEDIUM|HIGH"
}`,
    600
  )
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

Return JSON: {
  "executiveSummary": "3 sentence summary of this week's reputation health — be direct",
  "riskScore": <0-100 number>,
  "riskLevel": "LOW|MODERATE|HIGH|CRITICAL",
  "winOfTheWeek": "the most positive thing that happened this week",
  "topThreat": "the single biggest reputation risk right now",
  "stats": {
    "totalReviews": ${total},
    "avgRating": ${avgRating},
    "unansweredCount": ${unanswered},
    "responseRate": "${total ? Math.round((total-unanswered)/total*100) : 0}%",
    "negativeCount": ${negative.length},
    "positiveCount": ${positive.length}
  },
  "priorityActions": [
    {"priority": "URGENT", "action": "specific action to take today", "impact": "why this matters"},
    {"priority": "THIS_WEEK", "action": "action for this week", "impact": "expected result"},
    {"priority": "NEXT_WEEK", "action": "action for next week", "impact": "expected result"}
  ],
  "nextWeekFocus": "one clear focus area for next week"
}`,
    1200
  )
}
