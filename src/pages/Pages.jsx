import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, KpiCard, Button, Spinner, EmptyState, SectionHeader, Stars, PlatformBadge, Tabs, RatingSelector, Textarea, Input, Divider, Alert } from '../components/UI.jsx'
import { useApp, useRiskScore } from '../lib/store.jsx'
import { draftResponse, generateRiskAnalysis, calcRevenue, analyseCompetitors, generateReport } from '../lib/api.js'
import { saveAiClassification, saveResponse, saveReport } from '../lib/supabase.js'

// ── REVIEWS PAGE ──────────────────────────────────────────────────────────────
export function ReviewsPage() {
  const { reviews, property, showToast, updateReviewInState, consumeAIGeneration } = useApp()
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
    const check = await consumeAIGeneration()
    if (!check.allowed) { showToast(check.reason, 'error'); return }
    setLoading(review.id, 'classify')
    const { classifyReview } = await import('../lib/api.js')
    const result = await classifyReview?.(review) || {}
    if (result.error) { showToast('AI error', 'error'); setLoading(review.id, null); return }
    const { data: updated } = await saveAiClassification(review.id, result)
    if (updated) updateReviewInState(updated)
    setLoading(review.id, null)
  }

  async function respond(review) {
    const check = await consumeAIGeneration()
    if (!check.allowed) { showToast(check.reason, 'error'); return }
    setLoading(review.id, 'respond')
    const result = await draftResponse(review, property, tone)
    if (result.error) { showToast('AI error', 'error'); setLoading(review.id, null); return }
    const { data: updated } = await saveResponse(review.id, result.response || result.raw || '')
    if (updated) updateReviewInState(updated)
    setLoading(review.id, null)
  }

  return (
    <Layout title="Reviews" subtitle={`${reviews.length} total · ${reviews.filter(r=>!r.responded).length} unanswered`}
      topbarRight={
        <div style={{ display: 'flex', gap: 8 }}>
          {['professional','empathetic','concise'].map(t => (
            <Button key={t} variant={tone===t?'secondary':'ghost'} size="sm" onClick={()=>setTone(t)} style={{ textTransform: 'capitalize' }}>{t}</Button>
          ))}
        </div>
      }
    >
      <Tabs active={filter} onChange={setFilter} tabs={[
        { id:'all',       label:'All',       count: reviews.length },
        { id:'unanswered',label:'Unanswered',count: reviews.filter(r=>!r.responded).length },
        { id:'negative',  label:'⚠ Negative',count: reviews.filter(r=>r.rating<=2).length },
        { id:'neutral',   label:'Neutral',   count: reviews.filter(r=>r.rating===3).length },
        { id:'positive',  label:'★ Positive', count: reviews.filter(r=>r.rating>=4).length },
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
              <Button variant="secondary" size="sm" onClick={() => respond(review)}>✨ Draft AI Response</Button>
            )}
            {loadingMap[review.id] === 'respond' && <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'12px', color:'var(--gold)' }}><Spinner size={12} /> Drafting...</div>}
            {review.response_text && (
              <>
                <Button size="sm" onClick={() => { navigator.clipboard?.writeText(review.response_text); showToast('✓ Copied!', 'success') }}>📋 Copy Response</Button>
                <Button variant="ghost" size="sm" onClick={() => respond(review)}>↻ Regenerate</Button>
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
  const { reviews, property, showToast, consumeAIGeneration } = useApp()
  const [text, setText]     = useState('')
  const [rating, setRating] = useState(3)
  const [platform, setPlatform] = useState('google')
  const [tone, setTone]     = useState('professional')
  const [response, setResponse] = useState('')
  const [approach, setApproach] = useState('')
  const [loading, setLoading]   = useState(false)

  async function generate() {
    if (!text.trim()) return
    const check = await consumeAIGeneration()
    if (!check.allowed) { showToast(check.reason, 'error'); return }
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
  const { reviews, showToast, consumeAIGeneration } = useApp()
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
    const check = await consumeAIGeneration()
    if (!check.allowed) { showToast(check.reason, 'error'); return }
    setLoading(true)
    const r = await generateRiskAnalysis(reviews)
    if (r.error) showToast('AI error', 'error')
    else setAnalysis(r)
    setLoading(false)
  }

  return (
    <Layout title="Risk Index" subtitle="Reputation risk across 5 intelligence vectors"
      topbarRight={<Button onClick={run} disabled={loading}>{loading?<><Spinner/>Calculating...</>:'⚡ AI Risk Analysis'}</Button>}
    >
      <Grid cols={3} gap={16} style={{ marginBottom:20 }}>
        <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:10 }}>Risk Score</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'5rem', color:rC(score), lineHeight:1 }}>{score}</div>
          <div style={{ fontSize:'11px', fontWeight:700, color:rC(score), letterSpacing:'2px', marginTop:8 }}>{score>=80?'HIGH RISK':score>=55?'MODERATE':'STABLE'}</div>
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
  const { property } = useApp()
  const [appts, setAppts]   = useState(property?.monthly_appts || 300)
  const [rev, setRev]       = useState(property?.avg_revenue || 150000)
  const [target, setTarget] = useState(property?.target_rating || 4.7)
  const [result, setResult] = useState(null)
  // Use real average from imported reviews, fall back to Google business info
  const reviews = useApp().reviews
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
    <Layout title="ROI Impact" subtitle="Based on Harvard Business School rating elasticity research (Luca, 2016)"
      topbarRight={<Button onClick={calculate}>◆ Calculate ROI</Button>}
    >
      <Card style={{ marginBottom:18 }}>
        <SectionHeader title="Property Parameters" subtitle="Adjust to your actual numbers" />
        <Grid cols={4} gap={16}>
          <Input label="Monthly Revenue" type="number" value={rev} onChange={e=>setRev(+e.target.value)} prefix="CHF" />
          <Input label="Monthly Covers/Guests" type="number" value={appts} onChange={e=>setAppts(+e.target.value)} />
          <div>
            <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', fontWeight:600, marginBottom:7 }}>Current Rating</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.2rem', color:'var(--gold)' }}>{currentRating}★</div>
          </div>
          <Input label="Target Rating" type="number" value={target} onChange={e=>setTarget(+e.target.value)} step="0.1" min="4" max="5" suffix="★" />
        </Grid>
      </Card>

      {!result && <Card><EmptyState icon="◆" title="ROI calculator ready" description={`Set your parameters and calculate the revenue impact of improving from ${currentRating}★ to ${target}★`} action={<Button onClick={calculate}>Calculate Now</Button>} /></Card>}

      {result && <>
        <Grid cols={4} gap={14} style={{ marginBottom:18 }}>
          <KpiCard label="Monthly Revenue Gain" value={`+CHF ${result.monthlyGain.toLocaleString()}`} accent="gold" />
          <KpiCard label="Annual Revenue Gain"  value={`+CHF ${result.annualGain.toLocaleString()}`}  accent="emerald" />
          <KpiCard label="ReplyIQ ROI"           value={`${result.roiX}×`} sub={`Payback in ${result.paybackDays} days`} accent="teal" />
          <KpiCard label="Rating Improvement"   value={`${result.ratingGap}★`} sub={`${result.upliftPct}% revenue uplift`} accent="violet" />
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
              A {result.ratingGap}★ improvement = {result.upliftPct}% projected revenue uplift based on HBS restaurant/hotel data.
            </div>
            {[['Current monthly revenue',`CHF ${result.currentMonthlyRevenue.toLocaleString()}`],['Projected monthly revenue',`CHF ${result.projectedMonthlyRevenue.toLocaleString()}`],['Monthly gain',`CHF ${result.monthlyGain.toLocaleString()}`],['Annual gain',`CHF ${result.annualGain.toLocaleString()}`],['ReplyIQ subscription','CHF 249/month'],['ROI',`${result.roiX}× return`],['Confidence',result.confidence]].map(([l,v],i,arr)=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', fontSize:'13px' }}>
                <span style={{ color:'var(--text3)' }}>{l}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:i>=2&&i<=4?'var(--gold)':'var(--text1)' }}>{v}</span>
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
  const { property, competitors, showToast, loadAll, consumeAIGeneration } = useApp()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const yourRating = property?.google_rating || 4.3
  const allProps = [{ name:`${property?.name||'Your Property'} (YOU)`, rating: yourRating, reviews: property?.total_reviews||0, trend:'—', isYou:true }, ...competitors].sort((a,b)=>b.rating-a.rating)

  async function sync() {
    const placeId = property?.platform_connections?.google?.identifier || property?.google_place_id
    if (!placeId) { showToast('Connect Google Business first — go to Platforms', 'error'); return }
    setSyncing(true)
    try {
      const r = await fetch('/api/competitors', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ placeId, clinicName:property.name }) })
      const data = await r.json()
      if (data.competitors?.length > 0) {
        const { supabase } = await import('../lib/supabase.js')
        await supabase.from('competitors').delete().eq('clinic_id', property.id)
        await supabase.from('competitors').insert(data.competitors.map(c=>({...c, clinic_id:property.id})))
        await loadAll()
        showToast(`Found ${data.competitors.length} real nearby properties!`, 'success')
      }
    } catch(e) { showToast('Sync failed: '+e.message, 'error') }
    setSyncing(false)
  }

  async function runAnalysis() {
    const check = await consumeAIGeneration()
    if (!check.allowed) { showToast(check.reason, 'error'); return }
    setLoading(true)
    const r = await analyseCompetitors(property, competitors)
    if (r.error) showToast('AI error', 'error')
    else setAnalysis(r)
    setLoading(false)
  }

  return (
    <Layout title="Competitor Intelligence" subtitle="Real-time market benchmarking — 2km radius"
      topbarRight={
        <div style={{ display:'flex', gap:8 }}>
          <Button variant="secondary" onClick={sync} disabled={syncing}>{syncing?<><Spinner/>Syncing...</>:'⊡ Sync Real Competitors'}</Button>
          <Button onClick={runAnalysis} disabled={loading}>{loading?<><Spinner/>Analysing...</>:'⊞ AI Benchmark'}</Button>
        </div>
      }
    >
      <Card style={{ marginBottom:18 }}>
        <SectionHeader title="Local Market Benchmark" subtitle="Sorted by rating" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 90px 90px', padding:'0 14px 10px', fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>
          <span>Property</span><span>Rating</span><span>Reviews</span><span>Trend</span>
        </div>
        {allProps.map((p, i) => (
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
      </Card>

      {analysis && (
        <Grid cols={2} gap={16}>
          <Card>
            <div style={{ fontSize:'11px', color:'#4A7C6F', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:8, fontWeight:600 }}>Primary Opportunity</div>
            <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.6, marginBottom:14 }}>{analysis.primaryOpportunity}</div>
            <div style={{ fontSize:'11px', color:'#B85C38', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:8, fontWeight:600 }}>Main Threat</div>
            <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.6, marginBottom:14 }}>{analysis.threat}</div>
            <div style={{ background:'var(--surface)', borderRadius:8, padding:'12px 14px', fontSize:'13px', color:'var(--text2)', lineHeight:1.6, borderLeft:'3px solid var(--gold)' }}>{analysis.narrative}</div>
          </Card>
          <Card>
            <SectionHeader title="Quick Wins" subtitle="Act on these this week" />
            {(analysis.quickWins||[]).map((win,i)=>(
              <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:i<(analysis.quickWins.length-1)?'1px solid var(--border)':'none' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(201,169,110,.1)', color:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>{i+1}</div>
                <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.5 }}>{win}</div>
              </div>
            ))}
          </Card>
        </Grid>
      )}
    </Layout>
  )
}

// ── REPORT PAGE ───────────────────────────────────────────────────────────────
export function ReportPage() {
  const { property, reviews, showToast, consumeAIGeneration } = useApp()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const riskScore = useRiskScore(reviews)
  const urgC = { urgent:'#B85C38','this-week':'#C9A96E','this-month':'#5a9080' }
  const urgB = { urgent:'rgba(184,92,56,.08)','this-week':'rgba(201,169,110,.07)','this-month':'rgba(74,124,111,.07)' }

  async function generate() {
    const check = await consumeAIGeneration()
    if (!check.allowed) { showToast(check.reason, 'error'); return }
    setLoading(true)
    const r = await generateReport(property, reviews, riskScore)
    if (r.error) showToast('AI error', 'error')
    else { setReport(r); if (property?.id) await saveReport(property.id, r, r.riskScore||riskScore); showToast('Report generated!','success') }
    setLoading(false)
  }

  return (
    <Layout title="Weekly Report" subtitle={`Generated ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`}
      topbarRight={<Button onClick={generate} disabled={loading}>{loading?<><Spinner/>Generating...</>:'▤ Generate Report'}</Button>}
    >
      {!report && !loading && <Card><EmptyState icon="▤" title="Weekly Intelligence Report" description="ReplyIQ analyses all your reviews across every platform and generates a structured executive brief." action={<Button size="lg" onClick={generate}>Generate This Week's Report</Button>} /></Card>}
      {loading && <Card><div style={{ padding:48, display:'flex', alignItems:'center', gap:12, color:'var(--gold)', justifyContent:'center' }}><Spinner size={20} />Generating your intelligence report...</div></Card>}
      {report && !report.error && <>
        <Card style={{ marginBottom:16, borderLeft:'3px solid var(--gold)' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--gold)', marginBottom:8, fontWeight:600 }}>Executive Summary</div>
          <div style={{ fontSize:'14px', color:'var(--text2)', lineHeight:1.7 }}>{report.weekSummary}</div>
        </Card>
        <Grid cols={2} gap={16} style={{ marginBottom:16 }}>
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
        <Grid cols={2} gap={16}>
          <Card><div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--gold)', marginBottom:8, fontWeight:600 }}>🏆 Win of the Week</div><div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65 }}>{report.win}</div></Card>
          <Card><div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'#5a9080', marginBottom:8, fontWeight:600 }}>→ Next Week's Focus</div><div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.65 }}>{report.nextFocus}</div></Card>
        </Grid>
      </>}
    </Layout>
  )
}
