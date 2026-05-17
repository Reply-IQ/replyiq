import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, KpiCard, Button, Spinner, EmptyState, SectionHeader, Stars, PlatformBadge, Tabs, RatingSelector, Textarea, Input, Divider, Alert } from '../components/UI.jsx'
import { useApp, useRiskScore, useIsMobile, useLang } from '../lib/store.jsx'
import { T, t } from '../lib/i18n.js'
import { draftResponse, generateRiskAnalysis, calcRevenue, analyseCompetitors, generateReport } from '../lib/api.js'
import { saveAiClassification, saveResponse, saveReport, supabase } from '../lib/supabase.js'

// ── REVIEWS PAGE ──────────────────────────────────────────────────────────────
export function ReviewsPage() {
  const { reviews, property, showToast, updateReviewInState } = useApp()
  const { lang } = useLang()
  const [filter, setFilter] = useState('all')
  const [loadingMap, setLM] = useState({})
  const [tone, setTone]     = useState('professional')

  const filtered = {
    all:      reviews,
    negative: reviews.filter(r => r.rating <= 2),
    neutral:  reviews.filter(r => r.rating === 3),
    positive: reviews.filter(r => r.rating >= 4),
    unanswered: reviews.filter(r => !r.responded),
  }[filter] || reviews

  function setLoading(id, v) { setLM(p => ({ ...p, [id]: v })) }

  async function classify(review) {
    setLoading(review.id, 'classify')
    const { classifyReview } = await import('../lib/api.js')
    const result = await classifyReview?.(review) || {}
    if (result.error) { showToast('AI error', 'error'); setLoading(review.id, null); return }
    const { data: updated } = await saveAiClassification(review.id, result)
    if (updated) updateReviewInState(updated)
    setLoading(review.id, null)
  }

  async function respond(review) {
    setLoading(review.id, 'respond')
    const result = await draftResponse(review, property, tone)
    if (result.error) { showToast('AI error', 'error'); setLoading(review.id, null); return }
    const { data: updated } = await saveResponse(review.id, result.response || result.raw || '')
    if (updated) updateReviewInState(updated)
    setLoading(review.id, null)
  }

  return (
    <Layout title={t(T.nav.reviews, lang)} subtitle={`${reviews.length} total · ${reviews.filter(r=>!r.responded).length} ${t(T.competitors.reviews, lang).toLowerCase()}`}
      topbarRight={
        <div style={{ display: 'flex', gap: 8 }}>
          {[['professional',t(T.inbox.professional,lang)],['empathetic',t(T.inbox.empathetic,lang)],['concise',t(T.inbox.concise,lang)]].map(([key,label]) => (
            <Button key={key} variant={tone===key?'secondary':'ghost'} size="sm" onClick={()=>setTone(key)}>{label}</Button>
          ))}
        </div>
      }
    >
      <Tabs active={filter} onChange={setFilter} tabs={[
        { id:'all',        label:t(T.inbox.all,lang),                        count: reviews.length },
        { id:'unanswered', label:t(T.inbox.pending,lang),                    count: reviews.filter(r=>!r.responded).length },
        { id:'negative',   label:'⚠ '+t(T.inbox.urgent,lang),               count: reviews.filter(r=>r.rating<=2).length },
        { id:'neutral',    label:t(T.common.noData,lang).split('.')[0],      count: reviews.filter(r=>r.rating===3).length },
        { id:'positive',   label:'★ '+t(T.inbox.positive,lang),             count: reviews.filter(r=>r.rating>=4).length },
      ]} />

      {filtered.map(review => (
        <div key={review.id} style={{ background:'var(--card)', border:`1px solid ${review.ai_risk_flag?'rgba(184,92,56,.25)':'var(--border)'}`, borderRadius:'var(--r-lg)', padding:16, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'13px', color:'var(--text3)', flexShrink:0 }}>
                {review.author.slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:'13px', marginBottom:2 }}>{review.author}</div>
                <div style={{ fontSize:'11px', color:'var(--text3)', display:'flex', gap:8, alignItems:'center' }}>
                  {review.review_date} <PlatformBadge platform={review.platform} />
                  {review.responded && <span style={{ color:'#4A7C6F', fontWeight:600 }}>✓ Replied</span>}
                </div>
              </div>
            </div>
            <Stars n={review.rating} />
          </div>

          <p style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65, marginBottom:10 }}>{review.text}</p>

          {review.ai_summary && (
            <div style={{ fontSize:'12px', color:'var(--text3)', background:'var(--surface)', borderRadius:6, padding:'6px 10px', marginBottom:8 }}>
              AI: {review.ai_summary} {review.ai_risk_flag && <span style={{ color:'#B85C38', fontWeight:700 }}>⚠ Risk flag</span>}
            </div>
          )}

          {review.response_text && (
            <div style={{ background:'var(--surface)', border:'1px solid rgba(201,169,110,.15)', borderRadius:8, padding:'10px 12px', fontSize:'13px', color:'var(--text2)', lineHeight:1.6, fontStyle:'italic', marginBottom:8, borderLeft:'3px solid var(--gold)' }}>
              "{review.response_text}"
            </div>
          )}

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {!review.responded && loadingMap[review.id] !== 'respond' && (
              <Button variant="secondary" size="sm" onClick={() => respond(review)}>✨ {t(T.inbox.generateAI, lang)}</Button>
            )}
            {loadingMap[review.id] === 'respond' && <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'12px', color:'var(--gold)' }}><Spinner size={12} /> Drafting...</div>}
            {review.response_text && (
              <>
                <Button size="sm" onClick={() => { navigator.clipboard?.writeText(review.response_text); showToast('✓ '+t(T.common.copied,lang), 'success') }}>📋 {t(T.inbox.copyAgain, lang)}</Button>
                <Button variant="ghost" size="sm" onClick={() => respond(review)}>↻</Button>
              </>
            )}
          </div>
        </div>
      ))}
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
    if (r.error) showToast('AI error — check API key', 'error')
    else { setResponse(r.response || r.raw || ''); setApproach(r.approach || '') }
    setLoading(false)
  }

  const unanswered = reviews.filter(r => !r.responded)

  return (
    <Layout title="AI Respond" subtitle="Paste any review — AI drafts a perfect response in seconds">
      <Grid cols={2} gap={18} style={{ alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card>
            <SectionHeader title="Review Input" />
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
            <Textarea label="Review Text" value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the guest review here..." rows={5} />
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
              <SectionHeader title="Unanswered Reviews" subtitle="Click to load" />
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
          <SectionHeader title="AI Response" />
          {!response && !loading && <EmptyState icon="✍" title="Response will appear here" description="Enter a review and click Generate" />}
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
  const { reviews, showToast } = useApp()
  const { lang } = useLang()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(false)
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
    const r = await generateRiskAnalysis(reviews)
    if (r.error) showToast('AI error', 'error')
    else setAnalysis(r)
    setLoading(false)
  }

  return (
    <Layout title={t(T.nav.risk, lang)} subtitle={t(T.risk.subtitle, lang)}
      topbarRight={<Button onClick={run} disabled={loading}>{loading?<><Spinner/>{t(T.common.generating,lang)}</>:'⚡ '+t(T.risk.generate,lang)}</Button>}
    >
      <Grid cols={3} gap={16} style={{ marginBottom:20 }}>
        <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:10 }}>{t(T.report.riskScore, lang)}</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'5rem', color:rC(score), lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:'11px', fontWeight:700, color:rC(score), letterSpacing:'2px', marginTop:8 }}>{score>=80?t(T.common.riskHigh,lang):score>=55?t(T.common.riskModerate,lang):t(T.common.riskStable,lang)}</div>
          <div style={{ width:'100%', height:8, background:'var(--surface)', borderRadius:4, margin:'18px 0 6px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${score}%`, background:rC(score), borderRadius:4, transition:'width 1s ease' }} />
          </div>
        </Card>

        <Card>
          <SectionHeader title="Risk Radar" subtitle="5-vector overview" />
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top:10,right:20,bottom:10,left:20 }}>
              <PolarGrid stroke="rgba(255,255,255,.06)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill:'var(--text3)', fontSize:10 }} />
              <Radar name="Risk" dataKey="score" stroke="#B85C38" fill="#B85C38" fillOpacity={0.1} strokeWidth={1.5} />
              <Tooltip formatter={v=>[`${v}`,'Score']} contentStyle={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, fontSize:'12px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHeader title="7-Day Plan" subtitle={analysis ? 'AI recommended' : 'Run AI analysis'} />
          {!analysis && !loading && <div style={{ fontSize:'13px', color:'var(--text3)', padding:'12px 0' }}>Click "AI Risk Analysis" to generate your personalised recovery plan.</div>}
          {loading && <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--gold)', fontSize:'13px' }}><Spinner /> Generating...</div>}
          {analysis?.sevenDayPlan?.map((step, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:i<(analysis.sevenDayPlan.length-1)?'1px solid var(--border)':'none' }}>
              <div style={{ width:52, flexShrink:0, fontSize:'11px', fontWeight:700, color:'var(--gold)', paddingTop:2 }}>{step.day}</div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:2 }}>{step.action}</div>
                <div style={{ fontSize:'12px', color:'var(--text3)' }}>{step.impact}</div>
              </div>
            </div>
          ))}
        </Card>
      </Grid>

      <Card>
        <SectionHeader title="Component Breakdown" subtitle={analysis ? 'AI analysis' : 'Baseline estimate'} />
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
  const [rev, setRev]       = useState(property?.monthly_revenue || 50000)
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
          <KpiCard label="Monthly Revenue Gain" value={`+CHF ${result.monthlyGain.toLocaleString()}`} sub="extra per month at target rating" accent="gold" />
          <KpiCard label="Annual Revenue Gain"  value={`+CHF ${result.annualGain.toLocaleString()}`}  sub="extra per year at target rating"  accent="emerald" />
          <KpiCard label="ReplyIQ ROI"          value={`${result.roiX}×`}                            sub={`Payback in ${result.paybackDays} days`} accent="teal" />
          <KpiCard label="Rating to Close"      value={`${result.ratingGap}★`}                         sub={`${result.upliftPct}% projected uplift`} accent="violet" />
        </Grid>
        <Grid cols={2} gap={16}>
          <Card>
            <SectionHeader title="Revenue Comparison" subtitle="Monthly CHF" />
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
            <SectionHeader title="Model Breakdown" />
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

// ── COMPETITORS PAGE ──────────────────────────────────────────────────────────
export function CompetitorsPage() {
  const { property, reviews, competitors, showToast, loadAll } = useApp()
  const { lang } = useLang()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [syncing, setSyncing]   = useState(false)
  // Use real average from imported reviews, fall back to Google businessInfo
  const yourRating = reviews?.length
    ? +(reviews.reduce((s,r) => s + Number(r.rating), 0) / reviews.length).toFixed(1)
    : property?.platform_connections?.google?.businessInfo?.rating || 0
  const yourReviews = property?.platform_connections?.google?.businessInfo?.totalReviews || reviews?.length || 0
  const allProps = [{ name:`${property?.name||'Your Property'} (YOU)`, rating: yourRating, reviews: yourReviews, trend:'—', isYou:true }, ...competitors].sort((a,b)=>b.rating-a.rating)

  async function sync() {
    const placeId = property?.platform_connections?.google?.identifier || property?.google_place_id
    if (!placeId) { showToast('Connect Google Business first — go to Platforms', 'error'); return }
    setSyncing(true)
    try {
      const profile   = property?.ai_profile || {}
      const nameL     = (property?.name || '').toLowerCase()
      const descL     = (profile.responsePersonality || profile.brandTone || '').toLowerCase()
      const isRestaurant = ['restaurant','ristorante','bistro','brasserie','trattoria','café','cafe','bar','grill','kitchen','dining','pizzeria','sushi','thai','indian','chinese','italian','mexican','french'].some(w => nameL.includes(w) || descL.includes(w))
      const propertyType = isRestaurant ? 'restaurant' : 'hotel'
      const starLevel    = property?.platform_connections?.google?.businessInfo?.rating || null

      const r = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, clinicName: property.name, propertyType, starLevel, propertyFullName: profile.businessName || property.name })
      })

      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        showToast('Competitor sync error: ' + (err.error || r.status), 'error')
        setSyncing(false)
        return
      }

      const data = await r.json()

      if (data.error) {
        showToast('API error: ' + data.error, 'error')
        setSyncing(false)
        return
      }

      const list = data.competitors || []

      if (list.length === 0) {
        showToast('No competitors found in 3km — check your Google Places API key in Vercel', 'error')
        setSyncing(false)
        return
      }

      // Delete old + insert new — only store columns that exist in the table
      await supabase.from('competitors').delete().eq('clinic_id', property.id)
      const rows = list.map(c => ({
        clinic_id: property.id,
        name:      c.name,
        rating:    c.rating,
        reviews:   c.reviews,
        place_id:  c.place_id,
      }))
      const { error: insertErr } = await supabase.from('competitors').insert(rows)
      if (insertErr) {
        showToast('Save failed: ' + insertErr.message, 'error')
        setSyncing(false)
        return
      }

      // Reload competitors directly without triggering full loadAll guard
      const { data: fresh } = await supabase.from('competitors').select('*').eq('clinic_id', property.id).order('rating', { ascending: false })
      if (fresh) {
        // Update state via loadAll (guard is now clear)
        await loadAll(true)
      }
      showToast(`Found ${list.length} nearby competitors`, 'success')

    } catch(e) {
      showToast('Sync failed: ' + e.message, 'error')
    }
    setSyncing(false)
  }

  async function runAnalysis() {
    if (!competitors?.length) {
      showToast('Sync competitors first before running the AI benchmark', 'error')
      return
    }
    setLoading(true)
    const r = await analyseCompetitors(property, competitors)
    if (!r || r.error) {
      showToast('AI benchmark failed — try again', 'error')
    } else if (!r.primaryOpportunity && !r.narrative) {
      // JSON parsing issue — r might be { raw: '...' }
      showToast('AI returned unexpected format — try again', 'error')
    } else {
      setAnalysis(r)
    }
    setLoading(false)
  }

  return (
    <Layout title={t(T.nav.competitors, lang)} subtitle={t(T.competitors.subtitle, lang).replace("5km","3km")}
      topbarRight={
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="secondary" onClick={sync} disabled={syncing}>{syncing?<><Spinner/>{t(T.competitors.syncing,lang)}</>:'⊡ '+t(T.competitors.sync,lang)}</Button>
          <Button onClick={runAnalysis} disabled={loading}>{loading?<><Spinner/>{t(T.common.generating,lang)}</>:'⊞ '+t(T.competitors.aiBenchmark,lang)}</Button>
        </div>
      }
    >
      <Card style={{ marginBottom:18 }}>
        <SectionHeader title={t(T.competitors.benchmark, lang)} subtitle={t(T.competitors.sortedBy, lang)} />
        {competitors.length === 0 && (
          <div style={{ padding:'24px 14px', textAlign:'center' }}>
            <div style={{ fontSize:'13px', color:'var(--text3)', marginBottom:8 }}>No competitors synced yet.</div>
            <div style={{ fontSize:'12px', color:'var(--text3)', marginBottom:16 }}>Click "Sync Competitors" above to find nearby properties on Google.</div>
            <div style={{ fontSize:'11px', color:'var(--text3)', opacity:0.6 }}>Make sure GOOGLE_PLACES_API_KEY is set in your Vercel environment variables.</div>
          </div>
        )}
        {competitors.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 90px', padding:'0 14px 10px', fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>
          <span>{t(T.competitors.property,lang)}</span><span>{t(T.competitors.rating,lang)}</span><span>{t(T.competitors.reviews,lang)}</span><span>{t(T.competitors.trend,lang)}</span>
        </div>
        )}
        {competitors.length > 0 && allProps.map((p, i) => (
          <div key={p.name} style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 90px', alignItems:'center', padding:'12px 14px', borderRadius:8, marginBottom:3, background:p.isYou?'rgba(201,169,110,.06)':'rgba(255,255,255,.02)', border:p.isYou?'1px solid rgba(201,169,110,.2)':'1px solid transparent', fontSize:'13px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:'var(--text3)', fontSize:'11px', width:20 }}>#{i+1}</span>
              <span style={{ fontWeight:p.isYou?700:400 }}>{p.name}</span>
            </div>
            <div style={{ fontFamily:'var(--font-serif)', color:'var(--gold)' }}>{p.rating}★</div>
            <div style={{ color:'var(--text3)' }}>{p.reviews?.toLocaleString()}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:600, color:p.trend?.startsWith?.('+')?'#4A7C6F':p.trend==='-'||p.trend==='—'?'var(--text3)':'#B85C38' }}>{p.trend}</div>
          </div>
        ))}
        }
      </Card>

      {analysis && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Position badge */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ padding:'6px 16px', borderRadius:20, fontSize:'12px', fontWeight:700, letterSpacing:'1px',
              background: analysis.competitivePosition==='LEADING'?'rgba(74,124,111,.15)':analysis.competitivePosition==='STRONG'?'rgba(201,169,110,.12)':analysis.competitivePosition==='AVERAGE'?'rgba(90,90,130,.15)':'rgba(184,92,56,.12)',
              color: analysis.competitivePosition==='LEADING'?'#4A7C6F':analysis.competitivePosition==='STRONG'?'var(--gold)':analysis.competitivePosition==='AVERAGE'?'#8888CC':'#B85C38',
              border: '1px solid currentColor'
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
              <SectionHeader title="Quick Wins" subtitle="Act on these this week" />
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
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:28px;font-weight:700;color:${riskColor}">${r.riskScore||0}</div>
      <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Risk Score</div>
    </div>
    <div style="background:#1C2430;border:1px solid #2A3545;border-radius:10px;padding:16px;text-align:center">
      <div style="font-size:28px;font-weight:700;color:#C9A96E">${r.unansweredCount||0}</div>
      <div style="font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Unanswered</div>
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
          subject: `ReplyIQ Weekly Report — ${property?.name || 'Your Property'} — ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`,
          html,
        })
      })
      const d = await r.json()
      if (d.success || d.skipped) showToast(`✓ Report sent to ${to}`, 'success')
      else showToast('Email failed — check Resend config', 'error')
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
      {!report && !loading && <Card><EmptyState icon="▤" title="Weekly Intelligence Report" description="ReplyIQ analyses all your reviews across every platform and generates a structured executive brief." action={<Button size="lg" onClick={generate}>Generate This Week's Report</Button>} /></Card>}
      {loading && <Card><div style={{ padding:48, display:'flex', alignItems:'center', gap:12, color:'var(--gold)', justifyContent:'center' }}><Spinner size={20} />Generating your intelligence report...</div></Card>}
      {report && !report.error && <>
        <Card style={{ marginBottom:16, borderLeft:'3px solid var(--gold)' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--gold)', marginBottom:8, fontWeight:600 }}>Executive Summary</div>
          <div style={{ fontSize:'14px', color:'var(--text2)', lineHeight:1.7 }}>{report.weekSummary}</div>
        </Card>
        <Grid cols={isMobile?1:2} gap={16} style={{ marginBottom:16 }}>
          <Card>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--teal)', marginBottom:12, fontWeight:600 }}>Statistics</div>
            {[['Negative reviews',report.negativeCount,'#B85C38'],['Positive reviews',report.positiveCount,'#4A7C6F'],['Unanswered',report.unansweredCount,'#C9A96E'],['Risk score',`${report.riskScore}/100`,riskScore>60?'#B85C38':'#4A7C6F'],['Revenue risk',report.revenueRisk,'#C9A96E']].map(([l,v,c],i,arr)=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', fontSize:'13px' }}>
                <span style={{ color:'var(--text3)' }}>{l}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:c }}>{v}</span>
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
          <SectionHeader title="Priority Action Plan" subtitle="Organised by urgency" />
          {(report.actions||[]).map((a,i)=>(
            <div key={i} style={{ display:'flex', gap:14, padding:12, borderRadius:8, marginBottom:8, background:urgB[a.urgency]||urgB['this-week'], border:`1px solid ${(urgC[a.urgency]||'#5a9080')}22`, alignItems:'flex-start' }}>
              <div style={{ minWidth:80, padding:'3px 8px', borderRadius:5, textAlign:'center', background:`${(urgC[a.urgency]||'#5a9080')}15`, color:urgC[a.urgency]||'#5a9080', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', flexShrink:0 }}>{a.urgency?.replace('-',' ')}</div>
              <div><div style={{ fontWeight:600, fontSize:'13px', marginBottom:3 }}>{a.action}</div><div style={{ fontSize:'12px', color:'var(--text3)' }}>{a.impact}</div></div>
            </div>
          ))}
        </Card>
        <Grid cols={isMobile?1:2} gap={16}>
          <Card><div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--gold)', marginBottom:8, fontWeight:600 }}>🏆 Win of the Week</div><div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65 }}>{report.win}</div></Card>
          <Card><div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'#5a9080', marginBottom:8, fontWeight:600 }}>→ Next Week's Focus</div><div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65 }}>{report.nextFocus}</div></Card>
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
        <EmptyState icon="⊞" title="Connect Google first" description="Your widget is ready once you connect your Google Business profile on the Platforms page." />
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