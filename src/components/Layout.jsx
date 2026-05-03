import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RiskBadge, TrialBanner, UpgradeModal } from './UI.jsx'
import { useApp, useRiskScore, useUnanswered } from '../lib/store.jsx'
import { signOut } from '../lib/supabase.js'

const NAV = [
  { path: '/',          label: 'Overview',     icon: '▦' },
  { path: '/inbox',     label: 'Inbox',        icon: '◎', badge: true },
  { path: '/reviews',   label: 'Reviews',      icon: '✦' },
  { path: '/respond',   label: 'AI Respond',   icon: '✍' },
  { path: '/risk',      label: 'Risk Index',   icon: '◈' },
  { path: '/revenue',   label: 'ROI Impact',   icon: '◆' },
  { path: '/competitors', label: 'Competitors', icon: '⊞' },
  { path: '/report',    label: 'Report',       icon: '▤' },
  { path: '/platforms', label: 'Platforms',    icon: '⊛' },
  { path: '/settings',  label: 'Settings',     icon: '⚙' },
]

export function Layout({ children, title, subtitle, topbarRight }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { property, reviews, showToast, trialStatus, trialActive, trialExpired, aiUsed, aiLimit, aiRemaining, daysLeft, canUseAI } = useApp()
  const [showUpgrade, setShowUpgrade] = useState(false)

  async function handleCheckout(plan) {
    try {
      const r = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, clinicId: property?.id, email: property?.owner_email }),
      })
      const data = await r.json()
      if (data.url) window.location.href = data.url
      else showToast('Stripe not configured yet — add STRIPE_SECRET_KEY to Vercel', 'error')
    } catch (e) { showToast('Checkout failed: ' + e.message, 'error') }
  }
  const riskScore = useRiskScore(reviews)
  const unans = useUnanswered(reviews)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 220, minWidth: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', letterSpacing: '-0.5px', color: 'var(--white)' }}>
            Reply<span style={{ color: '#C9A96E' }}>IQ</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: 3, fontWeight: 500 }}>
            Reputation Intelligence
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1.5px', padding: '6px 10px 8px', fontWeight: 600 }}>Platform</div>
          {NAV.map(item => {
            const active = pathname === item.path
            const badge = item.badge ? unans : 0
            return (
              <Link key={item.path} to={item.path}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, marginBottom: 2, color: active ? '#C9A96E' : 'var(--text2)', background: active ? 'rgba(201,169,110,.08)' : 'transparent', fontWeight: active ? 600 : 400, fontSize: '13px', transition: 'var(--ease)', textDecoration: 'none' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(240,237,232,.03)'; e.currentTarget.style.color = 'var(--text1)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
              >
                <span style={{ width: 16, textAlign: 'center', fontSize: '12px', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {badge > 0 && <span style={{ background: '#B85C38', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{badge}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{property?.name || '...'}</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: 10 }}>Starter Plan</div>
          <button onClick={() => signOut()} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--text1)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RiskBadge score={riskScore} />
            {topbarRight}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px', minWidth: 0 }}>
          {/* Trial banner — shown for non-active subscribers */}
          {!trialActive && !trialExpired && (
            <TrialBanner daysLeft={daysLeft} aiUsed={aiUsed} aiLimit={aiLimit} aiRemaining={aiRemaining} onUpgrade={() => setShowUpgrade(true)} />
          )}
          {trialExpired && (
            <div style={{ background:'rgba(184,92,56,0.1)', border:'1px solid rgba(184,92,56,0.3)', borderRadius:'var(--r-md)', padding:'14px 18px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, color:'#B85C38', fontSize:'13px', marginBottom:3 }}>Trial Expired</div>
                <div style={{ fontSize:'12px', color:'var(--text2)' }}>Upgrade to continue using ReplyIQ</div>
              </div>
              <button onClick={() => setShowUpgrade(true)} style={{ background:'linear-gradient(135deg,#C9A96E,#b8945a)', border:'none', borderRadius:8, padding:'8px 18px', color:'#141920', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-sans)' }}>Upgrade Now →</button>
            </div>
          )}
          {children}
        </main>
      </div>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onCheckout={handleCheckout} />}
    </div>
  )
}
