import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, KpiCard, Button, Spinner, EmptyState, SectionHeader, Stars, PlatformBadge, Tabs, RatingSelector, Textarea, Input, Divider, Alert } from '../components/UI.jsx'
import { useApp, useRiskScore, useIsMobile, useLang } from '../lib/store.jsx'
import { T, t } from '../lib/i18n.js'
import { draftResponse, generateRiskAnalysis, calcRevenue, analyseCompetitors, generateReport } from '../lib/api.js'
import { saveAiClassification, saveResponse, saveReport, supabase } from '../lib/supabase.js'

// ── REVIEWS PAGE ─────────────────────────────────────────────────────────────
export function ReviewsPage() {
  const { reviews, property, showToast, updateReviewInState } = useApp()
  const { lang } = useLang()
  const [filter, setFilter]     = useState('all')
  const [loadingMap, setLM]     = useState({})
  const [search, setSearch]     = useState('')

  const byFilter = {
    all:       reviews,
    unanswered:reviews.filter(r => !r.responded),
    negative:  reviews.filter(r => r.rating <= 2),
    neutral:   reviews.filter(r => r.rating === 3),
    positive:  reviews.filter(r => r.rating >= 4),
    flagged:   reviews.filter(r => r.ai_risk_flag),
  }

  const filtered = (byFilter[filter] || reviews).filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (r.author||'').toLowerCase().includes(q) || (r.text||'').toLowerCase().includes(q)
  })

  const stats = {
    total:      reviews.length,
    unanswered: reviews.filter(r => !r.responded).length,
    negative:   reviews.filter(r => r.rating <= 2).length,
    flagged:    reviews.filter(r => r.ai_risk_flag).length,
    avgRating:  reviews.length ? (reviews.reduce((s,r)=>s+Number(r.rating),0)/reviews.length).toFixed(1) : '—',
  }

  function setLoading(id, v) { setLM(p => ({ ...p, [id]: v })) }

  async function classify(review) {
    setLoading(review.id, 'classify')
    const { classifyReview } = await import('../lib/api.js')
    const result = await classifyReview(review)
    if (!result || result.error) { showToast('Classification failed', 'error'); setLoading(review.id, null); return }
    const { data: updated } = await saveAiClassification(review.id, result)
    if (updated) { updateReviewInState(updated); showToast('Review classified', 'success') }
    setLoading(review.id, null)
  }

  async function classifyAll() {
    const unclassified = reviews.filter(r => !r.ai_analysed_at)
    if (!unclassified.length) { showToast('All reviews already classified', 'info'); return }
    showToast(`Classifying ${unclassified.length} reviews...`, 'info')
    const { classifyReview } = await import('../lib/api.js')
    let done = 0
    for (const r of unclassified.slice(0, 20)) {
      const result = await classifyReview(r)
      if (result && !result.error) {
        const { data: updated } = await saveAiClassification(r.id, result)
        if (updated) updateReviewInState(updated)
        done++
      }
    }
    showToast(`Classified ${done} reviews`, 'success')
  }

  const TABS = [
    { id:'all',        label:t(T.inbox.all,lang),         count: stats.total },
    { id:'unanswered', label:t(T.reviewHistory.unanswered,lang), count: stats.unanswered },
    { id:'negative',   label:'⚠ '+t(T.common.riskHigh,lang), count: stats.negative },
    { id:'neutral',    label:'Neutral',      count: reviews.filter(r=>r.rating===3).length },
    { id:'positive',   label:'★ '+t(T.inbox.positive,lang), count: reviews.filter(r=>r.rating>=4).length },
    { id:'flagged',    label:'🚩 '+t(T.reviewHistory.flagged,lang), count: stats.flagged },
  ]

  return (
    <Layout
      title={t(T.reviewHistory.title, lang)}
      subtitle={`${stats.total} ${t(T.nav.reviews,lang)} · ${stats.avgRating}★ · ${stats.unanswered} ${t(T.reviewHistory.unanswered,lang)}`}
      topbarRight={
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="secondary" size="sm" onClick={classifyAll}>
            ⚡ Classify Unanalysed
          </Button>
        </div>
      }
    >
      {/* KPI strip */}
      <Grid cols={4} gap={12} style={{ marginBottom:16 }}>
        <KpiCard label={t(T.reviewHistory.totalReviews,lang)}  value={stats.total}      accent="gold" />
        <KpiCard label={t(T.reviewHistory.unanswered,lang)}     value={stats.unanswered} sub={`→ ${t(T.nav.inbox,lang)}`} accent={stats.unanswered>0?"red":"teal"} />
        <KpiCard label={t(T.reviewHistory.negative,lang)}value={stats.negative}   accent={stats.negative>0?"red":"teal"} />
        <KpiCard label={t(T.reviewHistory.flagged,lang)}   value={stats.flagged}    sub="AI identified" accent={stats.flagged>0?"red":"teal"} />
      </Grid>

      {/* Search + tabs */}
      <Card style={{ marginBottom:12 }}>
        <div style={{ display:'flex', gap:12, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(T.inbox.selectReview, lang)}
            style={{ flex:1, minWidth:200, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text1)', fontSize:'13px', outline:'none' }}
            onFocus={e => e.target.style.borderColor='var(--gold)'}
            onBlur={e => e.target.style.borderColor='var(--border)'}
          />
          {search && <Button size="sm" variant="ghost" onClick={()=>setSearch('')}>✕ Clear</Button>}
        </div>
        <div style={{ display:'flex', gap:2, overflowX:'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              style={{ padding:'6px 12px', border:'none', borderRadius:8, cursor:'pointer', fontSize:'11px', whiteSpace:'nowrap',
                fontWeight: filter===tab.id?700:400,
                background: filter===tab.id?'var(--gold)':'transparent',
                color: filter===tab.id?'var(--bg)':'var(--text3)',
                transition:'var(--ease)' }}>
              {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
            </button>
          ))}
        </div>
      </Card>

      {/* Review list */}
      {filtered.length === 0 ? (
        <Card><EmptyState icon={filter==='flagged'?'🚩':'✦'}
          title={filter==='flagged' ? t(T.reviewHistory.noFlagged,lang) : t(T.common.noData,lang)}
          description={
            filter==='flagged'
              ? t(T.reviewHistory.classifyHint,lang)
              : search ? `No reviews match "${search}"` : "No reviews in this category yet."
          }
          action={filter==='flagged' ? <Button onClick={classifyAll}>{t(T.reviewHistory.classifyBtn,lang)}</Button> : null}
        /></Card>
      ) : (
        filtered.map(review => {
          const isClassified = !!review.ai_analysed_at
          const sentimentColor = review.ai_sentiment==='positive'?'#4A7C6F':review.ai_sentiment==='negative'?'#B85C38':'var(--text3)'
          return (
            <div key={review.id} style={{ background:'var(--card)', border:`1px solid ${review.ai_risk_flag?'rgba(184,92,56,.3)':'var(--border)'}`, borderRadius:'var(--r-lg)', padding:16, marginBottom:8 }}>

              {/* Header row */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, gap:10 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center', minWidth:0 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'13px', color:'var(--text3)', flexShrink:0 }}>
                    {(review.author||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:'13px', marginBottom:2 }}>{review.author}</div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <span>{review.review_date}</span>
                      <PlatformBadge platform={review.platform} />
                      {review.responded && <span style={{ color:'#4A7C6F', fontWeight:600 }}>✓ Replied</span>}
                      {review.ai_risk_flag && <span style={{ color:'#B85C38', fontWeight:700 }}>🚩 Risk</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <Stars n={review.rating} />
                  {!isClassified && (
                    <button onClick={() => classify(review)} disabled={!!loadingMap[review.id]}
                      style={{ padding:'4px 10px', background:'rgba(201,169,110,.08)', border:'1px solid rgba(201,169,110,.2)', borderRadius:8, color:'var(--gold)', fontSize:'11px', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                      {loadingMap[review.id]==='classify' ? <Spinner size={10}/> : '⚡ Classify'}
                    </button>
                  )}
                </div>
              </div>

              {/* Review text */}
              <p style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65, marginBottom:isClassified||review.response_text?10:0 }}>
                {review.text || <em style={{ color:'var(--text3)' }}>(No text — star rating only)</em>}
              </p>

              {/* AI Classification result */}
              {isClassified && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:review.response_text?10:0 }}>
                  {review.ai_sentiment && (
                    <span style={{ fontSize:'11px', padding:'3px 9px', borderRadius:12, background:`${sentimentColor}15`, color:sentimentColor, fontWeight:600, border:`1px solid ${sentimentColor}30` }}>
                      {review.ai_sentiment}
                    </span>
                  )}
                  {review.ai_severity && (
                    <span style={{ fontSize:'11px', padding:'3px 9px', borderRadius:12, background:'var(--surface)', color:'var(--text3)', border:'1px solid var(--border)' }}>
                      {review.ai_severity} severity
                    </span>
                  )}
                  {(review.ai_categories||[]).map(c => (
                    <span key={c} style={{ fontSize:'11px', padding:'3px 9px', borderRadius:12, background:'var(--surface)', color:'var(--text3)', border:'1px solid var(--border)' }}>{c}</span>
                  ))}
                  {review.ai_summary && (
                    <span style={{ fontSize:'11px', color:'var(--text3)', fontStyle:'italic', alignSelf:'center', marginLeft:4 }}>{review.ai_summary}</span>
                  )}
                </div>
              )}

              {/* Existing response */}
              {review.response_text && (
                <div style={{ background:'var(--surface)', border:'1px solid rgba(201,169,110,.15)', borderRadius:8, padding:'10px 12px', fontSize:'13px', color:'var(--text2)', lineHeight:1.6, fontStyle:'italic', borderLeft:'3px solid var(--gold)', marginBottom:8 }}>
                  "{review.response_text}"
                </div>
              )}

              {/* Actions */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop: (isClassified || review.response_text) ? 8 : 0 }}>
                {!review.responded && (
                  <Button size="sm" variant="secondary" onClick={() => window.location.href='/inbox'}>
                    ✍ Reply in Inbox →
                  </Button>
                )}
                {review.response_text && (
                  <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(review.response_text).then(()=>showToast('Copied!','success'))}>
                    📋 Copy Response
                  </Button>
                )}
              </div>
            </div>
          )
        })
      )}
    </Layout>
  )
}

// ── RESPOND PAGE ──────────────────────────────────────────────────────────────
export function RespondPage() {
  const { reviews, property, showToast } = useApp()
  const [text, setText]     = useState('')
  const [rating, setRating] = useState(3)
  const [platform, setPlatform] = useState('google')
  const [tone, setTone]     = useState('professional')
  const [response, setResponse] = useState('')
  const [approach, setApproach] = useState('')
  const [loading, setLoading]   = useState(false)

  async function generate() {
    if (!text.trim()) return
    setLoading(true); setResponse(''); setApproach('')
    const r = await draftResponse({ text, rating, platform, author: 'Guest' }, property, tone)
    if (r.error) showToast('AI error. Please check your API key.', 'error')
    else { setResponse(r.response || r.raw || ''); setApproach(r.approach || '') }
    setLoading(false)
  }

  const unanswered = reviews.filter(r => !r.responded)

  return (
    <Layout title="AI Respond" subtitle={t(T.respondPage.pasteHint, lang)}>
      <Grid cols={2} gap={18} style={{ alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card>
            <SectionHeader title={t(T.respondPage.reviewInput, lang)} />
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', fontWeight:600, marginBottom:8 }}>Platform</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['google','tripadvisor','booking','instagram','facebook'].map(p => (
                  <button key={p} onClick={()=>setPlatform(p)}
                    style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${platform===p?'var(--gold)':'var(--border)'}`, background:platform===p?'rgba(201,169,110,.08)':'transparent', color:platform===p?'var(--gold)':'var(--text3)', fontSize:'12px', cursor:'pointer', fontWeight:platform===p?600:400, transition:'var(--ease)', textTransform:'capitalize' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', fontWeight:600, marginBottom:8 }}>Star Rating</div>
              <RatingSelector value={rating} onChange={setRating} />
            </div>
            <Textarea label={t(T.respondPage.reviewText, lang)} value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the guest review here..." rows={5} />
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', fontWeight:600, marginBottom:8 }}>Tone</div>
              <div style={{ display:'flex', gap:6 }}>
                {['professional','empathetic','concise'].map(t => (
                  <Button key={t} variant={tone===t?'secondary':'ghost'} size="sm" onClick={()=>setTone(t)} style={{ textTransform:'capitalize' }}>{t}</Button>
                ))}
              </div>
            </div>
            <Button fullWidth onClick={generate} disabled={loading||!text.trim()} style={{ marginTop:16 }}>
              {loading ? <><Spinner /> Generating...</> : '✨ Generate AI Response'}
            </Button>
          </Card>

          {unanswered.length > 0 && (
            <Card>
              <SectionHeader title={t(T.respondPage.unanswered, lang)} subtitle="" />
              {unanswered.slice(0,5).map(r => (
                <button key={r.id} onClick={()=>{setText(r.text);setRating(r.rating);setPlatform(r.platform?.toLowerCase()||'google');setResponse('');setApproach('')}}
                  style={{ display:'block', width:'100%', textAlign:'left', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', cursor:'pointer', marginBottom:8, transition:'var(--ease)' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--gold)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:'12px', fontWeight:600 }}>{r.author}</span>
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}><Stars n={r.rating} size="11px" /><PlatformBadge platform={r.platform} /></div>
                  </div>
                  <div style={{ fontSize:'12px', color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.text}</div>
                </button>
              ))}
            </Card>
          )}
        </div>

        <Card>
          <SectionHeader title={t(T.inbox.aiBrandVoice, lang)} />
          {!response && !loading && <EmptyState icon="✍" title={t(T.respondPage.responseHere, lang)} description="Enter a review and click Generate" />}
          {loading && <div style={{ padding:'48px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}><Spinner size={24} /><div style={{ color:'var(--gold)', fontSize:'13px' }}>Crafting your response...</div></div>}
          {response && <>
            <div style={{ background:'var(--surface)', borderRadius:10, padding:18, fontSize:'14px', color:'var(--text1)', lineHeight:1.8, fontStyle:'italic', borderLeft:'3px solid var(--gold)', marginBottom:14 }}>
              "{response}"
            </div>
            {approach && <div style={{ background:'rgba(201,169,110,.04)', border:'1px solid rgba(201,169,110,.12)', borderRadius:8, padding:'10px 14px', fontSize:'12px', color:'var(--text3)', marginBottom:14 }}><strong style={{ color:'var(--gold)' }}>Strategy:</strong> {approach}</div>}
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <Button onClick={()=>{navigator.clipboard?.writeText(response);showToast('✓ Copied to clipboard!','success')}} style={{ flex:1 }}>📋 Copy to Clipboard</Button>
              <Button variant="ghost" onClick={generate}>↻</Button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, fontSize:'12px' }}>
              {['✓ GDPR compliant','✓ Brand voice applied','✓ Non-defensive tone'].map(b=>(
                <span key={b} style={{ background:'rgba(74,124,111,.06)', border:'1px solid rgba(74,124,111,.15)', borderRadius:20, padding:'2px 8px', color:'#4A7C6F' }}>{b}</span>
              ))}
            </div>
          </>}
        </Card>
      </Grid>
    </Layout>
  )
}

// ── RISK PAGE ─────────────────────────────────────────────────────────────────
function rC(s) { return s>=80?'#B85C38':s>=55?'#C9A96E':'#4A7C6F' }

export function RiskPage() {
  const { reviews, property, showToast } = useApp()
  const { lang } = useLang()
  const [analysis,  setAnalysis]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  const [sevenDay,  setSevenDay]  = useState(null)
  const score = useRiskScore(reviews)

  const COMPONENTS = [
    { key:'ratingVolatility',   label:'Rating Volatility',    score:analysis?.components?.ratingVolatility?.score   || Math.min(score+5,100), detail:analysis?.components?.ratingVolatility?.detail   || 'Based on recent review trends' },
    { key:'responseGap',        label:'Response Gap',         score:analysis?.components?.responseGap?.score        || Math.max(score-10,0),  detail:analysis?.components?.responseGap?.detail        || `${reviews.filter(r=>!r.responded).length} reviews unanswered` },
    { key:'complianceRisk',     label:'Compliance Risk',      score:analysis?.components?.complianceRisk?.score     || 20,                    detail:analysis?.components?.complianceRisk?.detail     || 'No major compliance issues detected' },
    { key:'sentimentTrend',     label:'Sentiment Trend',      score:analysis?.components?.sentimentTrend?.score     || score,                 detail:analysis?.components?.sentimentTrend?.detail     || 'Based on recent review sentiment' },
    { key:'competitorPressure', label:'Competitor Pressure',  score:analysis?.components?.competitorPressure?.score || 35,                   detail:analysis?.components?.competitorPressure?.detail || 'Local market competition' },
  ]
  const radarData = COMPONENTS.map(c => ({ subject: c.label.split(' ')[0], score: c.score }))

  async function run() {
    setLoading(true)
    setSevenDay(null) // reset plan when re-running analysis
    const r = await generateRiskAnalysis(reviews, property)
    if (r.error) showToast('AI error. Please try again.', 'error')
    else setAnalysis(r)
    setLoading(false)
  }

  async function generate7DayPlan() {
    if (!analysis) return
    setPlanLoading(true)

    // ── Build rich business context from everything we know ─────────────────
    const totalReviews    = reviews.length
    const unanswered      = reviews.filter(r => !r.responded).length
    const responseRate    = totalReviews ? Math.round((totalReviews - unanswered) / totalReviews * 100) : 0
    const avgRating       = totalReviews ? (reviews.reduce((s,r) => s + Number(r.rating), 0) / totalReviews).toFixed(1) : 0
    const negativeReviews = reviews.filter(r => Number(r.rating) <= 2)
    const recentNeg       = negativeReviews.slice(0, 8)
    const platforms       = [...new Set(reviews.map(r => r.platform).filter(Boolean))].join(', ')
    const propertyType    = property?.ai_profile?.propertyType || 'hotel'
    const city            = property?.address || property?.city || ''
    const brandVoice      = property?.ai_profile?.brandVoice || ''
    const snippets        = property?.ai_profile?.smartSnippets || []

    // Sample of recent negative reviews for real context
    const negSample = recentNeg.map(r =>
      `  ${r.rating}★ (${r.platform || 'google'}) by ${r.author || 'Guest'}: "${(r.text || '').slice(0, 150)}"`
    ).join('\n')

    // All risk component details
    const allComponents = COMPONENTS
      .sort((a,b) => b.score - a.score)
      .map(c => `  ${c.label}: ${c.score}/100 — ${c.detail}`)
      .join('\n')

    const prompt = `You are a senior hospitality reputation consultant generating a personalised 7-day improvement plan.

PROPERTY PROFILE:
- Name: ${property?.name || 'This property'}
- Type: ${propertyType}
- Location: ${city}
- Platforms active: ${platforms || 'Google, TripAdvisor'}
- Brand voice: ${brandVoice ? brandVoice.slice(0, 200) : 'Professional hospitality'}
- Property facts: ${snippets.length ? snippets.join(', ') : 'Not specified'}

CURRENT REPUTATION DATA:
- Total reviews imported: ${totalReviews}
- Average rating: ${avgRating}★
- Unanswered reviews: ${unanswered} (${100 - responseRate}% left without reply)
- Response rate: ${responseRate}%
- Negative reviews (1-2★): ${negativeReviews.length}

RISK ANALYSIS RESULTS:
- Overall Risk Score: ${score}/100 (${score >= 80 ? 'HIGH RISK' : score >= 55 ? 'MODERATE' : 'STABLE'})
- AI Summary: ${analysis.summary || analysis.topIssue || analysis.executiveSummary || ''}
- Top threats identified: ${(analysis.topThreats || []).join('; ')}
- Key strengths: ${(analysis.topStrengths || []).join('; ')}

RISK VECTOR BREAKDOWN (higher score = worse):
${allComponents}

SAMPLE OF RECENT NEGATIVE REVIEWS (what real guests said):
${negSample || '  No negative reviews in recent data'}

TASK: Generate a concrete, personalised 7-day action plan for the GM and team to improve the specific risks above. 
- Each action must be specific to THIS property based on the real guest feedback above
- Reference specific issues from the negative reviews where relevant  
- Assign the right team member for each task
- Focus on the highest-scoring risk vectors first
- Day 1-2: urgent actions (respond to negative reviews, fix immediate issues)
- Day 3-4: operational improvements
- Day 5-6: team training or process changes
- Day 7: review and measure progress

Return ONLY valid JSON:
{
  "days": [
    { "day": "Day 1", "focus": "one-word focus", "action": "specific concrete action referencing actual issues from the reviews", "who": "GM / Front Desk / Restaurant Manager / Housekeeping / F&B Manager / etc", "impact": "which risk vector this improves and by how much" },
    { "day": "Day 2", "focus": "...", "action": "...", "who": "...", "impact": "..." },
    { "day": "Day 3", "focus": "...", "action": "...", "who": "...", "impact": "..." },
    { "day": "Day 4", "focus": "...", "action": "...", "who": "...", "impact": "..." },
    { "day": "Day 5", "focus": "...", "action": "...", "who": "...", "impact": "..." },
    { "day": "Day 6", "focus": "...", "action": "...", "who": "...", "impact": "..." },
    { "day": "Day 7", "focus": "...", "action": "...", "who": "...", "impact": "..." }
  ]
}`

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          system: 'You are a hotel reputation consultant. Return only valid JSON, no markdown, no backticks.',
          messages: [{ role: 'user', content: prompt }],
        })
      })
      const data = await res.json()
      const text = (data.content?.map(b => b.text||'').join('') || '').replace(/```json|```/g,'').trim()
      const parsed = JSON.parse(text)
      setSevenDay(parsed.days || [])
    } catch(e) {
      showToast('Could not generate plan. Please try again.', 'error')
    }
    setPlanLoading(false)
  }

  return (
    <Layout title={t(T.nav.risk, lang)} subtitle={t(T.risk.subtitle, lang)}
      topbarRight={<Button onClick={run} disabled={loading}>{loading?<><Spinner/>{t(T.common.generating,lang)}</>:'⚡ '+t(T.risk.generate,lang)}</Button>}
    >
      {/* ── Row 1: Score + Radar ───────────────────────────────────────────── */}
      <Grid cols={2} gap={16} style={{ marginBottom:16 }}>
        <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:10 }}>{t(T.report.riskScore, lang)}</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'5rem', color:rC(score), lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:'11px', fontWeight:700, color:rC(score), letterSpacing:'2px', marginTop:8 }}>{score>=80?t(T.common.riskHigh,lang):score>=55?t(T.common.riskModerate,lang):t(T.common.riskStable,lang)}</div>
          <div style={{ width:'100%', height:8, background:'var(--surface)', borderRadius:4, margin:'18px 0 6px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${score}%`, background:rC(score), borderRadius:4, transition:'width 1s ease' }} />
          </div>
          {!analysis && !loading && (
            <div style={{ marginTop:16, fontSize:'12px', color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
              This is your baseline score. Click <strong style={{ color:'var(--gold)' }}>Generate Risk Analysis</strong> above for a full AI breakdown.
            </div>
          )}
          {analysis && (
            <div style={{ marginTop:16, fontSize:'12px', color:'var(--text2)', textAlign:'center', lineHeight:1.6, borderTop:'1px solid var(--border)', paddingTop:14, width:'100%' }}>
              {analysis.summary || analysis.topIssue || ''}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader title={t(T.riskPage.riskRadar, lang)} subtitle="5-vector risk overview" />
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top:10,right:20,bottom:10,left:20 }}>
              <PolarGrid stroke="rgba(255,255,255,.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill:'var(--text3)', fontSize:10 }} />
              <Radar name="Risk" dataKey="score" stroke="#B85C38" fill="#B85C38" fillOpacity={0.1} strokeWidth={1.5} />
              <Tooltip formatter={v=>[`${v}`,'Score']} contentStyle={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, fontSize:'12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      {/* ── Row 2: Component Breakdown ─────────────────────────────────────── */}
      <Card style={{ marginBottom:16 }}>
        <SectionHeader title={t(T.riskPage.breakdown, lang)} subtitle={analysis ? 'Based on AI analysis of your reviews' : 'Baseline estimate — run analysis for AI breakdown'} />
        {COMPONENTS.map((c, i) => (
          <div key={c.key} style={{ display:'grid', gridTemplateColumns:'180px 160px 1fr', gap:16, alignItems:'center', padding:'12px 0', borderBottom:i<COMPONENTS.length-1?'1px solid var(--border)':'none' }}>
            <div style={{ fontSize:'13px', fontWeight:500 }}>{c.label}</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:6, background:'var(--surface)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${c.score}%`, background:rC(c.score), borderRadius:3 }} />
              </div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:700, color:rC(c.score), width:28, textAlign:'right' }}>{c.score}</div>
            </div>
            <div style={{ fontSize:'12px', color:'var(--text3)', lineHeight:1.5 }}>{c.detail}</div>
          </div>
        ))}
      </Card>

      {/* ── Row 3: 7-Day Plan — only shown after analysis ──────────────────── */}
      {analysis && (
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700, color:'var(--text1)', marginBottom:2 }}>7-Day Improvement Plan</div>
              <div style={{ fontSize:'12px', color:'var(--text3)' }}>Based on your risk analysis — specific actions for your team this week</div>
            </div>
            {!sevenDay && (
              <Button onClick={generate7DayPlan} disabled={planLoading} variant="secondary">
                {planLoading ? <><Spinner /> Generating plan...</> : '📋 Generate 7-Day Plan'}
              </Button>
            )}
            {sevenDay && (
              <Button onClick={generate7DayPlan} disabled={planLoading} variant="secondary" size="sm">
                {planLoading ? <Spinner /> : '↺ Regenerate'}
              </Button>
            )}
          </div>

          {planLoading && (
            <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--gold)', fontSize:'13px', padding:'16px 0' }}>
              <Spinner /> Building your personalised 7-day plan based on the risk analysis...
            </div>
          )}

          {!sevenDay && !planLoading && (
            <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text3)', fontSize:'13px', lineHeight:1.8 }}>
              Click <strong style={{ color:'var(--gold)' }}>Generate 7-Day Plan</strong> to get specific daily actions for your team to improve the risks identified above.
              <br/>Each action is tailored to your actual scores — not generic advice.
            </div>
          )}

          {sevenDay && sevenDay.map((step, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 1fr auto', gap:14, alignItems:'start', padding:'14px 0', borderBottom:i<sevenDay.length-1?'1px solid var(--border)':'none' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'var(--gold)', textTransform:'uppercase', letterSpacing:'1px', paddingTop:2 }}>{step.day}</div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text1)', marginBottom:4 }}>{step.action}</div>
                <div style={{ fontSize:'12px', color:'var(--text3)', lineHeight:1.55 }}>{step.impact}</div>
              </div>
              <div style={{ fontSize:'11px', color:'var(--text3)', background:'var(--surface)', borderRadius:6, padding:'4px 8px', whiteSpace:'nowrap', flexShrink:0 }}>{step.who}</div>
            </div>
          ))}
        </Card>
      )}
    </Layout>
  )
}

// ── REVENUE PAGE ──────────────────────────────────────────────────────────────
const T2 = ({ active, payload, label }) => !active||!payload?.length?null:(
  <div style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:'12px' }}>
    <div style={{ color:'var(--text3)', marginBottom:2 }}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{ color:p.color, fontWeight:600 }}>CHF {(p.value||0).toLocaleString()}</div>)}
  </div>
)

export function RevenuePage() {
  const { property, reviews } = useApp()
  const { lang } = useLang()
  const [appts, setAppts]   = useState(property?.monthly_covers || 300)
  const [rev, setRev]       = useState(property?.avg_revenue || property?.monthly_revenue || 50000)
  const [target, setTarget] = useState(property?.target_rating || 4.7)
  const [result, setResult] = useState(null)
  // Use real average from imported reviews, fall back to Google business info
  const currentRating = reviews?.length
    ? +(reviews.reduce((s,r) => s+r.rating,0)/reviews.length).toFixed(2)
    : property?.platform_connections?.google?.businessInfo?.rating || 4.3

  function calculate() {
    setResult(calcRevenue({ currentRating, targetRating: target, monthlyRevenue: rev }))
  }

  const chartData = result ? [
    { name:'Current',   value: result.currentMonthlyRevenue,   fill:'var(--text3)' },
    { name:'Projected', value: result.projectedMonthlyRevenue, fill:'var(--gold)' },
  ] : []

  return (
    <Layout title={t(T.nav.revenue, lang)} subtitle={t(T.revenue.subtitle, lang)}
      topbarRight={<Button onClick={calculate}>◆ {t(T.revenue.calculate, lang)}</Button>}
    >
      <Card style={{ marginBottom:18 }}>
        <SectionHeader title={t(T.revenue.calculate, lang)} subtitle={t(T.revenue.calculate, lang)} />
        <Grid cols={4} gap={16}>
          <Input label={t(T.revenue.monthlyRevenue, lang)} type="number" value={rev} onChange={e=>setRev(+e.target.value)} prefix="CHF" />
          <Input label={t(T.revenue.guests, lang)} type="number" value={appts} onChange={e=>setAppts(+e.target.value)} />
          <div>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', fontWeight:600, marginBottom:7 }}>{t(T.revenue.currentRating, lang)}</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.2rem', color:'var(--gold)' }}>{currentRating}★</div>
          </div>
          <Input label={t(T.revenue.targetRating, lang)} type="number" value={target} onChange={e=>setTarget(+e.target.value)} step="0.1" min="4" max="5" suffix="★" />
        </Grid>
      </Card>

      {!result && <Card><EmptyState icon="◆" title={t(T.revenue.ready, lang)} description={`${t(T.revenue.calculate,lang)}: ${currentRating}★ → ${target}★`} action={<Button onClick={calculate}>{t(T.revenue.calculateNow, lang)}</Button>} /></Card>}

      {result && <>
        <Grid cols={4} gap={14} style={{ marginBottom:18 }}>
          <KpiCard label={t(T.revenuePage.monthlyGain, lang)} value={`+CHF ${result.monthlyGain.toLocaleString()}`} sub="extra per month at target rating" accent="gold" />
          <KpiCard label={t(T.revenuePage.annualGain, lang)}  value={`+CHF ${result.annualGain.toLocaleString()}`}  sub="extra per year at target rating"  accent="emerald" />
          <KpiCard label={t(T.revenuePage.roiLabel, lang)}          value={`${result.roiX}×`}                            sub={`Payback in ${result.paybackDays} days`} accent="teal" />
          <KpiCard label={t(T.revenuePage.ratingClose, lang)}      value={`${result.ratingGap}★`}                         sub={`${result.upliftPct}% projected uplift`} accent="violet" />
        </Grid>
        <Grid cols={2} gap={16}>
          <Card>
            <SectionHeader title={t(T.revenuePage.comparison, lang)} subtitle="Monthly CHF" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top:10,right:10,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="name" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<T2 />} />
                <Bar dataKey="value" radius={[6,6,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <SectionHeader title={t(T.revenuePage.breakdown, lang)} />
            <div style={{ background:'var(--surface)', borderRadius:8, padding:'12px 14px', fontSize:'13px', color:'var(--text2)', lineHeight:1.7, borderLeft:'3px solid var(--gold)', marginBottom:14 }}>
              Improving from {currentRating}★ to {target}★ ({result.ratingGap}★ gap) = {result.upliftPct}% revenue uplift. Based on HBS research: each full star improvement drives ~9% more revenue.
            </div>
            {[
              ['Current monthly revenue',   `CHF ${result.currentMonthlyRevenue.toLocaleString()}`],
              ['Projected monthly revenue',  `CHF ${result.projectedMonthlyRevenue.toLocaleString()}`],
              ['Monthly gain',               `+CHF ${result.monthlyGain.toLocaleString()}`],
              ['Annual gain',                `+CHF ${result.annualGain.toLocaleString()}`],
              ['ReplyIQ subscription',       'CHF 149/month'],
              ['Net monthly gain after sub', `+CHF ${(result.monthlyGain - 149).toLocaleString()}`],
              ['ROI',                        `${result.roiX}× return on CHF 149`],
              ['Confidence',                 result.confidence],
            ].map(([l,v],i,arr)=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', fontSize:'13px' }}>
                <span style={{ color:'var(--text3)' }}>{l}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:i>=2&&i<=5?'var(--gold)':'var(--text1)' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:12, fontSize:'11px', color:'var(--text3)' }}>Luca, M. (2016). Reviews, Reputation, and Revenue. HBS Working Paper 12-016.</div>
          </Card>
        </Grid>
      </>}
    </Layout>
  )
}

// ── COMPETITORS PAGE ─────────────────────────────────────────────────────────
export function CompetitorsPage() {
  const { property, reviews, competitors, showToast, loadAll } = useApp()
  const { lang } = useLang()
  const [analysis,  setAnalysis]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [syncing,   setSyncing]   = useState(false)
  const [searchQ,   setSearchQ]   = useState('')
  const [searching, setSearching] = useState(false)
  const [searchRes, setSearchRes] = useState([])
  const [adding,    setAdding]    = useState(null) // place_id being added
  const isMobile = useIsMobile()

  // Your real rating from imported reviews
  const yourRating = reviews?.length
    ? +(reviews.reduce((s,r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)
    : property?.platform_connections?.google?.businessInfo?.rating || 0
  const yourReviews = property?.platform_connections?.google?.businessInfo?.totalReviews || reviews?.length || 0
  const yourUnanswered = reviews?.filter(r => !r.responded).length || 0
  const yourResponseRate = reviews?.length ? Math.round(((reviews.length - yourUnanswered) / reviews.length) * 100) : 0

  // Build full list including self, sorted by rating
  const you = { name: property?.name || 'Your Property', rating: yourRating, reviews: yourReviews, isYou: true }
  const allProps = [you, ...competitors].sort((a,b) => b.rating - a.rating)
  const yourRank = allProps.findIndex(p => p.isYou) + 1
  const leader   = allProps[0]
  const ratingGapToLeader = yourRank === 1 ? 0 : +(leader.rating - yourRating).toFixed(1)
  const aboveYou = allProps.filter(p => !p.isYou && p.rating > yourRating).length
  const belowYou = allProps.filter(p => !p.isYou && p.rating < yourRating).length

  async function sync() {
    const placeId = property?.platform_connections?.google?.identifier || property?.google_place_id
    if (!placeId) { showToast('Connect Google Business first on the Platforms page', 'error'); return }
    setSyncing(true)
    try {
      const profile      = property?.ai_profile || {}
      const nameL        = (property?.name || '').toLowerCase()
      const descL        = (profile.responsePersonality || profile.brandTone || '').toLowerCase()
      const isRestaurant = ['restaurant','ristorante','bistro','brasserie','trattoria','café','cafe','bar','grill','kitchen','dining','pizzeria','sushi','thai','indian','chinese','italian','mexican','french'].some(w => nameL.includes(w) || descL.includes(w))

      // Before deleting, save current ratings so we can calculate trend
      const { data: oldComps } = await supabase.from('competitors').select('place_id,rating').eq('clinic_id', property.id)
      const oldRatings = {}
      ;(oldComps || []).forEach(c => { oldRatings[c.place_id] = c.rating })

      const r = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          clinicName:   property.name,
          propertyType: isRestaurant ? 'restaurant' : 'hotel',
          starLevel:    property?.platform_connections?.google?.businessInfo?.rating || null,
          city:         profile.city || property?.platform_connections?.google?.businessInfo?.address?.split(',').pop()?.trim() || '',
          brandTone:    profile.brandTone || '',
          industry:     profile.industry  || '',
        })
      })

      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        showToast('Sync error: ' + (err.error || r.status), 'error')
        setSyncing(false); return
      }

      const data = await r.json()
      if (data.error) { showToast('API error: ' + data.error, 'error'); setSyncing(false); return }
      const list = data.competitors || []
      if (list.length === 0) { showToast('No competitors found. Check your Google Places API key in Vercel.', 'error'); setSyncing(false); return }

      // Calculate real trend vs previous sync
      const rows = list.map(c => {
        const prev = oldRatings[c.place_id]
        const trendVal = prev !== undefined ? +(c.rating - prev).toFixed(1) : null
        const trend = trendVal === null ? '0' : trendVal > 0 ? '+' + trendVal : trendVal < 0 ? String(trendVal) : '0'
        return { clinic_id: property.id, name: c.name, rating: c.rating, reviews: c.reviews, place_id: c.place_id, trend }
      })

      await supabase.from('competitors').delete().eq('clinic_id', property.id)
      const { error: insertErr } = await supabase.from('competitors').insert(rows)
      if (insertErr) { showToast('Save failed: ' + insertErr.message, 'error'); setSyncing(false); return }

      await loadAll(true)
      showToast(`Synced ${list.length} nearby competitors`, 'success')
    } catch(e) { showToast('Sync failed: ' + e.message, 'error') }
    setSyncing(false)
  }

  async function runAnalysis() {
    if (!competitors?.length) { showToast('Sync competitors first', 'error'); return }
    setLoading(true)
    try {
      const r = await analyseCompetitors(property, competitors, yourRating, yourReviews, yourResponseRate)
      if (!r) { showToast('No response from AI', 'error') }
      else if (r.error) { showToast('AI error: ' + r.error, 'error') }
      else if (r.raw) {
        try {
          const clean = r.raw.replace(/```json\n?|```/g, '').trim()
          const parsed = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1))
          setAnalysis(parsed)
        } catch { showToast('Could not parse AI response. Please try again.', 'error') }
      }
      else if (r.primaryOpportunity || r.narrative || r.quickWins) { setAnalysis(r) }
      else { showToast('Unexpected AI format. Please try again.', 'error') }
    } catch(e) { showToast('AI benchmark failed: ' + e.message, 'error') }
    setLoading(false)
  }

  async function searchCompetitor() {
    if (!searchQ.trim()) return
    const placeId = property?.platform_connections?.google?.identifier
    if (!placeId) { showToast('Connect Google Business first', 'error'); return }
    setSearching(true)
    setSearchRes([])
    try {
      const r = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          clinicName:  property.name,
          propertyType: 'search',
          searchQuery:  searchQ.trim(),
        })
      })
      const data = await r.json()
      if (data.error) { showToast('Search error: ' + data.error, 'error'); setSearching(false); return }
      // Filter out ones already in the list
      const existingIds = new Set(competitors.map(c => c.place_id).filter(Boolean))
      const fresh = (data.competitors || []).filter(c => !existingIds.has(c.place_id) && c.name?.toLowerCase() !== property.name?.toLowerCase())
      setSearchRes(fresh.slice(0, 8))
      if (fresh.length === 0) showToast('No new results. Try a different search term.', 'info')
    } catch(e) { showToast('Search failed: ' + e.message, 'error') }
    setSearching(false)
  }

  async function addCompetitor(comp) {
    setAdding(comp.place_id)
    const row = { clinic_id: property.id, name: comp.name, rating: comp.rating, reviews: comp.reviews, place_id: comp.place_id, trend: '0' }
    const { error } = await supabase.from('competitors').insert([row])
    if (error) { showToast('Could not add: ' + error.message, 'error') }
    else {
      await loadAll(true)
      setSearchRes(prev => prev.filter(c => c.place_id !== comp.place_id))
      showToast(`Added ${comp.name}`, 'success')
    }
    setAdding(null)
  }

  const maxRating = 5
  const ratingBarW = (rating) => `${Math.round((rating / maxRating) * 100)}%`
  const ratingColor = (p) => {
    if (p.isYou) return 'var(--gold)'
    if (p.rating > yourRating) return '#B85C38'
    if (p.rating < yourRating) return '#4A7C6F'
    return 'var(--text3)'
  }

  return (
    <Layout
      title={t(T.nav.competitors, lang)}
      subtitle={t(T.competitors.subtitle, lang)}
      topbarRight={
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="secondary" onClick={sync} disabled={syncing}>
            {syncing ? <><Spinner/>Syncing...</> : '⟳ Sync'}
          </Button>
          <Button onClick={runAnalysis} disabled={loading || !competitors?.length}>
            {loading ? <><Spinner/>Analysing...</> : '⊞ AI Benchmark'}
          </Button>
        </div>
      }
    >

      {/* ── Market Position Summary ── */}
      {competitors.length > 0 && (
        <Grid cols={isMobile?2:4} gap={12} style={{ marginBottom:16 }}>
          <KpiCard
            label={t(T.competitorsExtra.yourRank, lang)}
            value={`#${yourRank} of ${allProps.length}`}
            sub={yourRank === 1 ? 'Market leader' : `${aboveYou} above you`}
            accent={yourRank === 1 ? 'teal' : yourRank <= 3 ? 'gold' : 'red'}
          />
          <KpiCard
            label={t(T.competitorsExtra.ratingGap, lang)}
            value={ratingGapToLeader === 0 ? 'Leading' : `-${ratingGapToLeader}★`}
            sub={ratingGapToLeader === 0 ? 'You are #1' : `vs ${leader.name?.split(' ')[0]}`}
            accent={ratingGapToLeader === 0 ? 'teal' : ratingGapToLeader <= 0.2 ? 'gold' : 'red'}
          />
          <KpiCard
            label={t(T.competitorsExtra.yourRating, lang)}
            value={`${yourRating}★`}
            sub={`${yourResponseRate}% response rate`}
            accent="gold"
          />
          <KpiCard
            label={t(T.competitorsExtra.reviewCount, lang)}
            value={yourReviews.toLocaleString()}
            sub={`vs avg ${Math.round(competitors.reduce((s,c)=>s+(c.reviews||0),0)/Math.max(competitors.length,1)).toLocaleString()} competitors`}
            accent="teal"
          />
        </Grid>
      )}

      {/* ── Competitor List ── */}
      <Card style={{ marginBottom:16 }}>
        <SectionHeader title={t(T.competitorsExtra.localMarket, lang)} subtitle={`${allProps.length} ${t(T.competitors.property,lang)} · ${t(T.competitors.sortedBy,lang)}`} />

        {/* Manual search */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchCompetitor()}
            placeholder={t(T.competitors.sync, lang)}
            style={{ flex:1, minWidth:180, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text1)', fontSize:'13px', outline:'none' }}
            onFocus={e => e.target.style.borderColor = 'var(--gold)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <Button variant="secondary" size="sm" onClick={searchCompetitor} disabled={searching || !searchQ.trim()}>
            {searching ? <><Spinner size={12}/>Searching...</> : '🔍 Search'}
          </Button>
          {searchQ && <Button variant="ghost" size="sm" onClick={() => { setSearchQ(''); setSearchRes([]) }}>✕</Button>}
        </div>

        {/* Search results */}
        {searchRes.length > 0 && (
          <div style={{ marginBottom:14, background:'var(--surface)', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
            <div style={{ padding:'8px 14px', fontSize:'11px', color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'1px', borderBottom:'1px solid var(--border)' }}>
              Search results — click + to add
            </div>
            {searchRes.map(r => (
              <div key={r.place_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:2 }}>{r.rating}★ · {(r.reviews||0).toLocaleString()} reviews · {r.address}</div>
                </div>
                <button onClick={() => addCompetitor(r)} disabled={adding === r.place_id}
                  style={{ width:28, height:28, borderRadius:'50%', background:'rgba(201,169,110,.1)', border:'1px solid rgba(201,169,110,.3)', color:'var(--gold)', fontSize:'16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700 }}>
                  {adding === r.place_id ? <Spinner size={11}/> : '+'}
                </button>
              </div>
            ))}
          </div>
        )}

        {competitors.length === 0 ? (
          <div style={{ padding:'28px 14px', textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:12 }}>⊞</div>
            <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text1)', marginBottom:6 }}>No competitors synced yet</div>
            <div style={{ fontSize:'13px', color:'var(--text3)', marginBottom:4 }}>Click "Sync" to find nearby hotels and restaurants on Google.</div>
            <div style={{ fontSize:'11px', color:'var(--text3)', opacity:0.6 }}>Requires GOOGLE_PLACES_KEY in Vercel environment variables.</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {allProps.map((p, i) => {
              const reviewDelta = p.isYou ? null : p.reviews - yourReviews
              const trendNum = p.trend ? parseFloat(p.trend) : null
              const isAbove = !p.isYou && p.rating > yourRating
              const isBelow = !p.isYou && p.rating < yourRating
              return (
                <div key={p.name + i} style={{
                  padding:'12px 14px',
                  borderBottom: i < allProps.length - 1 ? '1px solid var(--border)' : 'none',
                  background: p.isYou ? 'rgba(201,169,110,0.04)' : 'transparent',
                  borderLeft: p.isYou ? '3px solid var(--gold)' : '3px solid transparent',
                }}>
                  {/* Row 1: rank + name + rating number + delete */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{
                      width:22, height:22, borderRadius:'50%', flexShrink:0,
                      background: i===0 ? 'rgba(201,169,110,0.15)' : 'var(--surface)',
                      border: i===0 ? '1px solid var(--gold)' : '1px solid var(--border)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'10px', fontWeight:700,
                      color: i===0 ? 'var(--gold)' : 'var(--text3)',
                    }}>
                      {i+1}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:'13px', fontWeight: p.isYou ? 700 : 500, color: p.isYou ? 'var(--gold)' : 'var(--text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {p.name}{p.isYou ? ' (You)' : ''}
                        </span>
                        {isAbove && <span style={{ fontSize:'9px', background:'rgba(184,92,56,0.1)', color:'#B85C38', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>ABOVE YOU</span>}
                        {isBelow && <span style={{ fontSize:'9px', background:'rgba(74,124,111,0.1)', color:'#4A7C6F', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>BELOW YOU</span>}
                        {i===0 && !p.isYou && <span style={{ fontSize:'9px', background:'rgba(201,169,110,0.1)', color:'var(--gold)', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>LEADER</span>}
                      </div>
                    </div>
                    {/* Rating number */}
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'15px', fontWeight:700, color: ratingColor(p), flexShrink:0 }}>
                      {p.rating}★
                    </div>
                    {/* Trend */}
                    {trendNum !== null && trendNum !== 0 && (
                      <div style={{ fontSize:'11px', fontWeight:700, color: trendNum > 0 ? '#B85C38' : '#4A7C6F', flexShrink:0, minWidth:32, textAlign:'right' }}>
                        {trendNum > 0 ? '▲' : '▼'}{Math.abs(trendNum)}
                      </div>
                    )}
                    {/* Delete button — only for synced competitors, not self */}
                    {!p.isYou && (
                      <button onClick={async(e)=>{e.stopPropagation();await supabase.from('competitors').delete().eq('clinic_id',property.id).eq('name',p.name);await loadAll(true);showToast('Competitor removed','info')}}
                        style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'14px', padding:'2px 4px', flexShrink:0, lineHeight:1 }}
                        
                        onMouseEnter={e=>e.currentTarget.style.color='#B85C38'}
                        onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}>
                        ×
                      </button>
                    )}
                  </div>

                  {/* Row 2: rating bar */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:32 }}>
                    <div style={{ flex:1, height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width: ratingBarW(p.rating), height:'100%', background: ratingColor(p), borderRadius:2, transition:'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', flexShrink:0, minWidth:60, textAlign:'right' }}>
                      {(p.reviews||0).toLocaleString()} reviews
                      {reviewDelta !== null && (
                        <span style={{ color: reviewDelta > 0 ? '#B85C38' : '#4A7C6F', marginLeft:4 }}>
                          ({reviewDelta > 0 ? '+' : ''}{reviewDelta.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Trend note ── */}
      {competitors.length > 0 && competitors.every(c => !c.trend || c.trend === '0') && (
        <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:16, padding:'0 4px', fontStyle:'italic' }}>
          Rating trend will appear after your second sync. Sync again next week to see who is moving up or down.
        </div>
      )}

      {/* ── AI Benchmark Results ── */}
      {analysis && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              padding:'5px 14px', borderRadius:20, fontSize:'11px', fontWeight:700, letterSpacing:'1px',
              background: analysis.competitivePosition==='LEADING'?'rgba(74,124,111,.15)':analysis.competitivePosition==='STRONG'?'rgba(201,169,110,.12)':analysis.competitivePosition==='AVERAGE'?'rgba(90,90,130,.15)':'rgba(184,92,56,.12)',
              color: analysis.competitivePosition==='LEADING'?'#4A7C6F':analysis.competitivePosition==='STRONG'?'var(--gold)':analysis.competitivePosition==='AVERAGE'?'#8888CC':'#B85C38',
              border:'1px solid currentColor',
            }}>
              {analysis.competitivePosition || 'ANALYSED'}
            </div>
            {analysis.ratingGap && <span style={{ fontSize:'12px', color:'var(--text3)' }}>{analysis.ratingGap}</span>}
          </div>

          <Grid cols={isMobile?1:2} gap={14}>
            <Card>
              <div style={{ fontSize:'11px', color:'#4A7C6F', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:8, fontWeight:600 }}>Primary Opportunity</div>
              <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.7, marginBottom:16 }}>{analysis.primaryOpportunity}</div>
              <div style={{ fontSize:'11px', color:'#B85C38', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:8, fontWeight:600 }}>Main Threat</div>
              <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.7, marginBottom:16 }}>{analysis.threat}</div>
              <div style={{ background:'var(--surface)', borderRadius:8, padding:'13px 15px', fontSize:'13px', color:'var(--text2)', lineHeight:1.7, borderLeft:'3px solid var(--gold)' }}>{analysis.narrative}</div>
            </Card>
            <Card>
              <SectionHeader title={t(T.reportExtra.thisWeek, lang)} subtitle="" />
              {(analysis.quickWins||[]).map((win,i)=>(
                <div key={i} style={{ display:'flex', gap:12, padding:'11px 0', borderBottom:i<(analysis.quickWins||[]).length-1?'1px solid var(--border)':'none' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(201,169,110,.1)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>{i+1}</div>
                  <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.5 }}>{win}</div>
                </div>
              ))}
            </Card>
          </Grid>
        </div>
      )}
    </Layout>
  )
}

// ── REPORT PAGE ───────────────────────────────────────────────────────────────
function buildReportEmail(r, property) {
    const name = property?.name || 'Your Property'
    const date = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
    const riskColor = (r.riskScore||0) >= 70 ? '#B85C38' : (r.riskScore||0) >= 45 ? '#C9A96E' : '#4A7C6F'
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F1419;font-family:system-ui,-apple-system,sans-serif;color:#E8E4DC">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:28px">
    <div style="font-size:24px;color:#C9A96E;font-weight:700;margin-bottom:4px">ReplyIQ</div>
    <div style="font-size:13px;color:#6B7280">Weekly Intelligence Report · ${date}</div>
    <div style="font-size:18px;font-weight:600;color:#E8E4DC;margin-top:8px">${name}</div>
  </div>
  <div style="background:#1C2430;border:1px solid #2A3545;border-left:4px solid #C9A96E;border-radius:10px;padding:20px;margin-bottom:20px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C9A96E;margin-bottom:8px;font-weight:600">Executive Summary</div>
    <div style="font-size:14px;line-height:1.7;color:#C8C3BC">${r.weekSummary||''}</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:26px;font-weight:700;color:${riskColor}">${r.riskScore||0}</div>
      <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Risk Score</div>
    </div>
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:26px;font-weight:700;color:#C9A96E">${r.unansweredCount||0}</div>
      <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Unanswered</div>
    </div>
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:14px;text-align:center">
      <div style="font-size:26px;font-weight:700;color:${(r.responseRate||0)>=80?'#4A7C6F':'#B85C38'}">${r.responseRate||0}%</div>
      <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Response Rate</div>
    </div>
  </div>
  ${r.topThreats?.length ? `
  <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:20px;margin-bottom:20px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#B85C38;margin-bottom:12px;font-weight:600">Top Threats</div>
    ${r.topThreats.map(t=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #2A3545;font-size:13px"><span style="color:#B85C38">▲</span><span style="color:#C8C3BC">${t}</span></div>`).join('')}
  </div>` : ''}
  ${r.actions?.length ? `
  <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:20px;margin-bottom:20px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C9A96E;margin-bottom:12px;font-weight:600">Priority Actions</div>
    ${r.actions.map(a=>`<div style="padding:10px;border-radius:7px;margin-bottom:8px;background:rgba(201,169,110,0.05);border:1px solid rgba(201,169,110,0.1)"><div style="font-size:12px;font-weight:700;color:#C9A96E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${(a.urgency||'').replace('-',' ')}</div><div style="font-size:13px;color:#E8E4DC;font-weight:600;margin-bottom:2px">${a.action}</div><div style="font-size:12px;color:#6B7280">${a.impact}</div></div>`).join('')}
  </div>` : ''}
  ${r.win ? `
  <div style="background:rgba(74,124,111,0.07);border:1px solid rgba(74,124,111,0.2);border-radius:10px;padding:20px;margin-bottom:20px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#4A7C6F;margin-bottom:8px;font-weight:600">🏆 Win of the Week</div>
    <div style="font-size:13px;color:#C8C3BC;line-height:1.6">${r.win}</div>
  </div>` : ''}
  <div style="text-align:center;padding:20px 0;border-top:1px solid #2A3545;font-size:11px;color:#4B5563">
    Powered by ReplyIQ · Reputation Intelligence for Hospitality<br>
    <a href="https://app.replyiq.ch" style="color:#C9A96E;text-decoration:none">app.replyiq.ch</a>
  </div>
</div>
</body>
</html>`
  }

export function ReportPage() {
  const { property, reviews, showToast } = useApp()
  const isMobile = useIsMobile()
  const { lang }  = useLang()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const riskScore = useRiskScore(reviews)
  const urgC = { urgent:'#B85C38','this-week':'#C9A96E','this-month':'#5a9080' }
  const urgB = { urgent:'rgba(184,92,56,.08)','this-week':'rgba(201,169,110,.07)','this-month':'rgba(74,124,111,.07)' }

  async function generate() {
    setLoading(true)
    const r = await generateReport(property, reviews, riskScore)
    if (r.error) showToast('AI error', 'error')
    else { setReport(r); if (property?.id) await saveReport(property.id, r, r.riskScore||riskScore); showToast('Report generated!','success') }
    setLoading(false)
  }

  async function emailReport() {
    if (!report) { showToast('Generate a report first', 'error'); return }
    const to = property?.owner_email
    if (!to) { showToast('Add a report email in Settings first', 'error'); return }
    setEmailing(true)
    try {
      const html = buildReportEmail(report, property)
      const r = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `ReplyIQ Weekly Report: ${property?.name || 'Your Property'} ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`,
          html,
        })
      })
      const d = await r.json()
      if (d.success || d.skipped) showToast(`✓ Report sent to ${to}`, 'success')
      else showToast('Email failed. Check your Resend configuration.', 'error')
    } catch(e) { showToast('Email error: ' + e.message, 'error') }
    setEmailing(false)
  }



  return (
    <Layout title={t(T.nav.report, lang)} subtitle={`${t(T.report.generate,lang)} ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`}
      topbarRight={
        <div style={{ display:'flex', gap:8 }}>
          {report && (
            <Button onClick={emailReport} disabled={emailing} variant="secondary" size="sm">
              {emailing ? <><Spinner />{t(T.report.sending,lang)}</> : '✉ '+t(T.report.email,lang)}
            </Button>
          )}
          <Button onClick={generate} disabled={loading} size="sm">
            {loading?<><Spinner/>{t(T.report.generating,lang)}</>:'▤ '+t(T.report.generate,lang)}
          </Button>
        </div>
      }
    >
      {!report && !loading && <Card><EmptyState icon="▤" title={t(T.reportExtra.title, lang)} description={t(T.reportExtra.title, lang)} action={<Button size="lg" onClick={generate}>{t(T.report.generate, lang)}</Button>} /></Card>}
      {loading && <Card><div style={{ padding:48, display:'flex', alignItems:'center', gap:12, color:'var(--gold)', justifyContent:'center' }}><Spinner size={20} />{t(T.reportExtra.generating, lang)}</div></Card>}
      {report && !report.error && <>
        <Card style={{ marginBottom:16, borderLeft:'3px solid var(--gold)' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--gold)', marginBottom:8, fontWeight:600 }}>Executive Summary</div>
          <div style={{ fontSize:'14px', color:'var(--text2)', lineHeight:1.7 }}>{report.weekSummary}</div>
        </Card>
        <Grid cols={isMobile?1:2} gap={16} style={{ marginBottom:16 }}>
          <Card>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--teal)', marginBottom:12, fontWeight:600 }}>Statistics</div>
            {[
              ['Total reviews', reviews.length, 'var(--text1)'],
              ['Responded', reviews.filter(r=>r.responded).length + ' of ' + reviews.length, '#4A7C6F'],
              ['Response rate', (reviews.length ? Math.round((reviews.filter(r=>r.responded).length/reviews.length)*100) : 0) + '%', reviews.length && reviews.filter(r=>r.responded).length/reviews.length >= 0.8 ? '#4A7C6F' : '#B85C38'],
              ['Unanswered', report.unansweredCount, report.unansweredCount > 0 ? '#B85C38' : '#4A7C6F'],
              ['Negative (1-2★)', report.negativeCount, '#B85C38'],
              ['Positive (4-5★)', report.positiveCount, '#4A7C6F'],
              ['Risk score', `${report.riskScore}/100`, riskScore>60?'#B85C38':'#4A7C6F'],
              ['Revenue risk', report.revenueRisk, '#C9A96E'],
            ].map(([l,v,c],i,arr)=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, padding:'8px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', fontSize:'13px' }}>
                <span style={{ color:'var(--text3)', flexShrink:0 }}>{l}</span>
                <span style={{ fontWeight:600, color:c, textAlign:'right', lineHeight:1.5 }}>{v}</span>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'#B85C38', marginBottom:10, fontWeight:600 }}>Top Threats</div>
            {(report.topThreats||[]).map((t,i)=><div key={i} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'13px' }}><span style={{ color:'#B85C38' }}>▲</span><span style={{ color:'var(--text2)' }}>{t}</span></div>)}
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'#4A7C6F', margin:'14px 0 10px', fontWeight:600 }}>Top Strengths</div>
            {(report.topStrengths||[]).map((s,i)=><div key={i} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'13px' }}><span style={{ color:'#4A7C6F' }}>✓</span><span style={{ color:'var(--text2)' }}>{s}</span></div>)}
          </Card>
        </Grid>
        <Card style={{ marginBottom:16 }}>
          <SectionHeader title={t(T.reportExtra.priorityPlan, lang)} subtitle="Organised by urgency" />
          {(report.actions||[]).map((a,i)=>(
            <div key={i} style={{ display:'flex', gap:14, padding:12, borderRadius:8, marginBottom:8, background:urgB[a.urgency]||urgB['this-week'], border:`1px solid ${(urgC[a.urgency]||'#5a9080')}22`, alignItems:'flex-start' }}>
              <div style={{ minWidth:80, padding:'3px 8px', borderRadius:5, textAlign:'center', background:`${(urgC[a.urgency]||'#5a9080')}15`, color:urgC[a.urgency]||'#5a9080', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', flexShrink:0 }}>{a.urgency?.replace('-',' ')}</div>
              <div><div style={{ fontWeight:600, fontSize:'13px', marginBottom:3 }}>{a.action}</div><div style={{ fontSize:'12px', color:'var(--text3)' }}>{a.impact}</div></div>
            </div>
          ))}
        </Card>
        <Grid cols={isMobile?1:2} gap={16}>
          <Card><div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--gold)', marginBottom:8, fontWeight:600 }}>🏆 Win of the Week</div><div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65 }}>{report.win}</div></Card>
          <Card><div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'#5a9080', marginBottom:8, fontWeight:600 }}>→ Next Week Focus</div><div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65 }}>{report.nextFocus}</div></Card>
        </Grid>
      </>}
    </Layout>
  )
}


// ── WIDGET PAGE ───────────────────────────────────────────────────────────────
export function WidgetPage() {
  const { property } = useApp()
  const isMobile     = useIsMobile()
  const [copied, setCopied] = useState(null)
  const { lang } = useLang()
  const pid = property?.id || ''

  const snippets = [
    {
      label: lang==='de'?'Badge (empfohlen)':lang==='fr'?'Badge (recommandé)':'Badge (recommended)',
      desc:  lang==='de'?'Eine kompakte Pille mit Ihrer Bewertung. Überall auf Ihrer Website platzierbar.':lang==='fr'?'Une pastille compacte affichant votre note. À placer n\'importe où sur votre site.':'A compact pill showing your rating. Place it anywhere on your site.',
      style: 'badge',
      code: `<div id="replyiq-widget" data-property-id="${pid}" data-style="badge" data-theme="light"></div>\n<script src="https://app.replyiq.ch/widget.js" async></script>`,
    },
    {
      label: 'Card',
      desc:  lang==='de'?'Eine größere Karte mit Ihrer Bewertung, Sternen und Anzahl. Ideal für Ihre Homepage.':lang==='fr'?'Une grande carte affichant votre note, étoiles et nombre d\'avis. Idéale pour votre page d\'accueil.':'A larger card showing your rating, stars and review count. Great for your homepage.',
      style: 'card',
      code: `<div id="replyiq-widget" data-property-id="${pid}" data-style="card" data-theme="light"></div>\n<script src="https://app.replyiq.ch/widget.js" async></script>`,
    },
    {
      label: lang==='de'?'Inline Text':lang==='fr'?'Texte intégré':'Inline Text',
      desc:  lang==='de'?'Betten Sie Ihre Bewertung inline in jeden Text oder Absatz ein.':lang==='fr'?'Intégrez votre note dans n\'importe quel texte ou paragraphe.':'Embed your rating inline within any text or paragraph.',
      style: 'inline',
      code: `<span id="replyiq-widget" data-property-id="${pid}" data-style="inline"></span>\n<script src="https://app.replyiq.ch/widget.js" async></script>`,
    },
  ]

  async function copy(idx, code) {
    try { await navigator.clipboard.writeText(code) } catch {}
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Layout title={t(T.nav.widget, lang)} subtitle={t(T.nav.widget, lang)}>
      <Card style={{ marginBottom:16, borderLeft:'3px solid var(--gold)' }}>
        <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--gold)' }}>Every widget is live.</strong> It automatically updates when your rating changes. Each embed includes a "Powered by ReplyIQ" backlink — free marketing for you, social proof for your site.
        </div>
      </Card>

      {!pid ? (
        <EmptyState icon="⊞" title={t(T.platforms.connect, lang)+' Google'} description="Your widget is ready once you connect your Google Business profile on the Platforms page." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {snippets.map((snip, i) => (
            <Card key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:'14px', color:'var(--text1)', marginBottom:3 }}>{snip.label}</div>
                  <div style={{ fontSize:'12px', color:'var(--text3)' }}>{snip.desc}</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => copy(i, snip.code)}>
                  {copied === i ? '✓ Copied!' : '📋 Copy Code'}
                </Button>
              </div>
              <pre style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px', fontSize:'11px', color:'var(--text2)', overflowX:'auto', margin:0, lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                {snip.code}
              </pre>
            </Card>
          ))}

          <Card>
            <div style={{ fontWeight:700, fontSize:'13px', color:'var(--text1)', marginBottom:8 }}>{lang==='de'?'Vorschau':lang==='fr'?'Aperçu':'Preview'}</div>
            <div style={{ fontSize:'12px', color:'var(--text3)', marginBottom:12 }}>
              Live preview of how your badge looks — rating pulled from your real Google data.
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px', background:'white', borderRadius:10, flexWrap:'wrap' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'white', border:'1px solid #e0e0e0', borderRadius:50, padding:'8px 16px 8px 10px' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#C9A96E,#F59E0B)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>★</div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:'16px', fontWeight:700, color:'#111' }}>
                      {property?.platform_connections?.google?.businessInfo?.rating?.toFixed(1) || '4.5'}
                    </span>
                    <span style={{ color:'#C9A96E', fontSize:'13px' }}>★★★★★</span>
                  </div>
                  <div style={{ fontSize:'10px', color:'#666', marginTop:1 }}>
                    {(property?.platform_connections?.google?.businessInfo?.totalReviews || 0).toLocaleString()} reviews · Google
                  </div>
                </div>
              </div>
              <span style={{ fontSize:'11px', color:'#999' }}>← This badge appears on your website</span>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  )
}
// ── ADMIN PAGE ─────────────────────────────────────────────────────────────
// Only accessible to the owner — hidden from normal nav
// Route: /admin — protected by ADMIN_SECRET fetched client-side

export function AdminPage() {
  const { property } = useApp()
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [secret,  setSecret]    = useState(() => localStorage.getItem('admin_secret') || '')
  const [authed,  setAuthed]    = useState(false)
  const [error,   setError]     = useState('')
  const [sortBy,  setSortBy]    = useState('health')

  async function load(s) {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/widget?admin=1', { headers: { 'x-admin-secret': s } })
      if (r.status === 401) { setError('Wrong admin secret'); setLoading(false); return }
      const data = await r.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setClients(data.clients || [])
      setAuthed(true)
      localStorage.setItem('admin_secret', s)
    } catch(e) { setError(e.message) }
    setLoading(false)
  }

  function sorted() {
    return [...clients].sort((a,b) => {
      if (sortBy === 'health')      return a.health - b.health           // worst first
      if (sortBy === 'lastLogin')   return (b.daysSinceLogin||999) - (a.daysSinceLogin||999)
      if (sortBy === 'reviews')     return b.reviewTotal - a.reviewTotal
      if (sortBy === 'rate')        return a.responseRate - b.responseRate
      return a.name.localeCompare(b.name)
    })
  }

  if (!authed) return (
    <Layout title="Admin" subtitle="Client dashboard">
      <Card style={{ maxWidth:400, margin:'60px auto' }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.2rem', marginBottom:16 }}>Admin Access</div>
        <input
          type="password" value={secret} onChange={e=>setSecret(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&load(secret)}
          placeholder="Admin secret"
          style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text1)', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:12 }}
        />
        {error && <div style={{ color:'#B85C38', fontSize:'13px', marginBottom:10 }}>{error}</div>}
        <Button fullWidth onClick={() => load(secret)} disabled={loading}>
          {loading ? <><Spinner />Loading...</> : 'Access Dashboard'}
        </Button>
      </Card>
    </Layout>
  )

  const total       = clients.length
  const atRisk      = clients.filter(c => c.daysSinceLogin > 7 || c.responseRate < 50).length
  const healthy     = clients.filter(c => c.health >= 70).length
  const avgRate     = total ? Math.round(clients.reduce((s,c)=>s+c.responseRate,0)/total) : 0
  const totalReviews= clients.reduce((s,c)=>s+c.reviewTotal,0)

  return (
    <Layout title="Admin" subtitle={`${total} clients · as of ${new Date().toLocaleTimeString()}`}
      topbarRight={<Button variant="secondary" size="sm" onClick={()=>load(secret)}>⟳ Refresh</Button>}>

      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Clients',    value:total,         color:'var(--gold)' },
          { label:'Healthy (≥70)',    value:healthy,       color:'#4A7C6F' },
          { label:'At Risk',          value:atRisk,        color:atRisk>0?'#B85C38':'#4A7C6F' },
          { label:'Avg Response Rate',value:avgRate+'%',   color:avgRate>=70?'#4A7C6F':'#B85C38' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'16px 18px' }}>
            <div style={{ fontSize:'10px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'2rem', color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sort bar */}
      <div style={{ display:'flex', gap:6, marginBottom:12, alignItems:'center' }}>
        <span style={{ fontSize:'11px', color:'var(--text3)' }}>Sort by:</span>
        {[['health','Health ↑'],['lastLogin','Last Login'],['reviews','Reviews'],['rate','Response Rate'],['name','Name']].map(([key,label]) => (
          <button key={key} onClick={()=>setSortBy(key)} style={{
            padding:'4px 10px', border:'none', borderRadius:6, cursor:'pointer', fontSize:'11px',
            background:sortBy===key?'var(--gold)':'var(--surface)',
            color:sortBy===key?'var(--bg)':'var(--text3)',
            fontFamily:'var(--font-sans)'
          }}>{label}</button>
        ))}
      </div>

      {/* Client table */}
      <Card style={{ padding:0, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 80px 80px 80px 80px 70px', gap:0, padding:'10px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'1px', color:'var(--text3)', fontWeight:600 }}>
          <span>Client</span><span>Last Login</span><span>Reviews</span><span>Replied</span><span>Rate</span><span>Snippets</span><span>Health</span>
        </div>

        {sorted().map((c, i) => {
          const loginColor  = !c.daysSinceLogin ? '#4A7C6F' : c.daysSinceLogin <= 7 ? '#4A7C6F' : c.daysSinceLogin <= 14 ? '#C9A96E' : '#B85C38'
          const rateColor   = c.responseRate >= 80 ? '#4A7C6F' : c.responseRate >= 50 ? '#C9A96E' : '#B85C38'
          const healthColor = c.health >= 70 ? '#4A7C6F' : c.health >= 40 ? '#C9A96E' : '#B85C38'

          return (
            <div key={c.id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 80px 80px 80px 80px 70px', gap:0, padding:'12px 16px', borderBottom:i<sorted().length-1?'1px solid var(--border)':'none', background:i%2===0?'transparent':'rgba(255,255,255,.01)', alignItems:'center' }}>
              {/* Client info */}
              <div>
                <div style={{ fontWeight:600, fontSize:'13px', marginBottom:2 }}>{c.name}</div>
                <div style={{ fontSize:'11px', color:'var(--text3)', display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span>{c.email}</span>
                  {c.platforms.length > 0 && <span style={{ color:'var(--gold)' }}>{c.platforms.join(', ')}</span>}
                  {c.city !== '—' && <span>{c.city}</span>}
                  {c.hasAutoReply && <span style={{ color:'#4A7C6F' }}>⚡ auto-reply</span>}
                </div>
              </div>

              {/* Last login */}
              <div style={{ fontSize:'12px', color:loginColor }}>
                {c.daysSinceLogin === null ? '—' :
                 c.daysSinceLogin === 0    ? 'Today' :
                 c.daysSinceLogin === 1    ? 'Yesterday' :
                 `${c.daysSinceLogin}d ago`}
              </div>

              {/* Reviews */}
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text1)' }}>
                {c.reviewTotal.toLocaleString()}
              </div>

              {/* Responded */}
              <div style={{ fontSize:'13px', color:'var(--text2)' }}>
                {c.reviewResponded.toLocaleString()}
              </div>

              {/* Response rate */}
              <div style={{ fontSize:'13px', fontWeight:700, color:rateColor }}>
                {c.reviewTotal > 0 ? c.responseRate + '%' : '—'}
              </div>

              {/* Snippets */}
              <div style={{ fontSize:'13px', color:c.snippetCount>0?'var(--gold)':'var(--text3)' }}>
                {c.snippetCount > 0 ? `${c.snippetCount} set` : '—'}
              </div>

              {/* Health score */}
              <div>
                <div style={{ fontSize:'13px', fontWeight:700, color:healthColor, marginBottom:3 }}>{c.health}</div>
                <div style={{ height:3, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${c.health}%`, background:healthColor, borderRadius:2 }} />
                </div>
              </div>
            </div>
          )
        })}
      </Card>

      <div style={{ marginTop:12, fontSize:'11px', color:'var(--text3)', textAlign:'center' }}>
        Health score: platforms connected (20) + reviews imported (20) + response rate ≥80% (30) + snippets set (15) + logged in last 7 days (15)
      </div>
    </Layout>
  )
}
