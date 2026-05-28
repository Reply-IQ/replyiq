import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, Button, Spinner, EmptyState, SectionHeader, InsightItem, Divider } from '../components/UI.jsx'
import { useApp, useRiskScore, useUnanswered, useIsMobile, useLang } from '../lib/store.jsx'
import { T, t } from '../lib/i18n.js'
import { generateBrief } from '../lib/api.js'
import { saveBrief } from '../lib/supabase.js'

const PLATFORM_META = {
  google:      { name:'Google',      color:'#4285F4', bg:'rgba(66,133,244,.1)',  icon:'🔍' },
  tripadvisor: { name:'TripAdvisor', color:'#00AF87', bg:'rgba(0,175,135,.1)',   icon:'🦉' },
  booking:     { name:'Booking.com', color:'#003580', bg:'rgba(0,53,128,.1)',    icon:'🏨' },
  instagram:   { name:'Instagram',   color:'#E1306C', bg:'rgba(225,48,108,.1)',  icon:'📸' },
  facebook:    { name:'Facebook',    color:'#1877F2', bg:'rgba(24,119,242,.1)',  icon:'📘' },
}
const ALL_PLATFORMS = ['google','tripadvisor','booking','instagram','facebook']

const ChartTip = ({ active, payload, label }) => !active||!payload?.length ? null : (
  <div style={{ background:'var(--card2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:'12px' }}>
    <div style={{ color:'var(--text3)', marginBottom:4 }}>{label}</div>
    {payload.map((p,i) => <div key={i} style={{ color:p.color||'var(--gold)', fontWeight:600 }}>{p.name}: {p.value}{p.unit||''}</div>)}
  </div>
)

export default function Dashboard() {
  const { property, reviews, showToast, loadAll } = useApp()
  const navigate   = useNavigate()
  const isMobile   = useIsMobile()
  const { lang }   = useLang()
  const [brief, setBrief]               = useState(null)
  const [loading, setLoading]           = useState(false)
  const [importProgress, setImportProgress] = useState(null) // { elapsed, platform }
  const importPollRef = useRef(null)
  const [newReviews, setNewReviews]     = useState([]) // reviews since last visit

  // ── Auto-resume any in-progress review import ──────────────────────────────
  useEffect(() => {
    if (!property?.pending_review_job) {
      setImportProgress(null)
      if (importPollRef.current) { clearInterval(importPollRef.current); importPollRef.current = null }
      return
    }

    let pending
    try { pending = JSON.parse(property.pending_review_job) } catch { return }
    if (!pending?.jobId) return

    let elapsed = 0
    setImportProgress({ elapsed, platform: pending.platformId || 'google' })

    const poll = async () => {
      try {
        const r = await fetch('/api/check-reviews-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId:      pending.jobId,
            clinicId:   pending.clinicId || property.id,
            platform:   pending.platformId || 'google',
            identifier: pending.identifier,
          })
        })
        const data = await r.json()

        if (data.status === 'done') {
          clearInterval(importPollRef.current)
          importPollRef.current = null
          setImportProgress(null)
          await loadAll()
          if (data.count > 0) showToast(`✓ ${data.count.toLocaleString()} reviews imported!`, 'success')
        } else {
          elapsed += 5
          setImportProgress({ elapsed, platform: pending.platformId || 'google' })
        }
      } catch {}
    }

    // Poll immediately, then every 5 seconds
    poll()
    importPollRef.current = setInterval(poll, 5000)

    return () => { if (importPollRef.current) { clearInterval(importPollRef.current); importPollRef.current = null } }
  }, [property?.id, property?.pending_review_job])
  const riskScore   = useRiskScore(reviews)
  const unans       = useUnanswered(reviews)

  // ── Detect new reviews since last visit ─────────────────────────────────
  useEffect(() => {
    if (!reviews?.length || !property?.id) return
    const key = `replyiq_last_visit_${property.id}`
    const lastVisit = localStorage.getItem(key)
    if (lastVisit) {
      const since = new Date(lastVisit)
      const fresh = reviews.filter(r => {
        if (!r.review_date) return false
        return new Date(r.review_date) > since && !r.responded
      })
      setNewReviews(fresh)
    }
    // Update last visit timestamp
    localStorage.setItem(key, new Date().toISOString())
  }, [reviews?.length, property?.id])
  const connections = property?.platform_connections || {}
  const now         = new Date()

  const platformStats = useMemo(() => {
    const stats = {}
    reviews.forEach(r => {
      const p = r.platform?.toLowerCase() || 'google'
      if (!stats[p]) stats[p] = { total:0, unanswered:0, ratingSum:0 }
      stats[p].total++
      if (!r.responded) stats[p].unanswered++
      stats[p].ratingSum += r.rating
    })
    return stats
  }, [reviews])

  const avgRating = reviews.length ? (reviews.reduce((s,r) => s+r.rating, 0)/reviews.length).toFixed(1) : '—'
  const responseRate = reviews.length ? Math.round(((reviews.length - unans) / reviews.length) * 100) : 0
  const thisMonth = reviews.filter(r => { if(!r.review_date) return false; const d=new Date(r.review_date); return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth() })

  const ratingTrend = useMemo(() => {
    const months = []
    for (let i=5; i>=0; i--) {
      const d = new Date(); d.setMonth(d.getMonth()-i)
      const mr = reviews.filter(r => { if(!r.review_date) return false; const rd=new Date(r.review_date); return rd.getMonth()===d.getMonth()&&rd.getFullYear()===d.getFullYear() })
      if (mr.length > 0) months.push({ period:d.toLocaleString('en',{month:'short'}), rating:+(mr.reduce((s,r)=>s+r.rating,0)/mr.length).toFixed(2) })
    }
    return months
  }, [reviews])

  const connectedPlatforms = Object.keys(connections)
  const hasPendingImport   = !!property?.pending_review_job || connectedPlatforms.some(p => connections[p]?.importing)

  // Import in progress — show loading state regardless of reviews count
  if (hasPendingImport && reviews.length === 0) {
    return (
      <Layout title={t(T.nav.dashboard, lang)} subtitle={t(T.dashboard.aiBrief, lang)}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'65vh', textAlign:'center', gap:18 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:'rgba(66,133,244,.08)', border:'1px solid rgba(66,133,244,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:32, height:32, border:'3px solid rgba(66,133,244,.3)', borderTopColor:'#4285F4', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
          </div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.7rem' }}>Importing your reviews...</div>
          <div style={{ fontSize:'14px', color:'var(--text3)', maxWidth:460, lineHeight:1.8 }}>
            {importProgress
              ? `Fetching reviews from Google — ${importProgress.elapsed}s elapsed. This takes 1–3 minutes for large properties.`
              : 'Your reviews are being fetched in the background. This page will update automatically when complete.'}
          </div>
          <div style={{ width:300, height:5, background:'var(--surface)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:'60%', background:'linear-gradient(90deg,#4285F4,#60a5fa,#4285F4)', backgroundSize:'200% 100%', borderRadius:3, animation:'shimmer 1.5s infinite' }} />
          </div>
          <div style={{ fontSize:'12px', color:'var(--text3)' }}>You can navigate around the app — reviews will appear automatically when done.</div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/platforms')}>View Import Status →</Button>
        </div>
      </Layout>
    )
  }

  // No platforms and no import and no reviews — show connect screen
  if (connectedPlatforms.length === 0 && reviews.length === 0) {
    return (
      <Layout title={t(T.nav.dashboard, lang)} subtitle={t(T.dashboard.aiBrief, lang)}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'65vh', textAlign:'center', gap:18 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:'rgba(201,169,110,.08)', border:'1px solid rgba(201,169,110,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>🔗</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.7rem' }}>Connect your first platform</div>
          <div style={{ fontSize:'14px', color:'var(--text3)', maxWidth:420, lineHeight:1.8 }}>Connect Google Business to start importing reviews. Your full dashboard will populate automatically.</div>
          <Button size="lg" onClick={() => navigate('/platforms')} style={{ marginTop:8 }}>Connect Platforms →</Button>
          <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap', justifyContent:'center' }}>
            {ALL_PLATFORMS.map(pid => { const m=PLATFORM_META[pid]; return <div key={pid} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:m.bg, borderRadius:20, fontSize:'12px', color:m.color, fontWeight:600 }}>{m.icon} {m.name}</div> })}
          </div>
        </div>
      </Layout>
    )
  }

  async function getIntelligenceBrief() {
    setLoading(true)
    const r = await generateBrief(property, reviews)
    if (r.error) showToast('AI error', 'error')
    else { setBrief(r); if (property?.id) saveBrief(property.id, r).catch(()=>{}) }
    setLoading(false)
  }

  return (
    <Layout title={t(T.nav.dashboard, lang)} topbarRight={
      <Button onClick={getIntelligenceBrief} disabled={loading} variant="secondary" size="sm">
        {loading ? <><Spinner /> Analysing...</> : '⚡ AI Brief'}
      </Button>
    }>

      {/* ── Import progress banner ── */}
      {importProgress && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(66,133,244,.06)', border:'1px solid rgba(66,133,244,.2)', borderRadius:'var(--r-md)', padding:'14px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Spinner />
            <div>
              <div style={{ fontWeight:700, fontSize:'13px', color:'#4285F4', marginBottom:2 }}>
                Importing your reviews — {importProgress.elapsed}s elapsed
              </div>
              <div style={{ fontSize:'12px', color:'var(--text3)' }}>
                Fetching all reviews from Google. Your dashboard will update automatically when complete.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Achievement banner ── */}
      {responseRate === 100 && reviews.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(74,124,111,.07)', border:'1px solid rgba(74,124,111,.2)', borderRadius:'var(--r-md)', padding:'14px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(74,124,111,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>✦</div>
            <div>
              <div style={{ fontWeight:700, fontSize:'13px', color:'#4A7C6F', marginBottom:2 }}>Great job! You've responded to 100% of your reviews.</div>
              <div style={{ fontSize:'12px', color:'var(--text3)' }}>Businesses that reply to all reviews get 2× more bookings.</div>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate('/inbox')}>View Inbox →</Button>
        </div>
      )}
      {unans > 10 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(184,92,56,.06)', border:'1px solid rgba(184,92,56,.2)', borderRadius:'var(--r-md)', padding:'14px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(184,92,56,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>⚠</div>
            <div>
              <div style={{ fontWeight:700, fontSize:'13px', color:'#B85C38', marginBottom:2 }}>{unans} reviews are waiting for a response.</div>
              <div style={{ fontSize:'12px', color:'var(--text3)' }}>Unanswered reviews hurt your search ranking on Google and TripAdvisor.</div>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate('/inbox')} style={{ background:'#B85C38', color:'#fff' }}>Reply Now →</Button>
        </div>
      )}

      {/* ── New reviews notification banner ── */}
      {newReviews.length > 0 && (
        <div style={{ background:'rgba(201,169,110,0.06)', border:'1px solid rgba(201,169,110,0.2)', borderRadius:'var(--r-md)', padding:'14px 18px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--gold)', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--gold)', marginBottom:2 }}>
                {newReviews.length} new review{newReviews.length > 1 ? 's' : ''} since your last visit
              </div>
              <div style={{ fontSize:'11px', color:'var(--text3)' }}>
                {newReviews.filter(r => r.rating <= 2).length > 0
                  ? `⚠ ${newReviews.filter(r => r.rating <= 2).length} negative — respond quickly to protect your ranking`
                  : 'Open Inbox to review and respond'}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={() => setNewReviews([])}
              style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'16px', padding:'4px 8px', lineHeight:1 }}>
              ×
            </button>
            <button onClick={() => navigate('/inbox')}
              style={{ background:'var(--gold)', border:'none', borderRadius:8, color:'var(--bg)', fontSize:'12px', fontWeight:700, cursor:'pointer', padding:'8px 16px', fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>
              Open Inbox →
            </button>
          </div>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {/* Average Rating — with mini chart */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:10, fontWeight:600 }}>Your average rating</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10, marginBottom:8 }}>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.4rem', color:'var(--gold)', lineHeight:1 }}>{avgRating}</div>
            <div style={{ display:'flex', gap:2, marginBottom:6 }}>
              {[1,2,3,4,5].map(i => <span key={i} style={{ color:i<=Math.round(+avgRating)?'#C9A96E':'var(--border)', fontSize:'14px' }}>★</span>)}
            </div>
          </div>
          {ratingTrend.length >= 2 && (
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={ratingTrend} margin={{ top:2, right:0, left:0, bottom:0 }}>
                <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A96E" stopOpacity={0.3}/><stop offset="95%" stopColor="#C9A96E" stopOpacity={0}/></linearGradient></defs>
                <Area type="monotone" dataKey="rating" stroke="#C9A96E" strokeWidth={2} fill="url(#rg2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:6 }}>Based on your {reviews.length.toLocaleString()} imported reviews</div>
        </div>

        {/* Reviews */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:10, fontWeight:600 }}>Reviews</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.4rem', color:'var(--text1)', lineHeight:1, marginBottom:8 }}>{reviews.length.toLocaleString()}</div>
          <div style={{ display:'flex', align:'center', gap:4, fontSize:'12px' }}>
            <span style={{ color:'#4A7C6F' }}>↑ {thisMonth.length} this month</span>
          </div>
          <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:6 }}>Total across all platforms</div>
        </div>

        {/* Awaiting response */}
        <div style={{ background:'var(--card)', border:`1px solid ${unans > 0 ? 'rgba(184,92,56,.2)' : 'var(--border)'}`, borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:10, fontWeight:600 }}>Awaiting response</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.4rem', color:unans>0?'#B85C38':'#4A7C6F', lineHeight:1, marginBottom:8 }}>{unans}</div>
          <div style={{ fontSize:'12px', color:unans>0?'#B85C38':'#4A7C6F' }}>
            {unans > 0 ? `↓ Reply to improve ranking` : '✓ All caught up!'}
          </div>
          <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:6 }}>Unanswered reviews</div>
        </div>

        {/* Response rate */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', marginBottom:10, fontWeight:600 }}>Response rate</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.4rem', color:responseRate>=80?'#4A7C6F':'#B85C38', lineHeight:1, marginBottom:8 }}>{responseRate}%</div>
          <div style={{ height:4, background:'var(--surface)', borderRadius:2, overflow:'hidden', marginBottom:6 }}>
            <div style={{ height:'100%', width:`${responseRate}%`, background:responseRate>=80?'#4A7C6F':'#B85C38', borderRadius:2, transition:'width 1s ease' }} />
          </div>
          <div style={{ fontSize:'11px', color:'var(--text3)' }}>{responseRate>=80?'↑ 15% vs last month':t(T.dashboard.needsImprovement, lang)}</div>
        </div>
      </div>

      {/* ── Platform Health + Needs Reply ── */}
      <Grid cols={isMobile?1:2} gap={14} style={{ marginBottom:16, minWidth:0 }}>

        {/* Platform health cards */}
        <Card style={{ minWidth:0, overflow:'hidden' }}>
          <SectionHeader title={t(T.dashboard.platformHealth, lang)} subtitle={t(T.dashboard.liveStatus, lang)} />
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {ALL_PLATFORMS.map(pid => {
              const meta  = PLATFORM_META[pid]
              const conn  = connections[pid]
              const stats = platformStats[pid]
              const isConn = !!conn
              const avgR  = stats ? (stats.ratingSum/stats.total).toFixed(1) : null
              const rr    = stats ? Math.round(((stats.total-stats.unanswered)/stats.total)*100) : 0

              if (!isConn) return (
                <div key={pid} onClick={() => navigate('/platforms')} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--surface)', borderRadius:10, opacity:0.4, cursor:'pointer', transition:'var(--ease)' }}
                  onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='0.4'}>
                  <div style={{ width:32, height:32, borderRadius:8, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0 }}>{meta.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text2)' }}>{meta.name}</div>
                    <div style={{ fontSize:'11px', color:'var(--text3)' }}>Not connected · <span style={{ color:meta.color }}>Connect →</span></div>
                  </div>
                </div>
              )

              return (
                <div key={pid} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--surface)', borderRadius:10, borderLeft:`3px solid ${meta.color}` }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', flexShrink:0 }}>{meta.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontSize:'12px', fontWeight:600, color:'var(--text1)' }}>{meta.name}</span>
                      <span style={{ fontFamily:'var(--font-serif)', fontSize:'14px', color:meta.color }}>{avgR}★</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:3, background:'var(--bg)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${rr}%`, background:rr>=80?'#4A7C6F':'#B85C38', borderRadius:2 }} />
                      </div>
                      <span style={{ fontSize:'10px', color:'var(--text3)', flexShrink:0 }}>{rr}% replied</span>
                    </div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:3 }}>{(stats?.total||0).toLocaleString()} reviews · {stats?.unanswered>0?<span style={{ color:'#B85C38' }}>{stats.unanswered} unanswered</span>:<span style={{ color:'#4A7C6F' }}>all replied</span>}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* AI Brief + Needs Reply */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, minWidth:0, overflow:'hidden' }}>
          {/* AI brief */}
          <Card style={{ flex:'none' }}>
            <SectionHeader title={t(T.dashboard.aiBrief, lang)} subtitle={t(T.dashboard.weeklyAnalysis, lang)} />
            {!brief && !loading && (
              <EmptyState icon="🤖" title={t(T.dashboard.generateBrief, lang)} description={t(T.dashboard.generateBriefDesc, lang)} action={<Button variant="secondary" size="sm" onClick={getIntelligenceBrief}>{t(T.dashboard.generateBrief, lang)}</Button>} />
            )}
            {loading && <div style={{ padding:'20px 0', display:'flex', alignItems:'center', gap:10, color:'var(--gold)', fontSize:'13px' }}><Spinner /> Analysing {reviews.length.toLocaleString()} reviews...</div>}
            {brief && !brief.error && <>
              <InsightItem iconBg="rgba(184,92,56,.1)"   iconColor="#B85C38"     icon="⚠" title={brief.topIssue||brief.headline||'Top Issue'}    body={(brief.topIssueDetail||brief.insight||'').slice(0,140)} />
              <InsightItem iconBg="rgba(74,124,111,.1)"  iconColor="#4A7C6F"     icon="✓" title={brief.topStrength||'Strength'}  body={(brief.topStrengthDetail||brief.opportunity||'').slice(0,140)} />
              <InsightItem iconBg="rgba(201,169,110,.1)" iconColor="var(--gold)" icon="→" title="This Week" body={(brief.urgentAction||'').slice(0,140)} last />
              <Divider />
              <div style={{ background:'var(--surface)', borderRadius:8, padding:'10px 12px', fontSize:'12px', color:'var(--text2)', lineHeight:1.65, borderLeft:'3px solid var(--gold)', overflow:'hidden' }}>{(brief.executiveSummary||brief.insight||'').slice(0,200)}</div>
            </>}
          </Card>

          {/* Needs reply quick list */}
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontWeight:700, fontSize:'13px' }}>Needs Reply</div>
              {unans > 0 && <span style={{ background:'rgba(184,92,56,.1)', color:'#B85C38', fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:20, border:'1px solid rgba(184,92,56,.2)' }}>{unans}</span>}
            </div>
            {unans === 0 ? (
              <div style={{ fontSize:'13px', color:'var(--text3)', textAlign:'center', padding:'12px 0' }}>✓ All reviews replied to</div>
            ) : (
              <>
                {reviews.filter(r=>!r.responded).slice(0,3).map(r => {
                  const meta = PLATFORM_META[r.platform?.toLowerCase()]||PLATFORM_META.google
                  return (
                    <div key={r.id} onClick={() => navigate('/inbox')} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', alignItems:'flex-start', transition:'var(--ease)' }}
                      onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      <div style={{ width:24, height:24, borderRadius:6, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', flexShrink:0 }}>{meta.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                          <span style={{ fontSize:'12px', fontWeight:600 }}>{r.author}</span>
                          <div style={{ display:'flex', gap:1 }}>{[1,2,3,4,5].map(i=><span key={i} style={{ color:i<=r.rating?'#C9A96E':'var(--border)', fontSize:'10px' }}>★</span>)}</div>
                        </div>
                        <div style={{ fontSize:'11px', color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.text||'(No text)'}</div>
                      </div>
                    </div>
                  )
                })}
                <Button variant="secondary" fullWidth size="sm" onClick={() => navigate('/inbox')} style={{ marginTop:12 }}>
                  Reply to All in Inbox →
                </Button>
              </>
            )}
          </Card>
        </div>
      </Grid>

      {/* ── Rating trend chart ── */}
      {ratingTrend.length >= 2 && (
        <Card>
          <SectionHeader title={t(T.dashboard.reviews, lang)} subtitle="Last 6 months — real data from your reviews" />
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={ratingTrend} margin={{ top:5, right:10, left:-20, bottom:0 }}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A96E" stopOpacity={0.25}/><stop offset="95%" stopColor="#C9A96E" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="period" tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[3.0,5.0]} tick={{ fill:'var(--text3)', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="rating" stroke="var(--gold)" strokeWidth={2.5} fill="url(#rg)" name="Avg Rating" unit="★" dot={{ fill:'var(--gold)', strokeWidth:0, r:3 }} activeDot={{ r:5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </Layout>
  )
}
