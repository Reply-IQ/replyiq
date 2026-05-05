import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, KpiCard, Button, Alert, InsightItem, SectionHeader, Spinner, EmptyState, Divider } from '../components/UI.jsx'
import { useApp, useRiskScore, useUnanswered } from '../lib/store.jsx'
import { generateBrief } from '../lib/api.js'
import { saveBrief } from '../lib/supabase.js'

const PLATFORM_META = {
  google:      { name: 'Google',      color: '#4285F4', bg: 'rgba(66,133,244,.1)',  icon: '🔍' },
  tripadvisor: { name: 'TripAdvisor', color: '#00AF87', bg: 'rgba(0,175,135,.1)',   icon: '🦉' },
  booking:     { name: 'Booking.com', color: '#003580', bg: 'rgba(0,53,128,.1)',    icon: '🏨' },
  instagram:   { name: 'Instagram',   color: '#E1306C', bg: 'rgba(225,48,108,.1)',  icon: '📸' },
  facebook:    { name: 'Facebook',    color: '#1877F2', bg: 'rgba(24,119,242,.1)',  icon: '📘' },
}
const ALL_PLATFORMS = ['google', 'tripadvisor', 'booking', 'instagram', 'facebook']

const ChartTip = ({ active, payload, label }) => !active || !payload?.length ? null : (
  <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '12px' }}>
    <div style={{ color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
    {payload.map((p, i) => <div key={i} style={{ color: p.color || 'var(--gold)', fontWeight: 600 }}>{p.name}: {p.value}{p.unit || ''}</div>)}
  </div>
)

export default function Dashboard() {
  const { property, reviews, showToast } = useApp()
  const navigate = useNavigate()
  const [brief, setBrief]     = useState(null)
  const [loading, setLoading] = useState(false)
  const riskScore  = useRiskScore(reviews)
  const unans      = useUnanswered(reviews)
  const connections = property?.platform_connections || {}
  const now = new Date()

  const platformStats = useMemo(() => {
    const stats = {}
    reviews.forEach(r => {
      const p = r.platform?.toLowerCase() || 'google'
      if (!stats[p]) stats[p] = { total: 0, unanswered: 0, ratingSum: 0 }
      stats[p].total++
      if (!r.responded) stats[p].unanswered++
      stats[p].ratingSum += r.rating
    })
    return stats
  }, [reviews])

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'
  const thisMonth = reviews.filter(r => { if (!r.review_date) return false; const d = new Date(r.review_date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() })

  const ratingTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const mr = reviews.filter(r => { if (!r.review_date) return false; const rd = new Date(r.review_date); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear() })
      if (mr.length > 0) months.push({ period: d.toLocaleString('en', { month: 'short' }), rating: +(mr.reduce((s, r) => s + r.rating, 0) / mr.length).toFixed(2), count: mr.length })
    }
    return months
  }, [reviews])

  const volumeTrend = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const mr = reviews.filter(r => { if (!r.review_date) return false; const rd = new Date(r.review_date); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear() })
      months.push({ period: d.toLocaleString('en', { month: 'short' }), reviews: mr.length, negative: mr.filter(r => r.rating <= 2).length, positive: mr.filter(r => r.rating >= 4).length })
    }
    return months
  }, [reviews])

  const connectedPlatforms = Object.keys(connections)

  if (connectedPlatforms.length === 0) {
    return (
      <Layout title="Overview" subtitle="Your reputation command centre">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center', gap: 18 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🔗</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem' }}>Connect your first platform</div>
          <div style={{ fontSize: '14px', color: 'var(--text3)', maxWidth: 420, lineHeight: 1.8 }}>Connect Google Business to start importing reviews. Your full dashboard will populate automatically.</div>
          <Button size="lg" onClick={() => navigate('/platforms')} style={{ marginTop: 8 }}>Connect Platforms →</Button>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {ALL_PLATFORMS.map(pid => { const m = PLATFORM_META[pid]; return <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: m.bg, borderRadius: 20, fontSize: '12px', color: m.color, fontWeight: 600 }}>{m.icon} {m.name}</div> })}
          </div>
        </div>
      </Layout>
    )
  }

  async function getIntelligenceBrief() {
    setLoading(true)
    const r = await generateBrief(reviews, property)
    if (r.error) showToast('AI error', 'error')
    else { setBrief(r); if (property?.id) await saveBrief(property.id, r) }
    setLoading(false)
  }

  return (
    <Layout
      title="Overview"
      subtitle={now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      topbarRight={<Button onClick={getIntelligenceBrief} disabled={loading}>{loading ? <><Spinner /> Analysing...</> : '⚡ AI Intelligence Brief'}</Button>}
    >
      {unans > 10 && <Alert type="warning" title={`${unans} reviews waiting for a response`} style={{ marginBottom: 16 }}><button onClick={() => navigate('/inbox')} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline', fontSize: '13px' }}>Reply in Inbox →</button></Alert>}
      {riskScore > 70 && <Alert type="danger" title="High reputation risk detected" style={{ marginBottom: 16 }}>Check the Risk Index for a 7-day recovery plan.</Alert>}

      <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
        <KpiCard icon="⭐" label="Average Rating"    value={`${avgRating}★`}   sub={`${reviews.length.toLocaleString()} total reviews`} accent="gold" />
        <KpiCard icon="💬" label="Unanswered"         value={unans}              sub="Across all platforms" trend={unans > 0 ? `${unans} need reply` : 'All caught up!'} trendDir={unans > 0 ? 'down' : 'up'} accent={unans > 10 ? 'rose' : 'teal'} />
        <KpiCard icon="📅" label="This Month"         value={thisMonth.length}   sub={`${thisMonth.filter(r=>r.rating<=2).length} negative · ${thisMonth.filter(r=>r.rating>=4).length} positive`} accent="emerald" />
        <KpiCard icon="◈"  label="Risk Score"         value={riskScore}          sub="Scale 0–100" trend={riskScore > 60 ? 'Action needed' : 'Looking good'} trendDir={riskScore > 60 ? 'down' : 'up'} accent={riskScore > 60 ? 'rose' : 'emerald'} />
      </Grid>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', fontWeight: 600, marginBottom: 12 }}>Platform Health</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 12 }}>
          {ALL_PLATFORMS.map(pid => {
            const meta = PLATFORM_META[pid]; const conn = connections[pid]; const stats = platformStats[pid]
            const isConn = !!conn; const avgR = stats ? (stats.ratingSum / stats.total).toFixed(1) : null
            const responseRate = stats ? Math.round(((stats.total - stats.unanswered) / stats.total) * 100) : 0
            if (!isConn) return (
              <div key={pid} onClick={() => navigate('/platforms')} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px', opacity: 0.4, cursor: 'pointer', transition: 'var(--ease)' }} onMouseEnter={e => { e.currentTarget.style.opacity='0.7'; e.currentTarget.style.borderColor=meta.color+'55' }} onMouseLeave={e => { e.currentTarget.style.opacity='0.4'; e.currentTarget.style.borderColor='var(--border)' }}>
                <div style={{ fontSize: '22px', marginBottom: 10 }}>{meta.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>{meta.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: 8 }}>Not connected</div>
                <div style={{ fontSize: '11px', color: meta.color, fontWeight: 600 }}>+ Connect →</div>
              </div>
            )
            return (
              <div key={pid} style={{ background: 'var(--card)', border: `1px solid ${meta.color}30`, borderRadius: 'var(--r-lg)', padding: '16px', borderTop: `3px solid ${meta.color}`, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4A7C6F' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>Live</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{meta.icon}</div>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>{meta.name}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', color: meta.color, lineHeight: 1 }}>{avgR}★</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: 3 }}>{(stats?.total || 0).toLocaleString()} reviews</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '11px' }}>
                    <span style={{ color: 'var(--text3)' }}>Response rate</span>
                    <span style={{ fontWeight: 600, color: responseRate >= 80 ? '#4A7C6F' : '#B85C38' }}>{responseRate}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${responseRate}%`, background: responseRate >= 80 ? '#4A7C6F' : '#B85C38', borderRadius: 2, transition: 'width 1.2s ease' }} />
                  </div>
                </div>
                {stats?.unanswered > 0 ? (
                  <button onClick={() => navigate('/inbox')} style={{ width: '100%', padding: '7px 10px', background: 'rgba(184,92,56,.06)', border: '1px solid rgba(184,92,56,.2)', borderRadius: 8, color: '#B85C38', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>⚠ {stats.unanswered} unanswered — Reply →</button>
                ) : (
                  <div style={{ padding: '7px 10px', background: 'rgba(74,124,111,.06)', border: '1px solid rgba(74,124,111,.2)', borderRadius: 8, color: '#4A7C6F', fontSize: '11px', fontWeight: 600, textAlign: 'center' }}>✓ All replied</div>
                )}
                {conn.lastSyncedAt && <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: 8, textAlign: 'center' }}>Synced {new Date(conn.lastSyncedAt).toLocaleDateString()}</div>}
              </div>
            )
          })}
        </div>
      </div>

      <Grid cols={2} gap={16} style={{ marginBottom: 20 }}>
        <Card>
          <SectionHeader title="AI Intelligence Brief" subtitle="Powered by ReplyIQ AI" />
          {!brief && !loading && <EmptyState icon="🤖" title="Weekly intelligence brief" description="AI analyses all your reviews and generates a personalised brief — top issues, strengths, and recommended actions." action={<Button variant="secondary" onClick={getIntelligenceBrief}>Generate Now</Button>} />}
          {loading && <div style={{ padding: '28px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gold)', fontSize: '13px' }}><Spinner /> Analysing {reviews.length.toLocaleString()} reviews...</div>}
          {brief && !brief.error && <>
            <InsightItem iconBg="rgba(184,92,56,.1)"   iconColor="#B85C38"     icon="⚠" title={brief.topIssue    || 'Top Issue'}    body={brief.topIssueDetail}    />
            <InsightItem iconBg="rgba(74,124,111,.1)"  iconColor="#4A7C6F"     icon="✓" title={brief.topStrength || 'Top Strength'}  body={brief.topStrengthDetail} />
            <InsightItem iconBg="rgba(201,169,110,.1)" iconColor="var(--gold)" icon="→" title="This Week's Priority"                 body={brief.urgentAction} last />
            <Divider />
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.65, borderLeft: '3px solid var(--gold)' }}>{brief.executiveSummary}</div>
          </>}
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: 2 }}>Needs Reply</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{unans > 0 ? `${unans} unanswered reviews` : 'All caught up ✓'}</div>
            </div>
            {unans > 0 && <span style={{ background: 'rgba(184,92,56,.1)', color: '#B85C38', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 20, border: '1px solid rgba(184,92,56,.2)' }}>{unans} pending</span>}
          </div>
          {unans === 0 ? <EmptyState icon="✓" title="All reviews replied to" description="Great work! Come back when new reviews arrive." /> : <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {reviews.filter(r => !r.responded).slice(0, 5).map(r => {
                const meta = PLATFORM_META[r.platform?.toLowerCase()] || PLATFORM_META.google
                const isUrgent = r.rating <= 2
                return (
                  <div key={r.id} onClick={() => navigate('/inbox')} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface)', border: `1px solid ${isUrgent ? 'rgba(184,92,56,.2)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start', transition: 'var(--ease)' }} onMouseEnter={e => e.currentTarget.style.borderColor = meta.color + '60'} onMouseLeave={e => e.currentTarget.style.borderColor = isUrgent ? 'rgba(184,92,56,.2)' : 'var(--border)'}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{r.author}</span>
                        <div style={{ display: 'flex', gap: 1 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= r.rating ? '#C9A96E' : 'var(--border)', fontSize: '10px' }}>★</span>)}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.text || '(No text)'}</div>
                    </div>
                    {isUrgent && <span style={{ fontSize: '10px', color: '#B85C38', fontWeight: 700, flexShrink: 0 }}>⚠</span>}
                  </div>
                )
              })}
            </div>
            <Button variant="secondary" fullWidth size="sm" onClick={() => navigate('/inbox')}>Reply to All in Inbox →</Button>
          </>}
        </Card>
      </Grid>

      <Grid cols={2} gap={16}>
        <Card>
          <SectionHeader title="Rating Trend" subtitle="Last 6 months — real data" />
          {ratingTrend.length < 2 ? <div style={{ padding: '24px 0', fontSize: '13px', color: 'var(--text3)', textAlign: 'center', lineHeight: 1.7 }}>Not enough monthly data yet.</div> : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={ratingTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A96E" stopOpacity={0.25} /><stop offset="95%" stopColor="#C9A96E" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[3.0, 5.0]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="rating" stroke="var(--gold)" strokeWidth={2.5} fill="url(#rg)" name="Avg Rating" unit="★" dot={{ fill: 'var(--gold)', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <SectionHeader title="Review Volume" subtitle="Last 6 months" />
          {volumeTrend.every(m => m.reviews === 0) ? <div style={{ padding: '24px 0', fontSize: '13px', color: 'var(--text3)', textAlign: 'center' }}>No review data yet.</div> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={volumeTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="positive" name="Positive" stackId="a" fill="#4A7C6F" opacity={0.8} radius={[0,0,0,0]} />
                <Bar dataKey="negative" name="Negative" stackId="a" fill="#B85C38" opacity={0.85} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Grid>
    </Layout>
  )
}
