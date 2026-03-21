import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, KpiCard, Button, Alert, InsightItem, SectionHeader, Spinner, EmptyState, Divider } from '../components/UI.jsx'
import { useApp, useRiskScore, useUnansweredCount } from '../lib/store.jsx'
import { useLang } from '../lib/lang.jsx'
import { generateBrief } from '../lib/api.js'
import { saveBrief } from '../lib/supabase.js'

const RISK_HISTORY   = [{p:'Oct',v:42},{p:'Nov',v:38},{p:'Dec',v:45},{p:'Jan',v:52},{p:'Feb',v:61},{p:'Mar',v:68}]
const RATING_HISTORY = [{p:'Oct',v:4.6},{p:'Nov',v:4.6},{p:'Dec',v:4.5},{p:'Jan',v:4.5},{p:'Feb',v:4.4},{p:'Mar',v:4.3}]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:'0.8rem' }}>
      <div style={{ color:'var(--silver)', marginBottom:2 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color, fontWeight:600 }}>{p.name}: {p.value}{p.unit||''}</div>)}
    </div>
  )
}

export default function Dashboard() {
  const { clinic, reviews, showToast } = useApp()
  const { t } = useLang()
  const td = t.dashboard
  const [brief, setBrief]     = useState(null)
  const [loading, setLoading] = useState(false)
  const riskScore  = useRiskScore(reviews)
  const unanswered = useUnansweredCount(reviews)
  const navigate   = useNavigate()
  const posCount   = reviews.filter(r => r.rating >= 4).length
  const negCount   = reviews.filter(r => r.rating <= 2).length
  const hasRisk    = reviews.some(r => r.ai_risk_flag)
  const COMPLAINTS = [
    { label: td.complaints.labels.waitTime, pct: 62, color: 'var(--rose)' },
    { label: td.complaints.labels.billing,  pct: 48, color: 'var(--gold)' },
    { label: td.complaints.labels.staff,    pct: 28, color: 'var(--silver)' },
    { label: td.complaints.labels.hygiene,  pct: 18, color: 'var(--teal)' },
    { label: td.complaints.labels.pain,     pct: 12, color: 'var(--mid)' },
  ]
  async function getIntelligenceBrief() {
    setLoading(true)
    const result = await generateBrief(reviews)
    if (!result.error) { setBrief(result); if (clinic?.id) await saveBrief(clinic.id, result) }
    else showToast(td.brief.aiError, 'error')
    setLoading(false)
  }
  return (
    <Layout title={td.title} subtitle={`${td.weekOf} ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`}
      topbarRight={<Button onClick={getIntelligenceBrief} disabled={loading}>{loading?<><Spinner/>{td.analysing}</>:td.aiButton}</Button>}
    >
      <Grid cols={4} gap={14} style={{marginBottom:20}}>
        <KpiCard label={td.kpi.rating}  value={`${clinic?.google_rating??4.3}★`} sub={td.kpi.last90}    trend={td.kpi.ratingTrend} trendDir="down" accent="gold"/>
        <KpiCard label={td.kpi.risk}    value={riskScore}                          sub={td.kpi.riskSub}   trend={riskScore>60?td.kpi.elevated:td.kpi.normal} trendDir={riskScore>60?"down":"flat"} accent="rose"/>
        <KpiCard label={td.kpi.reviews} value={reviews.length}                     sub={`${negCount} ${td.kpi.negative} · ${posCount} ${td.kpi.positive}`} trend={`${unanswered} ${td.kpi.needResponse}`} trendDir="flat" accent="mint"/>
        <KpiCard label={td.kpi.revenue} value="−CHF 8K"                            sub={td.kpi.revenueSub} trend={td.kpi.revenueTrend} trendDir="down" accent="teal"/>
      </Grid>
      <Grid cols={2} gap={16} style={{marginBottom:20}}>
        <Card>
          <SectionHeader title={td.brief.title} subtitle={td.brief.subtitle}/>
          {!brief&&!loading&&<EmptyState icon="◎" title={td.brief.empty} description={td.brief.emptyDesc} action={<Button variant="secondary" onClick={getIntelligenceBrief}>{td.brief.generate}</Button>}/>}
          {loading&&<div style={{padding:'20px 0',display:'flex',alignItems:'center',gap:10,color:'var(--mint)',fontSize:'0.85rem'}}><Spinner/>{td.brief.loading}</div>}
          {brief&&!brief.error&&<>
            <InsightItem iconBg="rgba(232,72,85,.1)" iconColor="var(--rose)" icon="⚠" title={brief.topIssue||td.brief.topIssue} body={brief.topIssueDetail}/>
            <InsightItem iconBg="rgba(2,195,154,.1)" iconColor="var(--mint)" icon="✓" title={brief.topStrength||td.brief.positive} body={brief.topStrengthDetail}/>
            <InsightItem iconBg="rgba(244,162,97,.1)" iconColor="var(--gold)" icon="→" title={td.brief.action} body={brief.urgentAction} last/>
            <Divider/>
            <div style={{background:'var(--navy)',borderRadius:8,padding:'11px 14px',fontSize:'0.82rem',color:'var(--silver)',lineHeight:1.6,borderLeft:'3px solid var(--teal)'}}>{brief.executiveSummary}</div>
          </>}
        </Card>
        <Card>
          <SectionHeader title={td.complaints.title} subtitle={td.complaints.subtitle}/>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {COMPLAINTS.map(b=>(
              <div key={b.label} style={{display:'flex',alignItems:'center',gap:10,fontSize:'0.8rem'}}>
                <div style={{width:80,color:'var(--silver)',textAlign:'right',flexShrink:0}}>{b.label}</div>
                <div style={{flex:1,height:8,background:'var(--navy)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${b.pct}%`,background:b.color,borderRadius:4}}/>
                </div>
                <div style={{width:36,color:b.color,fontFamily:'var(--font-mono)',fontWeight:600,fontSize:'0.76rem'}}>{b.pct}%</div>
              </div>
            ))}
          </div>
          <Divider/>
          <div style={{fontSize:'0.78rem',color:'var(--mid)'}}>
            {td.complaints.top} <strong style={{color:'var(--rose)'}}>{td.complaints.labels.waitTime}</strong> {td.complaints.in} 5 {td.complaints.recentNeg} {td.complaints.recommend}
          </div>
        </Card>
      </Grid>
      <Grid cols={2} gap={16} style={{marginBottom:20}}>
        <Card>
          <SectionHeader title={td.charts.ratingTrend} subtitle={td.charts.sixMonths}/>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={RATING_HISTORY.map(d=>({period:d.p,rating:d.v}))} margin={{top:5,right:10,left:-20,bottom:0}}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F4A261" stopOpacity={0.25}/><stop offset="95%" stopColor="#F4A261" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,131,144,0.1)"/>
              <XAxis dataKey="period" tick={{fill:'var(--mid)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis domain={[4.0,5.0]} tick={{fill:'var(--mid)',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="rating" stroke="var(--gold)" strokeWidth={2} fill="url(#rg)" name={td.charts.rating} unit="★"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionHeader title={td.charts.riskTrend} subtitle={td.charts.sixMonths}/>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={RISK_HISTORY.map(d=>({period:d.p,score:d.v}))} margin={{top:5,right:10,left:-20,bottom:0}}>
              <defs><linearGradient id="rsk" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#E84855" stopOpacity={0.25}/><stop offset="95%" stopColor="#E84855" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(2,131,144,0.1)"/>
              <XAxis dataKey="period" tick={{fill:'var(--mid)',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fill:'var(--mid)',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Area type="monotone" dataKey="score" stroke="var(--rose)" strokeWidth={2} fill="url(#rsk)" name={td.charts.riskScore}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Grid>
      <SectionHeader title={td.alerts.title} subtitle={td.alerts.subtitle}/>
      {hasRisk&&<Alert type="danger" title={td.alerts.compliance}>{td.alerts.complianceSub} <button onClick={()=>navigate('/reviews')} style={{background:'none',border:'none',color:'var(--rose)',cursor:'pointer',fontWeight:600,padding:0,textDecoration:'underline',fontSize:'0.83rem'}}>{td.alerts.viewReview}</button></Alert>}
      {unanswered>0&&<Alert type="warning" title={`${unanswered} ${td.alerts.unanswered}`}>{td.alerts.unansweredSub} <button onClick={()=>navigate('/respond')} style={{background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontWeight:600,padding:0,textDecoration:'underline',fontSize:'0.83rem'}}>{td.alerts.draftResp}</button></Alert>}
      <Alert type="warning" title={td.alerts.competitor}>{td.alerts.competitorSub}</Alert>
    </Layout>
  )
}
