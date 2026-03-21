// ─── RISK PAGE ────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, KpiCard, Button, Spinner, EmptyState, Divider, SectionHeader, Stars, RatingSelector, Textarea, Input, StatRow } from '../components/UI.jsx'
import { useApp, useRiskScore } from '../lib/store.jsx'
import { useLang } from '../lib/lang.jsx'
import { generateRiskAnalysis, calculateRevenue, analyseCompetitors, draftResponse, generateReport, sendEmail, buildReportEmail } from '../lib/api.js'
import { saveAiClassification, saveResponse, saveReport, updateClinic } from '../lib/supabase.js'

function rC(s) { return s>=70?'var(--rose)':s>=45?'var(--gold)':'var(--mint)' }

const DEFAULT_COMPONENTS = [
  { key:'ratingVolatility',   score:72, color:'var(--rose)',   detail:'Rating dropped 0.2★ in 90 days — above normal variance threshold' },
  { key:'responseGap',        score:65, color:'var(--gold)',   detail:'4 negative reviews unanswered, averaging 18+ days' },
  { key:'complianceRisk',     score:80, color:'var(--rose)',   detail:'1 review contains language suggesting unconsented procedure' },
  { key:'sentimentTrend',     score:58, color:'var(--gold)',   detail:'3 of last 4 reviews are negative — declining momentum' },
  { key:'competitorPressure', score:45, color:'var(--silver)', detail:'Market leader is 0.4★ ahead; gap widening' },
]

export function RiskPage() {
  const { reviews, showToast } = useApp()
  const { t } = useLang()
  const tk = t.risk
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(false)
  const score = useRiskScore(reviews)

  async function run() {
    setLoading(true)
    const result = await generateRiskAnalysis(reviews)
    if (result.error) showToast(t.dashboard.brief.aiError,'error')
    else setAnalysis(result)
    setLoading(false)
  }

  const components = analysis?.components
    ? DEFAULT_COMPONENTS.map(d=>({ ...d, score:analysis.components[d.key]?.score??d.score, detail:analysis.components[d.key]?.detail??d.detail, color:rC(analysis.components[d.key]?.score??d.score) }))
    : DEFAULT_COMPONENTS

  const radarData = components.map(c=>({ subject:tk.labels[c.key]?.split(' ').slice(0,2).join(' ')||c.key, score:c.score }))

  const trendLabel = analysis?.overallTrend==='increasing'?tk.increasing:analysis?.overallTrend==='decreasing'?tk.decreasing:tk.stable

  return (
    <Layout title={tk.title} subtitle={tk.subtitle}
      topbarRight={<Button onClick={run} disabled={loading}>{loading?<><Spinner/>{tk.calculating}</>:tk.aiButton}</Button>}
    >
      <Grid cols={3} gap={16} style={{marginBottom:20}}>
        <Card style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px'}}>
          <div style={{fontSize:'0.65rem',color:'var(--mid)',textTransform:'uppercase',letterSpacing:'2px',marginBottom:8}}>{tk.scoreLabel}</div>
          <div style={{fontFamily:'var(--font-serif)',fontSize:'5.5rem',color:rC(score),lineHeight:1}}>{score}</div>
          <div style={{fontSize:'0.72rem',fontWeight:700,color:rC(score),letterSpacing:'2.5px',marginTop:6}}>{score>=70?t.common.high:score>=45?t.common.moderate:t.common.stable}</div>
          <div style={{width:'100%',height:8,background:'var(--navy)',borderRadius:4,margin:'18px 0 6px',overflow:'hidden'}}>
            <div style={{height:'100%',width:`${score}%`,background:rC(score),borderRadius:4}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',width:'100%',fontSize:'0.65rem',color:'var(--mid)'}}>
            <span>{tk.stable0}</span><span>50</span><span>{tk.critical100}</span>
          </div>
          {analysis&&<div style={{marginTop:14,fontSize:'0.78rem',color:'var(--silver)',textAlign:'center'}}>
            {tk.trend}: <span style={{color:rC(score),fontWeight:600}}>{trendLabel}</span>
          </div>}
        </Card>
        <Card>
          <SectionHeader title={tk.radarTitle} subtitle={tk.radarSub}/>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{top:10,right:20,bottom:10,left:20}}>
              <PolarGrid stroke="rgba(2,131,144,.2)"/>
              <PolarAngleAxis dataKey="subject" tick={{fill:'var(--mid)',fontSize:10}}/>
              <Radar name="Risk" dataKey="score" stroke="var(--rose)" fill="var(--rose)" fillOpacity={0.12} strokeWidth={1.5}/>
              <Tooltip formatter={v=>[`${v}`,'Score']} contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.8rem'}}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionHeader title={tk.planTitle} subtitle={tk.planSub}/>
          {loading&&<div style={{display:'flex',alignItems:'center',gap:8,color:'var(--mint)',fontSize:'0.82rem'}}><Spinner/>{tk.planLoading}</div>}
          {!analysis&&!loading&&<div style={{fontSize:'0.82rem',color:'var(--mid)',padding:'12px 0'}}>{tk.planEmpty}</div>}
          {analysis?.sevenDayPlan?.map((step,i)=>(
            <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:i<analysis.sevenDayPlan.length-1?'1px solid var(--border)':'none'}}>
              <div style={{width:56,flexShrink:0,fontSize:'0.68rem',fontWeight:700,color:'var(--teal)',paddingTop:2}}>{step.day}</div>
              <div>
                <div style={{fontSize:'0.85rem',fontWeight:600,marginBottom:2}}>{step.action}</div>
                <div style={{fontSize:'0.78rem',color:'var(--silver)'}}>{step.impact}</div>
              </div>
            </div>
          ))}
        </Card>
      </Grid>
      <Card>
        <SectionHeader title={tk.breakdownTitle} subtitle={analysis?tk.breakdownAI:tk.breakdownSub}/>
        {components.map((c,i)=>(
          <div key={c.key} style={{display:'grid',gridTemplateColumns:'200px 150px 1fr',alignItems:'center',gap:16,padding:'13px 0',borderBottom:i<components.length-1?'1px solid var(--border)':'none'}}>
            <div style={{fontSize:'0.85rem',fontWeight:500}}>{tk.labels[c.key]||c.key}</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1,height:6,background:'var(--navy)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${c.score}%`,background:c.color,borderRadius:3}}/>
              </div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.82rem',fontWeight:700,color:c.color,width:28,textAlign:'right'}}>{c.score}</div>
            </div>
            <div style={{fontSize:'0.8rem',color:'var(--silver)',lineHeight:1.5}}>{c.detail}</div>
          </div>
        ))}
        {analysis&&<>
          <Divider/>
          <div style={{background:'rgba(2,195,154,.06)',border:'1px solid rgba(2,195,154,.15)',borderRadius:8,padding:'14px 16px',marginBottom:12}}>
            <div style={{fontSize:'0.8rem',fontWeight:600,color:'var(--mint)',marginBottom:5}}>{tk.topRisk}</div>
            <div style={{fontSize:'0.88rem',color:'var(--silver)',lineHeight:1.6}}>{analysis.topRiskFactor}</div>
          </div>
          {analysis.complianceFlags?.length>0&&(
            <div style={{background:'rgba(232,72,85,.06)',border:'1px solid rgba(232,72,85,.2)',borderRadius:8,padding:'14px 16px'}}>
              <div style={{fontSize:'0.8rem',fontWeight:600,color:'var(--rose)',marginBottom:8}}>{tk.complianceFlags}</div>
              {analysis.complianceFlags.map((f,i)=><div key={i} style={{fontSize:'0.82rem',color:'var(--silver)',marginBottom:5,paddingLeft:14,borderLeft:'2px solid var(--rose)'}}>{f}</div>)}
            </div>
          )}
        </>}
      </Card>
    </Layout>
  )
}

// ─── REVENUE PAGE ─────────────────────────────────────────────────────────────
const Tip2 = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null
  return <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:'0.8rem'}}><div style={{color:'var(--silver)',marginBottom:2}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color,fontWeight:600}}>CHF {(p.value||0).toLocaleString()}</div>)}</div>
}

export function RevenuePage() {
  const { clinic, showToast } = useApp()
  const { t } = useLang()
  const tv = t.revenue
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [appts, setAppts]     = useState(clinic?.monthly_appts||80)
  const [avgRev, setAvgRev]   = useState(clinic?.avg_revenue||1200)
  const [target, setTarget]   = useState(clinic?.target_rating||4.6)
  const currentRating = clinic?.google_rating||4.3

  async function calculate() {
    setLoading(true)
    const r = await calculateRevenue({currentRating,targetRating:target,monthlyAppts:appts,avgRevenue:avgRev})
    if (r.error) showToast(t.dashboard.brief.aiError,'error')
    else setResult(r)
    setLoading(false)
  }

  const chartData = result?[{name:tv.current,value:result.currentMonthlyRevenue,color:'var(--mid)'},{name:tv.projected,value:result.projectedMonthlyRevenue,color:'var(--mint)'}]:[]

  return (
    <Layout title={tv.title} subtitle={tv.subtitle}
      topbarRight={<Button onClick={calculate} disabled={loading}>{loading?<><Spinner/>{tv.calculating}</>:tv.calcButton}</Button>}
    >
      <Card style={{marginBottom:18}}>
        <SectionHeader title={tv.paramsTitle} subtitle={tv.paramsSub}/>
        <Grid cols={4} gap={16}>
          <Input label={tv.appts} type="number" value={appts} onChange={e=>setAppts(+e.target.value)}/>
          <Input label={tv.avgRev} type="number" value={avgRev} onChange={e=>setAvgRev(+e.target.value)} prefix="CHF"/>
          <div>
            <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.8px',color:'var(--mid)',fontWeight:600,marginBottom:8}}>{tv.currentRating}</div>
            <div style={{fontFamily:'var(--font-serif)',fontSize:'2rem',color:'var(--gold)'}}>{currentRating}★</div>
          </div>
          <Input label={tv.targetRating} type="number" value={target} onChange={e=>setTarget(+e.target.value)} step="0.1" min="4" max="5" suffix="★"/>
        </Grid>
        <div style={{marginTop:12,fontSize:'0.8rem',color:'var(--mid)'}}>
          {tv.gapToClose}: <strong style={{color:'var(--white)'}}>{(target-currentRating).toFixed(1)}★</strong> &nbsp;·&nbsp; {tv.currentRev}: <strong style={{color:'var(--white)'}}>CHF {(appts*avgRev).toLocaleString()}</strong>
        </div>
      </Card>
      {!result&&!loading&&<Card><EmptyState icon="◆" title={tv.emptyTitle} description={`${tv.emptyDesc} ${currentRating}★ → ${target}★`} action={<Button onClick={calculate}>{tv.calcButton}</Button>}/></Card>}
      {loading&&<Card><div style={{padding:32,display:'flex',alignItems:'center',gap:10,color:'var(--mint)',justifyContent:'center'}}><Spinner/>{tv.loading}</div></Card>}
      {result&&!result.error&&<>
        <Grid cols={4} gap={14} style={{marginBottom:18}}>
          <KpiCard label={tv.kpi.monthlyGain} value={`+CHF ${(result.monthlyGain||0).toLocaleString()}`} accent="mint"/>
          <KpiCard label={tv.kpi.annualGain}  value={`+CHF ${(result.annualGain||0).toLocaleString()}`}  accent="gold"/>
          <KpiCard label={tv.kpi.newPatients} value={`+${result.newPatientsPerMonth||0}`}                accent="teal"/>
          <KpiCard label={tv.kpi.roi}         value={`${result.drisROIx||0}×`} sub={`${tv.kpi.payback} ${result.paybackDays||0} ${tv.kpi.days}`} accent="rose"/>
        </Grid>
        <Grid cols={2} gap={16}>
          <Card>
            <SectionHeader title={tv.chartTitle} subtitle={tv.chartSub}/>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{top:10,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,131,144,.1)"/>
                <XAxis dataKey="name" tick={{fill:'var(--mid)',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'var(--mid)',fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`CHF ${(v/1000).toFixed(0)}K`}/>
                <Tooltip content={<Tip2/>}/>
                <Bar dataKey="value" name="Revenue" radius={[4,4,0,0]}>{chartData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <SectionHeader title={tv.modelTitle}/>
            <div style={{background:'var(--navy)',borderRadius:8,padding:14,fontSize:'0.88rem',color:'var(--silver)',lineHeight:1.7,borderLeft:'3px solid var(--gold)',marginBottom:14}}>{result.modelNote}</div>
            <div style={{background:'rgba(2,195,154,.06)',border:'1px solid rgba(2,195,154,.15)',borderRadius:8,padding:14}}>
              <div style={{fontSize:'0.75rem',color:'var(--mid)',marginBottom:10,textTransform:'uppercase',letterSpacing:'1px'}}>{tv.breakdown}</div>
              {[
                {l:tv.ratingGap,   v:`${(result.ratingGap||0).toFixed(1)}★`},
                {l:tv.elasticity,  v:`${((result.elasticityPct||0)*100).toFixed(1)}%`},
                {l:tv.currentRev2, v:`CHF ${(result.currentMonthlyRevenue||0).toLocaleString()}`},
                {l:tv.projectedRev,v:`CHF ${(result.projectedMonthlyRevenue||0).toLocaleString()}`},
                {l:tv.subscription,v:'CHF 199/month'},
                {l:tv.confidence,  v:result.confidence||'—'},
              ].map((row,i,arr)=>(
                <div key={row.l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',fontSize:'0.83rem'}}>
                  <span style={{color:'var(--silver)'}}>{row.l}</span>
                  <span style={{fontFamily:'var(--font-mono)',fontWeight:600}}>{row.v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:12,fontSize:'0.73rem',color:'var(--mid)'}}>{tv.source}</div>
          </Card>
        </Grid>
      </>}
    </Layout>
  )
}

// ─── COMPETITORS PAGE ─────────────────────────────────────────────────────────
export function Competitors() {
  const { clinic, competitors, showToast } = useApp()
  const { t } = useLang()
  const tc = t.competitors
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading]   = useState(false)
  const yourRating = clinic?.google_rating||4.3
  const allClinics = [{ name:`${clinic?.name||'Your Clinic'} (${tc.you})`, rating:yourRating, reviews:clinic?.total_reviews||234, trend:'-0.2', isYou:true }, ...competitors].sort((a,b)=>b.rating-a.rating)

  async function run() {
    setLoading(true)
    const r = await analyseCompetitors(clinic, competitors)
    if (r.error) showToast(t.dashboard.brief.aiError,'error')
    else setAnalysis(r)
    setLoading(false)
  }

  return (
    <Layout title={tc.title} subtitle={tc.subtitle}
      topbarRight={<Button onClick={run} disabled={loading}>{loading?<><Spinner/>{tc.analysing}</>:tc.aiButton}</Button>}
    >
      <Card style={{marginBottom:18}}>
        <SectionHeader title={tc.tableTitle} subtitle={tc.tableSub}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 80px 90px 90px 100px',padding:'0 14px 10px',fontSize:'0.67rem',color:'var(--mid)',textTransform:'uppercase',letterSpacing:'1px',fontWeight:600}}>
          {Object.values(tc.cols).map(h=><span key={h}>{h}</span>)}
        </div>
        {allClinics.map((c,i)=>{
          const gap=c.rating-yourRating
          return (
            <div key={c.name} style={{display:'grid',gridTemplateColumns:'1fr 80px 90px 90px 100px',alignItems:'center',padding:'12px 14px',borderRadius:8,marginBottom:3,fontSize:'0.85rem',background:c.isYou?'rgba(2,131,144,.08)':i%2===0?'rgba(13,27,42,.5)':'rgba(12,31,48,.5)',border:c.isYou?'1px solid rgba(2,195,154,.15)':'1px solid transparent'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:'var(--mid)',fontSize:'0.78rem',width:18}}>#{i+1}</span>
                <span style={{fontWeight:c.isYou?600:400}}>{c.name}</span>
              </div>
              <div style={{fontFamily:'var(--font-serif)',color:'var(--gold)',fontSize:'1rem'}}>{c.rating}★</div>
              <div style={{color:'var(--silver)'}}>{c.reviews}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.8rem',fontWeight:600,color:String(c.trend).startsWith('+')?'var(--mint)':c.trend==='0.0'?'var(--mid)':'var(--rose)'}}>{c.trend}</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:'0.82rem',fontWeight:600,color:c.isYou?'var(--mid)':gap>0?'var(--rose)':'var(--mint)'}}>
                {c.isYou?'—':gap>0?`−${gap.toFixed(1)}★`:`+${Math.abs(gap).toFixed(1)}★`}
              </div>
            </div>
          )
        })}
      </Card>
      {loading&&<Card><div style={{padding:24,display:'flex',alignItems:'center',gap:10,color:'var(--mint)',justifyContent:'center'}}><Spinner/>{tc.loading}</div></Card>}
      {!analysis&&!loading&&<Card><EmptyState icon="⊞" title={tc.emptyTitle} description={tc.emptyDesc} action={<Button onClick={run}>{tc.runBenchmark}</Button>}/></Card>}
      {analysis&&!analysis.error&&<>
        <Grid cols={4} gap={14} style={{marginBottom:18}}>
          <KpiCard label={tc.kpi.position} value={analysis.marketPosition}              accent="teal"/>
          <KpiCard label={tc.kpi.gap}      value={`−${analysis.ratingGapToLeader}★`}   accent="rose"/>
          <KpiCard label={tc.kpi.revenue}  value={analysis.estimatedMonthlyRevenueLoss} accent="gold"/>
          <KpiCard label={tc.kpi.urgency}  value={(analysis.urgency||'').toUpperCase()} accent={analysis.urgency==='high'?'rose':'gold'}/>
        </Grid>
        <Grid cols={2} gap={16}>
          <Card>
            <SectionHeader title={tc.analysisTitle}/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:'0.72rem',color:'var(--mint)',fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'1px'}}>{tc.opportunity}</div>
              <div style={{fontSize:'0.88rem',color:'var(--silver)',lineHeight:1.6}}>{analysis.primaryOpportunity}</div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:'0.72rem',color:'var(--rose)',fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'1px'}}>{tc.threat}</div>
              <div style={{fontSize:'0.88rem',color:'var(--silver)',lineHeight:1.6}}>{analysis.threatAssessment}</div>
            </div>
            <div style={{background:'var(--navy)',borderRadius:8,padding:'12px 14px',fontSize:'0.85rem',color:'var(--silver)',lineHeight:1.6,borderLeft:'3px solid var(--teal)'}}>{analysis.marketNarrative}</div>
          </Card>
          <Card>
            <SectionHeader title={tc.quickWins} subtitle={tc.quickWinsSub}/>
            {(analysis.quickWins||[]).map((win,i)=>(
              <div key={i} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:i<(analysis.quickWins.length-1)?'1px solid var(--border)':'none'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(2,195,154,.1)',color:'var(--mint)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:700,flexShrink:0}}>{i+1}</div>
                <div style={{fontSize:'0.85rem',color:'var(--silver)',lineHeight:1.5}}>{win}</div>
              </div>
            ))}
          </Card>
        </Grid>
      </>}
    </Layout>
  )
}

// ─── AI RESPOND PAGE ──────────────────────────────────────────────────────────
export function Respond() {
  const { reviews, showToast: st } = useApp()
  const { t } = useLang()
  const tr2 = t.respond
  const [text, setText]         = useState('')
  const [rating, setRating]     = useState(2)
  const [tone, setTone]         = useState('professional')
  const [response, setResponse] = useState('')
  const [approach, setApproach] = useState('')
  const [loading, setLoading]   = useState(false)
  const negReviews = reviews.filter(r=>r.rating<=2&&!r.response_text)

  async function generate() {
    if (!text.trim()) return
    setLoading(true); setResponse(''); setApproach('')
    const r = await draftResponse({text,rating,author:'Patient'},tone)
    if (r.error) st(t.dashboard.brief.aiError,'error')
    else { setResponse(r.response||r.raw||''); setApproach(r.approach||'') }
    setLoading(false)
  }

  function loadReview(r) { setText(r.text); setRating(r.rating); setResponse(''); setApproach('') }
  function copy() { if (response) navigator.clipboard?.writeText(response); st('✓ Copied','success') }

  return (
    <Layout title={tr2.title} subtitle={tr2.subtitle}>
      <Grid cols={2} gap={18} style={{alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Card>
            <SectionHeader title={tr2.inputTitle}/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.8px',color:'var(--mid)',fontWeight:600,marginBottom:8}}>{tr2.ratingLabel}</div>
              <RatingSelector value={rating} onChange={setRating}/>
            </div>
            <Textarea label={tr2.reviewLabel} value={text} onChange={e=>setText(e.target.value)} placeholder={tr2.reviewPH} rows={5}/>
            <div style={{margin:'14px 0'}}>
              <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.8px',color:'var(--mid)',fontWeight:600,marginBottom:8}}>{tr2.toneLabel}</div>
              <div style={{display:'flex',gap:7}}>
                {Object.entries(tr2.tones).map(([key,label])=>(
                  <Button key={key} variant={tone===key?'secondary':'ghost'} size="sm" onClick={()=>setTone(key)}>{label}</Button>
                ))}
              </div>
            </div>
            <Button fullWidth onClick={generate} disabled={loading||!text.trim()}>
              {loading?<><Spinner/>{tr2.generating}</>:tr2.generate}
            </Button>
          </Card>
          {negReviews.length>0&&(
            <Card>
              <SectionHeader title={tr2.unanswered} subtitle={tr2.unansweredSub}/>
              {negReviews.slice(0,4).map(r=>(
                <button key={r.id} onClick={()=>loadReview(r)} style={{display:'block',width:'100%',textAlign:'left',background:'var(--navy)',border:'1px solid var(--border)',borderRadius:7,padding:'10px 12px',cursor:'pointer',marginBottom:7,transition:'var(--ease)'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--teal)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:'0.8rem',fontWeight:600}}>{r.author}</span>
                    <Stars n={r.rating} size="0.75rem"/>
                  </div>
                  <div style={{fontSize:'0.78rem',color:'var(--silver)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.text}</div>
                </button>
              ))}
            </Card>
          )}
        </div>
        <Card>
          <SectionHeader title={tr2.outputTitle}/>
          {!response&&!loading&&<EmptyState icon="◎" title={tr2.emptyTitle} description={tr2.emptyDesc}/>}
          {loading&&<div style={{padding:'48px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}><Spinner size={24}/><div style={{color:'var(--mint)',fontSize:'0.85rem'}}>{tr2.generating}</div></div>}
          {response&&<>
            <div style={{background:'var(--navy)',borderRadius:10,padding:20,fontSize:'0.95rem',color:'var(--white)',lineHeight:1.8,fontStyle:'italic',borderLeft:'3px solid var(--mint)',marginBottom:16}}>"{response}"</div>
            {approach&&<div style={{background:'rgba(2,131,144,.06)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',fontSize:'0.8rem',color:'var(--silver)',marginBottom:14}}><strong style={{color:'var(--teal)'}}>{tr2.strategy}</strong> {approach}</div>}
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              <Button onClick={copy}>{tr2.copy}</Button>
              <Button variant="ghost" onClick={generate}>{tr2.regen}</Button>
            </div>
            <div style={{borderTop:'1px solid var(--border)',paddingTop:14,display:'flex',flexWrap:'wrap',gap:6,fontSize:'0.73rem'}}>
              {tr2.badges.map(badge=>(
                <span key={badge} style={{background:'rgba(2,195,154,.06)',border:'1px solid rgba(2,195,154,.15)',borderRadius:12,padding:'2px 8px',color:'var(--mint)'}}>{badge}</span>
              ))}
            </div>
          </>}
        </Card>
      </Grid>
    </Layout>
  )
}

// ─── REPORT PAGE ──────────────────────────────────────────────────────────────
export function Report() {
  const { clinic, reviews, showToast } = useApp()
  const { t } = useLang()
  const trp = t.report
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)
  const riskScore = reviews.filter(r=>r.ai_risk_flag).length>0?68:52
  const urgCol = { urgent:'var(--rose)', 'this-week':'var(--gold)', 'this-month':'var(--teal)' }
  const urgBg  = { urgent:'rgba(232,72,85,.09)', 'this-week':'rgba(244,162,97,.07)', 'this-month':'rgba(2,131,144,.07)' }

  async function generate() {
    setLoading(true)
    const r = await generateReport(clinic,reviews,riskScore)
    if (r.error) showToast(trp.aiError,'error')
    else { setReport(r); if (clinic?.id) await saveReport(clinic.id,r,r.riskScore||riskScore); showToast(trp.saved,'success') }
    setLoading(false)
  }

  async function emailReport() {
    if (!report) { showToast(trp.emailNoReport,'info'); return }
    const to = clinic?.owner_email
    if (!to) { showToast(trp.emailNoEmail,'error'); return }
    const html = buildReportEmail(clinic,report)
    const result = await sendEmail(to,'ReplyIQ — '+trp.title,html)
    if (result.error) showToast(trp.emailError+' '+result.error,'error')
    else if (result.skipped) showToast(trp.emailNotConfig,'info')
    else showToast(`${trp.emailSent} ${to}!`,'success')
  }

  const statLabels = trp.statLabels
  return (
    <Layout title={trp.title} subtitle={`${trp.generated} ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`}
      topbarRight={<div style={{display:'flex',gap:8}}><Button variant="ghost" onClick={emailReport}>{trp.emailBtn}</Button><Button onClick={generate} disabled={loading}>{loading?<><Spinner/>{trp.generating}</>:trp.generateBtn}</Button></div>}
    >
      {!report&&!loading&&<Card><EmptyState icon="▤" title={trp.emptyTitle} description={trp.emptyDesc} action={<Button size="lg" onClick={generate}>{trp.generateNow}</Button>}/></Card>}
      {loading&&<Card><div style={{padding:48,display:'flex',alignItems:'center',gap:12,color:'var(--mint)',justifyContent:'center'}}><Spinner size={20}/>{trp.loading}</div></Card>}
      {report&&!report.error&&<>
        <Card style={{marginBottom:16,borderLeft:'3px solid var(--teal)'}}>
          <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'2px',color:'var(--teal)',marginBottom:8}}>{trp.summary}</div>
          <div style={{fontSize:'0.95rem',color:'var(--silver)',lineHeight:1.7}}>{report.weekSummary}</div>
        </Card>
        <Grid cols={2} gap={16} style={{marginBottom:16}}>
          <Card>
            <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.5px',color:'var(--teal)',marginBottom:14,fontWeight:600}}>{trp.stats}</div>
            {[
              {n:statLabels.ratingStatus,   v:report.ratingStatus,                                      vc:'var(--gold)'},
              {n:statLabels.reviewsAnalysed,v:report.reviewsAnalysed,                                   vc:'var(--white)'},
              {n:statLabels.negativeUnansw, v:`${report.negativeCount} (${report.unansweredUrgent})`,   vc:'var(--rose)'},
              {n:statLabels.positive,       v:report.positiveCount,                                     vc:'var(--mint)'},
              {n:statLabels.riskScore,      v:`${report.riskScore}/100 — ${report.riskTrend}`,          vc:report.riskScore>=70?'var(--rose)':'var(--gold)'},
              {n:statLabels.revenueRisk,    v:report.estimatedRevenueRisk,                              vc:'var(--gold)'},
            ].map((row,i,arr)=>(
              <div key={row.n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',fontSize:'0.85rem'}}>
                <span style={{color:'var(--silver)'}}>{row.n}</span>
                <span style={{fontFamily:'var(--font-mono)',fontWeight:600,fontSize:'0.82rem',color:row.vc}}>{row.v}</span>
              </div>
            ))}
          </Card>
          <Card>
            <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.5px',color:'var(--rose)',marginBottom:10,fontWeight:600}}>{trp.threats}</div>
            {(report.topThreats||[]).map((th,i)=><div key={i} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'0.84rem'}}><span style={{color:'var(--rose)',flexShrink:0}}>▲</span><span style={{color:'var(--silver)'}}>{th}</span></div>)}
            <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.5px',color:'var(--mint)',margin:'14px 0 10px',fontWeight:600}}>{trp.strengths}</div>
            {(report.topStrengths||[]).map((s,i)=><div key={i} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'0.84rem'}}><span style={{color:'var(--mint)',flexShrink:0}}>✓</span><span style={{color:'var(--silver)'}}>{s}</span></div>)}
          </Card>
        </Grid>
        <Card style={{marginBottom:16}}>
          <SectionHeader title={trp.actionPlan} subtitle={trp.actionSub}/>
          {(report.priorityActions||[]).map((a,i)=>(
            <div key={i} style={{display:'flex',gap:14,padding:13,borderRadius:9,marginBottom:8,background:urgBg[a.urgency]||urgBg['this-week'],border:`1px solid ${(urgCol[a.urgency]||'var(--teal)')}22`,alignItems:'flex-start'}}>
              <div style={{minWidth:80,padding:'3px 8px',borderRadius:5,textAlign:'center',background:`${(urgCol[a.urgency]||'var(--teal)')}18`,border:`1px solid ${(urgCol[a.urgency]||'var(--teal)')}33`,color:urgCol[a.urgency]||'var(--teal)',fontSize:'0.63rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>{a.deadline}</div>
              <div><div style={{fontWeight:600,fontSize:'0.88rem',marginBottom:3}}>{a.action}</div><div style={{fontSize:'0.8rem',color:'var(--silver)'}}>{a.expectedImpact}</div></div>
            </div>
          ))}
        </Card>
        <Grid cols={2} gap={16}>
          <Card><div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.5px',color:'var(--mint)',marginBottom:10,fontWeight:600}}>{trp.win}</div><div style={{fontSize:'0.9rem',color:'var(--silver)',lineHeight:1.65}}>{report.winOfTheWeek}</div></Card>
          <Card><div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.5px',color:'var(--gold)',marginBottom:10,fontWeight:600}}>{trp.nextFocus}</div><div style={{fontSize:'0.9rem',color:'var(--silver)',lineHeight:1.65}}>{report.nextWeekFocus}</div></Card>
        </Grid>
      </>}
    </Layout>
  )
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
export function Settings() {
  const { clinic, updateClinicInState, reviews, showToast, loadAll } = useApp()
  const { t } = useLang()
  const ts = t.settings
  const [form, setForm]         = useState(clinic||{})
  const [saving, setSaving]     = useState(false)
  const [placeId, setPlaceId]   = useState(clinic?.google_place_id||'')
  const [connecting, setConn]   = useState(false)
  const [googleInfo, setGInfo]  = useState(null)
  function set(key,val) { setForm(p=>({...p,[key]:val})) }

  async function save() {
    setSaving(true)
    const { data, error } = await updateClinic({ name:form.name, address:form.address, phone:form.phone, email:form.email, owner_email:form.owner_email, monthly_appts:form.monthly_appts, avg_revenue:form.avg_revenue, target_rating:form.target_rating })
    if (error) showToast('Error: '+error.message,'error')
    else { updateClinicInState(data); showToast('Settings saved!','success') }
    setSaving(false)
  }

  async function connectGoogle() {
    if (!placeId.trim()) { showToast('Please enter a Google Place ID','error'); return }
    setConn(true)
    try {
      const res = await fetch('/api/google-reviews', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ placeId: placeId.trim() })
      })
      const data = await res.json()
      if (data.error) { showToast('Google error: '+data.error+'. '+(data.message||''),'error'); setConn(false); return }
      setGInfo(data)
      // Save place ID and update clinic rating
      const { data: updated, error } = await updateClinic({
        google_place_id: placeId.trim(),
        google_connected: true,
        google_rating: data.rating,
        total_reviews: data.totalReviews,
        name: form.name || data.name,
        address: form.address || data.address,
        phone: form.phone || data.phone,
      })
      if (!error && updated) updateClinicInState(updated)
      // Upsert reviews into DB
      if (data.reviews?.length > 0) {
        const { upsertReviews } = await import('../lib/supabase.js')
        await upsertReviews(clinic.id, data.reviews)
        await loadAll()
      }
      showToast(`Connected! Imported ${data.reviews?.length||0} reviews from Google.`,'success')
    } catch(e) { showToast('Connection failed: '+e.message,'error') }
    setConn(false)
  }

  return (
    <Layout title="Settings" subtitle="Clinic profile & Google Business connection">
      <Grid cols={2} gap={20} style={{alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Google Business Connection */}
          <Card accent="teal">
            <SectionHeader title="🔗 Google Business Profile" subtitle="Connect to auto-import real reviews"/>
            <div style={{fontSize:'0.85rem',color:'var(--silver)',lineHeight:1.6,marginBottom:16}}>
              Connect your Google Business Profile to automatically import all your real patient reviews. ReplyIQ AI will then classify and analyse them.
            </div>
            {clinic?.google_connected && (
              <div style={{background:'rgba(2,195,154,.08)',border:'1px solid rgba(2,195,154,.2)',borderRadius:8,padding:'12px 14px',marginBottom:14,fontSize:'0.83rem'}}>
                <div style={{color:'var(--mint)',fontWeight:600,marginBottom:4}}>✓ Connected to Google</div>
                <div style={{color:'var(--silver)'}}>Rating: {clinic.google_rating}★ · {clinic.total_reviews} total reviews</div>
                <div style={{color:'var(--mid)',fontSize:'0.75rem',marginTop:4}}>Place ID: {clinic.google_place_id}</div>
              </div>
            )}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:'0.67rem',textTransform:'uppercase',letterSpacing:'1.8px',color:'var(--mid)',fontWeight:600,marginBottom:6}}>Google Place ID</div>
              <input value={placeId} onChange={e=>setPlaceId(e.target.value)} placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                style={{width:'100%',background:'var(--navy)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'8px 12px',color:'var(--white)',fontSize:'0.88rem',outline:'none'}}
                onFocus={e=>e.target.style.borderColor='var(--teal)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
            </div>
            <div style={{fontSize:'0.75rem',color:'var(--mid)',marginBottom:14,lineHeight:1.5}}>
              Find your Place ID: Go to <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" style={{color:'var(--teal)'}}>Google Place ID Finder</a>, search for your clinic, copy the Place ID.
            </div>
            <Button fullWidth onClick={connectGoogle} disabled={connecting||!placeId.trim()}>
              {connecting?<><Spinner/>Connecting to Google...</>:clinic?.google_connected?'🔄 Sync Latest Reviews':'🔗 Connect & Import Reviews'}
            </Button>
            {googleInfo && (
              <div style={{marginTop:12,padding:'12px 14px',background:'rgba(2,131,144,.08)',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.82rem',color:'var(--silver)'}}>
                <div style={{fontWeight:600,color:'var(--white)',marginBottom:4}}>Found: {googleInfo.name}</div>
                <div>{googleInfo.address}</div>
                <div style={{marginTop:4}}>Rating: <span style={{color:'var(--gold)'}}>{googleInfo.rating}★</span> · {googleInfo.totalReviews} total reviews · {googleInfo.reviews?.length} imported</div>
              </div>
            )}
          </Card>

          {/* Clinic Profile */}
          <Card>
            <SectionHeader title="Clinic Profile"/>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <Input label="Clinic Name"               value={form.name||''}          onChange={e=>set('name',e.target.value)}/>
              <Input label="Address"                   value={form.address||''}       onChange={e=>set('address',e.target.value)}/>
              <Input label="Phone"                     value={form.phone||''}         onChange={e=>set('phone',e.target.value)}/>
              <Input label="Clinic Email"              value={form.email||''}         onChange={e=>set('email',e.target.value)}/>
              <Input label="Owner / Report Email"      value={form.owner_email||''}   onChange={e=>set('owner_email',e.target.value)}/>
              <Input label="Monthly Appointments"      type="number" value={form.monthly_appts||80}  onChange={e=>set('monthly_appts',+e.target.value)}/>
              <Input label="Avg Revenue / Visit (CHF)" type="number" value={form.avg_revenue||1200}  onChange={e=>set('avg_revenue',+e.target.value)}/>
              <Input label="Target Rating"             type="number" value={form.target_rating||4.6} onChange={e=>set('target_rating',+e.target.value)} step="0.1" min="4" max="5" suffix="★"/>
            </div>
            <div style={{marginTop:18}}><Button onClick={save} fullWidth disabled={saving}>{saving?<><Spinner/>Saving...</>:'Save Changes'}</Button></div>
          </Card>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <Card>
            <SectionHeader title="Subscription"/>
            <div style={{background:'rgba(2,131,144,.08)',border:'1px solid rgba(2,195,154,.2)',borderRadius:10,padding:16,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontFamily:'var(--font-serif)',fontSize:'1.2rem'}}>Starter Plan</div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'var(--font-serif)',fontSize:'1.5rem',color:'var(--mint)'}}>CHF 249<span style={{fontSize:'0.75rem',color:'var(--mid)'}}>/mo</span></div>
                  <div style={{fontSize:'0.72rem',color:'var(--gold)',marginTop:2}}>or CHF 2,490/yr <span style={{background:'rgba(244,162,97,.15)',border:'1px solid rgba(244,162,97,.3)',borderRadius:10,padding:'1px 7px',fontWeight:700}}>2 months free</span></div>
                </div>
              </div>
              {clinic?.created_at&&<div style={{fontSize:'0.8rem',color:'var(--silver)'}}>Active since {new Date(clinic.created_at).toLocaleDateString()}</div>}
            </div>
            {['Google review auto-import','AI review classification','GDPR-compliant response drafting','Reputation Risk Index','Revenue Impact Estimator','Competitor benchmarking','Weekly executive report'].map((f,i,arr)=>(
              <div key={f} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',fontSize:'0.84rem'}}>
                <span style={{color:'var(--mint)'}}>✓</span><span style={{color:'var(--silver)'}}>{f}</span>
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <Button variant="secondary" fullWidth>Monthly — CHF 249/mo</Button>
              <Button variant="secondary" fullWidth style={{borderColor:'var(--gold)',color:'var(--gold)'}}>Yearly — CHF 2,490 <span style={{fontSize:'0.7rem',opacity:.8}}>save CHF 498</span></Button>
            </div>
          </Card>
          <Card>
            <SectionHeader title="Notifications"/>
            {[
              {l:'Weekly intelligence report',s:'Every Monday morning'},
              {l:'New negative review',s:'Immediately when posted'},
              {l:'Risk index spike',s:'When score increases >10 pts'},
              {l:'Competitor changes',s:'When a competitor moves ±0.2★'},
            ].map(({l,s})=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                <div><div style={{fontSize:'0.85rem',fontWeight:500}}>{l}</div><div style={{fontSize:'0.73rem',color:'var(--mid)'}}>{s}</div></div>
                <div style={{width:36,height:20,borderRadius:10,background:'var(--teal)',position:'relative',cursor:'pointer',flexShrink:0}}>
                  <div style={{width:14,height:14,borderRadius:'50%',background:'#fff',position:'absolute',right:3,top:3}}/>
                </div>
              </div>
            ))}
            <div style={{marginTop:14}}>
              <div style={{fontSize:'0.73rem',color:'var(--mid)',marginBottom:5}}>Reports delivered to</div>
              <div style={{fontSize:'0.88rem',color:'var(--mint)',fontFamily:'var(--font-mono)'}}>{form.owner_email||'—'}</div>
            </div>
          </Card>
        </div>
      </Grid>
    </Layout>
  )
}
