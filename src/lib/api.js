// AI engine — calls /api/claude on Vercel
// textOnly=true skips JSON parsing (for review responses which are plain text)
async function ai(system, user, max = 800, textOnly = false) {
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
    if (textOnly) return { raw: text.trim() }
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
  const rating    = review?.rating || 3
  const platform  = review?.platform || 'Google'
  const reviewText= review?.text || ''

  // Extract best available name — author field, then try review text signature
  function extractName(author, text) {
    const genericWords = ['guest','user','anonymous','unknown','room','suite','villa','customer','client','visitor','reviewer']
    const raw = (author || '').trim()
    const first = raw.split(' ')[0] || ''

    // If author looks like a real name (not a generic word, no digits, length ok)
    if (first.length >= 2 && !/[0-9_@#]/.test(first) && !genericWords.includes(first.toLowerCase())) {
      return raw // return full name e.g. "Maria Schneider"
    }

    // Try to find a name signed at the end of the review text
    // Pattern: "Sincerely, Name" / "- Name" / "Regards, Name" at end
    const signatureMatch = (text || '').match(/(?:sincerely|regards|cheers|best|yours|greetings|grusse|grüsse|amicalement|cordialement)[,\s]+([A-Z][a-z]{1,15}(?:\s[A-Z][a-z]{1,15})?)/i)
    if (signatureMatch) return signatureMatch[1].trim()

    return '' // No real name found — use formal fallback
  }
  const resolvedName = extractName(reviewer, reviewText)
  const nameParts = resolvedName.trim().split(' ')
  const firstName = nameParts[0] || ''
  const lastName  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

  // Detect review language — checks characters AND word patterns
  function detectReviewLang(text) {
    if (!text || text.length < 4) return lang
    const t = text.toLowerCase()

    // German-specific characters are a very strong signal
    const hasUmlauts = /[äöüß]/.test(t)
    // French-specific characters
    const hasFrench = /[àâéèêëîïôùûüç]/.test(t)
    // Italian-specific
    const hasItalian = /[àèéìíîòóùú]/.test(t) && !hasFrench

    if (hasUmlauts) return 'de'

    // Word frequency scoring — broader word lists
    const deWords = ['und','die','der','das','nicht','haben','war','sehr','gut','aber','mit','von','für','auf','ist','eine','einem','ich','wir','sie','hotel','zimmer','personal','frühstück','sauber','empfehlen','weiter','tolle','super','schön','leider','leider']
    const frWords = ['est','les','des','pas','pour','avec','très','nous','vous','mais','une','hôtel','chambre','service','bien','merci','séjour','personnel','propre','recommend','excellent','parfait','agréable','magnifique','dommage']
    const itWords = ['molto','sono','con','non','per','che','della','hotel','buono','bene','ottimo','camera','personale','colazione','pulito','consiglio','bellissimo','servizio','fantastico']
    const enWords = ['the','and','was','great','good','hotel','room','staff','breakfast','clean','nice','recommend','loved','stay','amazing','excellent','service','friendly','beautiful','perfect','wonderful','terrible','disappointed']

    const score = (words) => words.filter(w => t.includes(w)).length
    const deScore = score(deWords) + (hasUmlauts ? 5 : 0)
    const frScore = score(frWords) + (hasFrench ? 3 : 0)
    const itScore = score(itWords) + (hasItalian ? 2 : 0)
    const enScore = score(enWords)

    const max = Math.max(deScore, frScore, itScore, enScore)
    if (max === 0) return lang // fall back to profile language, not always 'en'
    if (deScore === max) return 'de'
    if (frScore === max) return 'fr'
    if (itScore === max) return 'it'
    return 'en'
  }
  const reviewLang = detectReviewLang(reviewText)

  // resolvedName is already cleaned — if it's non-empty it's a real name
  const isRealName = firstName.length >= 2

  const fullName = lastName ? firstName + ' ' + lastName : firstName
  const greetingMap = {
    de: isRealName ? 'Guten Tag ' + fullName + ',' : 'Sehr geehrte Damen und Herren,',
    fr: isRealName ? 'Cher ' + firstName + ',' : 'Madame, Monsieur,',
    it: isRealName ? 'Gentile ' + firstName + ',' : 'Gentile ospite,',
    en: isRealName ? 'Dear ' + firstName + ',' : 'Dear Guest,',
  }
  // Never use profile.greetingStyle — it's often marketing copy, compute from reviewer name instead
  const greeting = greetingMap[reviewLang] || greetingMap.en

  // Build a professional sign-off based on review language
  // We deliberately do NOT use profile.signOffStyle — website scanners often pick up
  // brand marketing copy (e.g. "Come Play soon") that sounds wrong in review responses.
  // The sign-off must always be a clean, professional closing.
  const standardSignOff = reviewLang === 'de'
    ? `Mit herzlichen Grüssen,\nDas Team von ${name}`
    : reviewLang === 'fr'
    ? `Cordialement,\nL'équipe de ${name}`
    : reviewLang === 'it'
    ? `Cordiali saluti,\nIl team di ${name}`
    : `Warm regards,\nThe ${name} Team`

  // Only use profile sign-off if it was manually set AND looks like a proper sign-off
  // (contains a newline separating the closing phrase from the team name)
  const profileSignOff = profile.signOffStyle || profile.autoResponseConfig?.signOff || ''
  const signOff = (profileSignOff && profileSignOff.includes('\n')) ? profileSignOff : standardSignOff

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
    ? `PROPERTY STRENGTHS (from website scan): These are genuine strengths of ${name} that guests consistently value. ` +
      `Reference one naturally if it connects to what the guest praised or complained about: ${profile.keyStrengths.join(', ')}`
    : ''

  // Smart Snippets — facts about the property that personalise responses
  // Logic: if the review mentions a topic that a snippet addresses, USE that snippet
  const smartSnippets = profile.smartSnippets?.length
    ? `\n\nPROPERTY FACTS (Smart Snippets): The following are true facts about ${name}. ` +
      `If the guest's review mentions a related topic, weave the relevant fact naturally into your response. ` +
      `Do not force them all in — only use the ones that genuinely connect to what the guest wrote. ` +
      `Used well, these make responses feel informed and specific rather than generic:\n` +
      profile.smartSnippets.map(s => `- ${s}`).join('\n')
    : ''

  const neverInclude = profile.autoResponseConfig?.neverInclude ||
    'Never make promises you cannot keep. Never offer refunds or compensation in a public review response. Never be defensive. Never copy-paste generic responses.'

  const systemPrompt = `You are the official AI response writer for ${name}, a ${industry} in ${profile.city || 'DACH region'}.

Your role is to write review responses that:
- Sound written by a real, caring human — never robotic or templated
- Reflect the specific brand voice of ${name}: ${profile.responsePersonality || `A ${profile.brandTone || 'professional and warm'} ${industry} that genuinely cares about every guest`}
- ALWAYS written in the SAME LANGUAGE as the review text. If the guest wrote in English, respond in English. If German respond in German. Never respond in a different language than the review.
  - Always write from the TEAM perspective. Use Wir/We/Nous. NEVER use ich/mir/I/me/je/moi. You represent the whole team.
- Follow Swiss/DACH hospitality standards and consumer protection norms

${ratingStrategy}

ALWAYS:
- Start your response with EXACTLY this greeting on its own line: "${greeting}"
- End your response with EXACTLY this sign-off: "${signOff}"
- The VERY FIRST word of your response must be the greeting above — do not add any preamble
- Reference at least one specific detail from their review that proves you actually read it
- Write in flowing paragraphs — no bullet points, no dashes, no lists
- Keep it human and focused — 3 to 6 sentences depending on the rating

NEVER:
- Use dashes or bullet points in the response — write in flowing paragraphs only
- Use em dashes (—) anywhere in the response
- Start sentences with "I", "ich", "je" — always "We", "Wir", "Nous"
${neverInclude}

${keyStrengths}${smartSnippets}

REVIEW TOPIC AWARENESS:
Read the guest's review carefully. Identify what they specifically praised or complained about. If they mention:
- Parking → use the parking snippet if available
- Breakfast → use the breakfast hours snippet if available
- Staff → reference the team warmly
- Cleanliness → address it specifically, mention your standards
- Location → reference the city or landmark context if known
- Price/value → acknowledge their perspective professionally
- Noise → address it with your specific context
Always connect your response to THEIR specific experience, not a generic version of it.

Tone: ${toneDesc}

Return ONLY the response text — no preamble, no explanation, no quotes around it.`

  const reviewLangName = reviewLang === 'de' ? 'German' : reviewLang === 'fr' ? 'French' : reviewLang === 'it' ? 'Italian' : 'English'
  const userPrompt = 'Write a ' + reviewLangName + ' response for this ' + rating + '-star ' + platform + ' review' + (isRealName ? ' left by ' + firstName : '') + ':\n\n"' + reviewText + '"\n\nRules:\n- Respond in ' + reviewLangName + ' only\n- Use Wir/We/Nous (team), never ich/I/je\n- Start with exactly: "' + greeting + '"\n- End with exactly: "' + signOff + '"\n- Reference a specific detail from this review'

  return ai(systemPrompt, userPrompt, 600, true)
}




// ── DRAFT 5-STAR AUTO-REPLY TEMPLATE ─────────────────────────────────────────
// Generates the standing template for text-free 5-star reviews.
// Uses full business context: brand voice, snippets, sign-off, industry.
export async function draft5StarTemplate(property) {
  const profile   = property?.ai_profile || {}
  const name      = profile.businessName || property?.name || 'our property'
  const lang      = profile.responseLanguage || 'de'
  const industry  = profile.industry || 'hotel'

  const signOff = profile.signOffStyle ||
    profile.autoResponseConfig?.signOff ||
    (lang === 'de' ? `Mit herzlichen Grüssen,\nDas Team von ${name}` :
     lang === 'fr' ? `Cordialement,\nL\'équipe de ${name}` :
     lang === 'it' ? `Cordiali saluti,\nIl team di ${name}` :
                     `Warm regards,\nThe Team at ${name}`)

  const keyStrengths = profile.keyStrengths?.length
    ? `What makes ${name} special: ${profile.keyStrengths.join(', ')}`
    : ''

  const smartSnippets = profile.smartSnippets?.length
    ? `\n\nFacts you can weave in naturally (choose 1-2 if relevant):\n${profile.smartSnippets.map(s => `- ${s}`).join('\n')}`
    : ''

  const systemPrompt = `You are the official AI response writer for ${name}, a ${industry} in ${profile.city || 'DACH region'}.

Your role is to write a standing auto-reply template for 5-star reviews that have no review text — just a star rating.

This template will be sent automatically to every text-free 5-star review. It must:
- Sound genuine, warm and personal — not like a bot wrote it
- Reflect the brand voice of ${name}: ${profile.responsePersonality || `A ${profile.brandTone || 'professional and warm'} ${industry} that genuinely cares about every guest`}
- Be written in ${lang === 'de' ? 'German' : lang === 'fr' ? 'French' : lang === 'it' ? 'Italian' : 'English'}
- Use "Wir" / "We" / "Nous" — always the team, never "ich" / "I"
- Use {name} as a placeholder where you address the guest (e.g. "Guten Tag {name},")
- Be 2-3 sentences only — short, warm and genuine
- End with exactly: "${signOff}"

${keyStrengths}${smartSnippets}

Return ONLY the template text. Use {name} exactly as the placeholder. No preamble, no explanation.`

  const userPrompt = `Write a warm, brand-aligned auto-reply template for ${name}. The guest gave 5 stars but left no text. Use {name} as the placeholder for their name. 2-3 sentences max.`

  return ai(systemPrompt, userPrompt, 300, true)
}

// ── REVENUE IMPACT (synchronous — based on Luca 2016 Harvard research) ────────
// ~9% revenue uplift per 1-star rating increase in hospitality
export function calcRevenue({ currentRating, targetRating, monthlyRevenue }) {
  const current   = parseFloat(currentRating)  || 4.0
  const target    = parseFloat(targetRating)   || 4.7
  const base      = parseFloat(monthlyRevenue) || 150000
  const gap       = Math.max(0, target - current)
  const upliftPct = gap * 9  // 9% per star (Luca 2016)
  const projected = Math.round(base * (1 + upliftPct / 100))
  const uplift    = projected - base
  const subMonthly = 149
  const roiX      = uplift > 0 ? +(uplift / subMonthly).toFixed(1) : 0
  const paybackDays= uplift > 0 ? Math.round(subMonthly / (uplift / 30)) : 0
  return {
    currentRating:           current,
    targetRating:            target,
    ratingGap:               +gap.toFixed(2),
    currentMonthlyRevenue:   Math.round(base),
    projectedMonthlyRevenue: projected,
    monthlyUplift:           uplift,
    annualUplift:            uplift * 12,
    upliftPercent:           +upliftPct.toFixed(1),
    // aliases used by RevenuePage
    monthlyGain:             uplift,
    annualGain:              uplift * 12,
    upliftPct:               +upliftPct.toFixed(1),
    roiX,
    paybackDays,
    confidence:              gap >= 0.3 ? 'HIGH' : gap >= 0.1 ? 'MEDIUM' : 'LOW',
    methodology: 'Luca, M. (2016). Reviews, Reputation, and Revenue. HBS Working Paper 12-016.',
  }
}

// ── COMPETITOR ANALYSIS ───────────────────────────────────────────────────────
export async function analyseCompetitors(property, competitors, yourRating, yourReviews, yourResponseRate) {
  const name     = property?.name || 'your property'
  const ownRating  = yourRating  || property?.platform_connections?.google?.businessInfo?.rating || '?'
  const ownReviews = yourReviews || property?.platform_connections?.google?.businessInfo?.totalReviews || '?'
  const ownRespRate= yourResponseRate !== undefined ? yourResponseRate + '%' : 'unknown'

  // Sort so AI sees the full competitive landscape
  const sorted = [...competitors].sort((a,b) => b.rating - a.rating)
  const compList = sorted.map((c,i) =>
    `#${i+1} ${c.name}: ${c.rating}★ (${(c.reviews||0).toLocaleString()} reviews)${c.distance ? ' — '+c.distance : ''}`
  ).join('\n')

  const ownRank = sorted.findIndex(c => c.name?.includes('YOU') || false)

  return ai(
    `You are a senior hospitality competitive intelligence analyst specialising in the DACH market. Be specific, direct and actionable.`,
    `Analyse the competitive position of ${name} against nearby competitors.

${name}:
- Rating: ${ownRating}★
- Reviews: ${ownReviews}
- Response rate: ${ownRespRate}

Local competitors (sorted by rating):
${compList}

Return ONLY raw JSON — no markdown, no backticks, no explanation. Exactly this:
{
  "primaryOpportunity": "Specific opportunity naming a competitor and how to act",
  "threat": "Specific threat naming a competitor and why it matters",
  "narrative": "3 sentences on competitive landscape and position",
  "quickWins": ["Concrete action 1 this week", "Concrete action 2", "Concrete action 3"],
  "competitivePosition": "LEADING",
  "ratingGap": "0.2 stars behind the leader"
}`
,
    900
  )
}

// ── WEEKLY REPORT ─────────────────────────────────────────────────────────────
export async function generateReport(property, reviews, existingRiskScore) {
  const name         = property?.name || 'your property'
  const total        = reviews.length
  const avgRating    = total ? (reviews.reduce((s,r) => s+Number(r.rating),0)/total).toFixed(1) : 0
  const unanswered   = reviews.filter(r => !r.responded).length
  const responded    = total - unanswered
  const responseRate = total ? Math.round((responded / total) * 100) : 0
  const negative     = reviews.filter(r => Number(r.rating) <= 2)
  const positive     = reviews.filter(r => Number(r.rating) >= 4)
  const fiveStar     = reviews.filter(r => Number(r.rating) === 5)

  // ── Revenue risk — calculated via HBS formula, not AI estimate ─────────────
  const monthlyRevenue = parseFloat(property?.monthly_revenue || property?.avg_revenue) || null
  const currentRating  = parseFloat(avgRating) || 4.0
  const ratingGap      = Math.max(0, 4.8 - currentRating).toFixed(1)
  const upliftPct      = (ratingGap * 9).toFixed(1)
  const revenueRiskStr = monthlyRevenue && monthlyRevenue > 0
    ? `CHF ${Math.round(monthlyRevenue * upliftPct / 100).toLocaleString()}/month — based on ${ratingGap}\u2605 gap to top performers \u00d7 9% per star (HBS, 2016)`
    : `${ratingGap}\u2605 gap to top performers — each star = ~9% more revenue. Add monthly revenue in Settings for a CHF figure.`

  // Sample of 8 recent reviews WITH text for AI context — clearly labelled as sample
  const recentSample = reviews
    .filter(r => r.text && r.text.length > 10)
    .slice(0, 8)
    .map(r => `  [${r.rating}★ | ${r.responded ? 'REPLIED' : 'NOT REPLIED'} | ${r.platform || 'google'}] "${r.text?.slice(0, 120)}"`)
    .join('\n')

  return ai(
    `You are a senior hospitality reputation analyst. Write a precise, data-driven weekly report. Use ONLY the exact numbers provided — never invent or estimate counts.`,
    `Generate the weekly reputation report for ${name}.

EXACT STATISTICS (use these numbers precisely — do not change them):
- Total reviews imported: ${total}
- Responded: ${responded} out of ${total} (${responseRate}% response rate)
- NOT responded (unanswered): ${unanswered}
- Average rating: ${avgRating}★
- Negative reviews (1-2★): ${negative.length}
- Positive reviews (4-5★): ${positive.length}
- 5-star reviews: ${fiveStar.length}

SAMPLE of recent reviews (for context only — do NOT use these to count or infer totals):
${recentSample || 'No review text available'}

IMPORTANT: The statistics above are the ground truth. Do not say "9 of 10 reviews" or similar — use the exact numbers. The response rate is ${responseRate}%, unanswered is ${unanswered} out of ${total}. The revenueRisk field is already calculated — copy it exactly as provided, do not change it.

Return ONLY valid JSON with these exact fields:
{
  "weekSummary": "3 direct sentences using the exact stats above — mention the ${responseRate}% response rate and ${avgRating}★ rating specifically",
  "riskScore": ${existingRiskScore || "<calculate 0-100 based on response rate and negative review ratio>"},
  "negativeCount": ${negative.length},
  "positiveCount": ${positive.length},
  "unansweredCount": ${unanswered},
  "responseRate": ${responseRate},
  "revenueRisk": "${revenueRiskStr}",
  "topThreats": ["specific threat based on review content", "threat 2", "threat 3"],
  "topStrengths": ["specific strength from review content", "strength 2"],
  "actions": [
    {"urgency": "urgent", "action": "specific action", "impact": "why this matters"},
    {"urgency": "this-week", "action": "action for this week", "impact": "expected outcome"},
    {"urgency": "this-month", "action": "strategic action", "impact": "long-term benefit"}
  ],
  "win": "the most positive specific thing from the sample reviews",
  "nextFocus": "one clear focus for next week"
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
