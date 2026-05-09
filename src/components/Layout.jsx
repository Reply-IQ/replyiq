import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RiskBadge, TrialBanner, UpgradeModal } from './UI.jsx'
import { useApp, useRiskScore, useUnanswered, useIsMobile } from '../lib/store.jsx'
import { signOut } from '../lib/supabase.js'

const NAV = [
  { path: '/',            label: 'Dashboard',   icon: '▦' },
  { path: '/inbox',       label: 'Inbox',       icon: '◎', badge: true },
  { path: '/reviews',     label: 'Reviews',     icon: '✦' },
  { path: '/risk',        label: 'Risk Index',  icon: '◈' },
  { path: '/revenue',     label: 'ROI Impact',  icon: '◆' },
  { path: '/competitors', label: 'Competitors', icon: '⊞' },
  { path: '/report',      label: 'Report',      icon: '▤' },
  { path: '/platforms',   label: 'Platforms',   icon: '⊛' },
  { path: '/settings',    label: 'Settings',    icon: '⚙' },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Layout({ children, title, subtitle, topbarRight }) {
  const { pathname } = useLocation()
  const { property, reviews, showToast, trialActive, trialExpired, aiUsed, aiLimit, aiRemaining, daysLeft } = useApp()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()
  const riskScore = useRiskScore(reviews)
  const unans     = useUnanswered(reviews)

  const firstName = property?.name?.split(' ')[0] || 'there'
  const initials  = property?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?'
  const isInbox   = pathname === '/inbox'

  async function handleCheckout(plan) {
    try {
      const r = await fetch('/api/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, clinicId: property?.id, email: property?.owner_email }),
      })
      const data = await r.json()
      if (data.url) window.location.href = data.url
      else showToast('Stripe not configured yet', 'error')
    } catch (e) { showToast('Checkout failed: ' + e.message, 'error') }
  }

  const sidebarContent = (
    <aside style={{
      width: isMobile ? '100%' : 220,
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--gold),var(--amber))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '14px' }}>★</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', letterSpacing: '-0.5px', color: 'var(--white)', lineHeight: 1 }}>Reply<span style={{ color: '#C9A96E' }}>IQ</span></div>
            <div style={{ fontSize: '9px', color: 'var(--text3)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>Reputation AI</div>
          </div>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px', flex: 1 }}>
        <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1.5px', padding: '6px 10px 8px', fontWeight: 600 }}>Platform</div>
        {NAV.map(item => {
          const active = pathname === item.path
          const badge  = item.badge ? unans : 0
          return (
            <Link key={item.path} to={item.path}
              onClick={() => isMobile && setSidebarOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, marginBottom: 2, color: active ? '#C9A96E' : 'var(--text2)', background: active ? 'rgba(201,169,110,.08)' : 'transparent', fontWeight: active ? 600 : 400, fontSize: '13px', transition: 'var(--ease)', textDecoration: 'none' }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.color = 'var(--text1)' }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' }}}>
              <span style={{ width: 16, textAlign: 'center', fontSize: '12px', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge > 0 && <span style={{ background: '#B85C38', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: 10, fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{badge}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade CTA */}
      {!trialActive && !trialExpired && (
        <div style={{ margin: '0 10px 10px', padding: '14px', background: 'rgba(201,169,110,.06)', border: '1px solid rgba(201,169,110,.15)', borderRadius: 12 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>⚡ Early Access</div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>CHF 199/mo · Limited spots</div>
          <button onClick={() => setShowUpgrade(true)} style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg,var(--gold),var(--amber))', border: 'none', borderRadius: 8, color: 'var(--bg)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            Upgrade Now →
          </button>
        </div>
      )}

      {/* Property + sign out */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold),var(--amber))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--bg)', flexShrink: 0 }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{property?.name || '...'}</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)' }}>
              {trialActive ? 'Pro Plan' : trialExpired ? 'Trial Expired' : `Trial · ${daysLeft}d left`}
            </div>
          </div>
        </div>
        <button onClick={() => signOut()} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '11px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}>
          ↪ Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ width: 220, minWidth: 220, height: '100vh', flexShrink: 0 }}>
          {sidebarContent}
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          {/* Backdrop */}
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
          {/* Drawer */}
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, zIndex: 201, display: 'flex', flexDirection: 'column' }}>
            {sidebarContent}
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: isMobile ? '0 16px' : '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            {/* Hamburger on mobile */}
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 20, cursor: 'pointer', padding: '4px', flexShrink: 0, lineHeight: 1 }}>☰</button>
            )}
            <div style={{ minWidth: 0 }}>
              {pathname === '/' ? (
                <>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? '1rem' : '1.25rem', color: 'var(--text1)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {getGreeting()}, {firstName} 👋
                  </div>
                  {!isMobile && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: 3 }}>Here's what's happening with your reviews today.</div>}
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? '1rem' : '1.25rem', color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                  {subtitle && !isMobile && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: 2 }}>{subtitle}</div>}
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isMobile && <RiskBadge score={riskScore} />}
            {topbarRight}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: isInbox ? 'hidden' : 'auto', overflowX: 'hidden', padding: isInbox ? 0 : isMobile ? '16px' : '24px 28px', minWidth: 0 }}>
          {!trialActive && !trialExpired && (
            <div style={{ padding: isInbox ? (isMobile ? '0 16px' : '0 28px') : 0 }}>
              <TrialBanner daysLeft={daysLeft} aiUsed={aiUsed} aiLimit={aiLimit} aiRemaining={aiRemaining} onUpgrade={() => setShowUpgrade(true)} />
            </div>
          )}
          {trialExpired && (
            <div style={{ background: 'rgba(184,92,56,0.1)', border: '1px solid rgba(184,92,56,0.3)', borderRadius: 'var(--r-md)', padding: '14px 18px', margin: isInbox ? (isMobile ? '12px 16px' : '16px 28px') : '0 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#B85C38', fontSize: '13px', marginBottom: 3 }}>Trial Expired</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Upgrade to continue using ReplyIQ</div>
              </div>
              <button onClick={() => setShowUpgrade(true)} style={{ background: 'linear-gradient(135deg,#C9A96E,#b8945a)', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#141920', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Upgrade Now →</button>
            </div>
          )}
          {children}
        </main>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onCheckout={handleCheckout} />}
    </div>
  )
}
