import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, KpiCard, Button, Alert, InsightItem, SectionHeader, Spinner, EmptyState, Divider, PlatformBadge, Stars } from '../components/UI.jsx'
import { useApp, useRiskScore, useUnanswered } from '../lib/store.jsx'
import { generateBrief } from '../lib/api.js'
import { saveBrief } from '../lib/supabase.js'

const RATING_H = [{ p:'Nov',v:4.5},{p:'Dec',v:4.4},{p:'Jan',v:4.5},{p:'Feb',v:4.6},{p:'Mar',v:4.7},{p:'Apr',v:4.8}]
const RISK_H   = [{ p:'Nov',v:55},{p:'Dec',v:60},{p:'Jan',v:52},{p:'Feb',v:48},{p:'Mar',v:42},{p:'Apr',v:38}]

const Tip = ({ active, payload, label }) => !active || !payload?.length ? null : (
  <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '12px' }}>
    <div style={{ color: 'var(--text3)', marginBottom: 2 }}>{label}</div>
    {payload.map((p, i) => <div key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}{p.unit || ''}</div>)}
  </div>
)

export default function Dashboard() {
  const { property, reviews, showToast } = useApp()
  const navigate = useNavigate()
  const [brief, setBrief]     = useState(null)
  const [loading, setLoading] = useState(false)
  const riskScore = useRiskScore(reviews)
  const unans     = useUnanswered(reviews)

  const now = new Date()
  const thisMonth = reviews.filter(r => {
    if (!r.review_date) return false
    const d = new Date(r.review_date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const pos     = thisMonth.filter(r => r.rating >= 4).length
  const neg     = thisMonth.filter(r => r.rating <= 2).length
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : property?.google_rating || '4.5'

  // Platform breakdown
  const byPlatform = {}
  reviews.forEach(r => {
    const p = r.platform || 'Google'
    byPlatform[p] = (byPlatform[p] || 0) + 1
  })

  async function getIntelligenceBrief() {
    setLoading(true)
    const r = await generateBrief(reviews, property)
    if (r.error) showToast('AI error — check API key', 'error')
    else { setBrief(r); if (property?.id) await saveBrief(property.id, r) }
    setLoading(false)
  }

  return (
    <Layout title="Overview" subtitle={`Week of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      topbarRight={
        <Button onClick={getIntelligenceBrief} disabled={loading}>
          {loading ? <><Spinner /> Analysing...</> : '⚡ AI Intelligence Brief'}
        </Button>
      }
    >
      {/* KPI Row */}
      <Grid cols={4} gap={14} style={{ marginBottom: 20 }}>
        <KpiCard icon="⭐" label="Average Rating"    value={`${avgRating}★`}         sub="All platforms" trend="+0.2 this month" trendDir="up"   accent="gold" />
        <KpiCard icon="◈" label="Risk Score"        value={riskScore}                sub="Scale 0–100"   trend={riskScore > 60 ? 'Action needed' : 'Looking good'} trendDir={riskScore > 60 ? 'down' : 'up'} accent={riskScore > 60 ? 'rose' : 'emerald'} />
        <KpiCard icon="📝" label="Reviews This Month" value={thisMonth.length}        sub={`${neg} negative · ${pos} positive`} trend={`${unans} need reply`} trendDir={unans > 0 ? 'down' : 'flat'} accent="teal" />
        <KpiCard icon="💰" label="Revenue at Risk"   value="~CHF 8K"                 sub="Monthly est."  trend="vs. target rating" trendDir="down" accent="violet" />
      </Grid>

      {/* AI Brief + Recent */}
      <Grid cols={2} gap={16} style={{ marginBottom: 20 }}>
        <Card>
          <SectionHeader title="AI Intelligence Brief" subtitle="Powered by ReplyIQ AI" />
          {!brief && !loading && (
            <EmptyState icon="🤖" title="Intelligence brief ready" description="Click 'AI Intelligence Brief' above to generate your personalised weekly analysis" action={<Button variant="secondary" onClick={getIntelligenceBrief}>Generate Now</Button>} />
          )}
          {loading && (
            <div style={{ padding: '24px 0', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gold)', fontSize: '13px' }}>
              <Spinner /> Analysing {reviews.length} reviews across {Object.keys(byPlatform).length} platforms...
            </div>
          )}
          {brief && !brief.error && (
            <>
              <InsightItem iconBg="rgba(184,92,56,.1)" iconColor="#B85C38" icon="⚠" title={brief.topIssue || 'Top Issue'} body={brief.topIssueDetail} />
              <InsightItem iconBg="rgba(74,124,111,.1)" iconColor="#4A7C6F" icon="✓" title={brief.topStrength || 'Top Strength'} body={brief.topStrengthDetail} />
              <InsightItem iconBg="rgba(201,169,110,.1)" iconColor="var(--gold)" icon="→" title="This Week's Priority" body={brief.urgentAction} last />
              <Divider />
              <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '11px 14px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6, borderLeft: '3px solid var(--gold)' }}>
                {brief.executiveSummary}
              </div>
            </>
          )}
        </Card>

        <Card>
          <SectionHeader title="Platform Breakdown" subtitle="Reviews by source" />
          {Object.keys(byPlatform).length === 0 ? (
            <EmptyState icon="⊛" title="No platforms connected" description="Go to Platforms to connect Google, TripAdvisor and more" action={<Button variant="secondary" size="sm" onClick={() => navigate('/platforms')}>Connect Platforms</Button>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(byPlatform).map(([platform, count]) => {
                const pct = Math.round((count / reviews.length) * 100)
                const unansweredOnPlatform = reviews.filter(r => r.platform === platform && !r.responded).length
                return (
                  <div key={platform}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <PlatformBadge platform={platform} />
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                        {count} reviews · {unansweredOnPlatform > 0 ? <span style={{ color: '#B85C38' }}>{unansweredOnPlatform} unanswered</span> : <span style={{ color: '#4A7C6F' }}>all replied</span>}
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--gold),var(--amber)))', borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {reviews.length > 0 && (
            <>
              <Divider />
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: 8 }}>Recent reviews</div>
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                  <Stars n={r.rating} size="12px" />
                  <div style={{ flex: 1, fontSize: '12px', color: 'var(--text2)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.text}</div>
                  <PlatformBadge platform={r.platform} />
                </div>
              ))}
              <Button variant="secondary" size="sm" fullWidth style={{ marginTop: 12 }} onClick={() => navigate('/inbox')}>
                View All in Inbox →
              </Button>
            </>
          )}
        </Card>
      </Grid>

      {/* Charts */}
      <Grid cols={2} gap={16} style={{ marginBottom: 20 }}>
        <Card>
          <SectionHeader title="Rating Trend" subtitle="6 months" />
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={RATING_H.map(d => ({ period: d.p, rating: d.v }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A96E" stopOpacity={0.2} /><stop offset="95%" stopColor="#C9A96E" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="period" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[4.0, 5.0]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="rating" stroke="var(--gold)" strokeWidth={2} fill="url(#rg)" name="Rating" unit="★" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionHeader title="Risk Score Trend" subtitle="6 months" />
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={RISK_H.map(d => ({ period: d.p, score: d.v }))} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="rsk" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4A7C6F" stopOpacity={0.2} /><stop offset="95%" stopColor="#4A7C6F" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
              <XAxis dataKey="period" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="score" stroke="#4A7C6F" strokeWidth={2} fill="url(#rsk)" name="Risk Score" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      {/* Alerts */}
      {unans > 0 && (
        <Alert type="warning" title={`${unans} reviews need a response`}>
          Unanswered reviews hurt your ranking on TripAdvisor and Google. <button onClick={() => navigate('/inbox')} style={{ background: 'none', border: 'none', color: '#C9A96E', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline', fontSize: '13px' }}>Reply in Inbox →</button>
        </Alert>
      )}
      {riskScore > 70 && (
        <Alert type="danger" title="High reputation risk detected">
          Your risk score is elevated. Check the Risk Index for a detailed breakdown and 7-day recovery plan.
        </Alert>
      )}
    </Layout>
  )
}
