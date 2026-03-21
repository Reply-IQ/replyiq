import { Link, useLocation } from 'react-router-dom'
import { RiskBadge } from './UI.jsx'
import { doSignOut } from '../lib/supabase.js'
import { useApp, useRiskScore, useUnansweredCount } from '../lib/store.jsx'
import { useLang } from '../lib/lang.jsx'

const NAV_KEYS = [
  { path: '/',            key: 'dashboard',   icon: '▦' },
  { path: '/reviews',     key: 'reviews',     icon: '✦' },
  { path: '/risk',        key: 'risk',        icon: '◈' },
  { path: '/revenue',     key: 'revenue',     icon: '◆' },
  { path: '/competitors', key: 'competitors', icon: '⊞' },
  { path: '/respond',     key: 'respond',     icon: '◎' },
  { path: '/report',      key: 'report',      icon: '▤' },
  { path: '/settings',    key: 'settings',    icon: '⚙' },
]

function LangToggle() {
  const { lang, switchLang, languages } = useLang()
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--ink)', borderRadius: 8, padding: 3 }}>
      {languages.map(l => (
        <button
          key={l.code}
          onClick={() => switchLang(l.code)}
          title={l.label}
          style={{
            background: lang === l.code ? 'var(--teal)' : 'transparent',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            padding: '4px 8px', fontSize: '1rem', lineHeight: 1,
            transition: 'all .15s', opacity: lang === l.code ? 1 : 0.5,
          }}
        >
          {l.flag}
        </button>
      ))}
    </div>
  )
}

export function Layout({ children, title, subtitle, topbarRight }) {
  const { pathname } = useLocation()
  const { clinic, reviews, showToast } = useApp()
  const { t, lang } = useLang()
  const riskScore  = useRiskScore(reviews)
  const unanswered = useUnansweredCount(reviews)

  async function handleSignOut() {
    await doSignOut()
    showToast(t.common.signedOut, 'info')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 220, minWidth: 220, background: 'var(--navy)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Logo */}
        <div style={{ padding: '22px 18px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', letterSpacing: '-0.5px', color: 'var(--white)' }}>ReplyIQ</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--mint)', letterSpacing: '2.5px', textTransform: 'uppercase', marginTop: 3, fontWeight: 600 }}>
            {t.auth.subtitle}
          </div>
          {/* Language toggle in sidebar */}
          <div style={{ marginTop: 12 }}>
            <LangToggle />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '2px', padding: '8px 8px 6px', fontWeight: 600 }}>
            {t.nav.intelligence}
          </div>
          {NAV_KEYS.map(item => {
            const active = pathname === item.path
            const badge = item.path === '/reviews' ? unanswered : 0
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7, marginBottom: 2, color: active ? 'var(--mint)' : 'var(--silver)', background: active ? 'rgba(2,195,154,0.12)' : 'transparent', fontWeight: active ? 500 : 400, fontSize: '0.83rem', transition: 'var(--ease)', textDecoration: 'none' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(2,195,154,0.06)'; e.currentTarget.style.color = '#fff' }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--silver)' }}}
              >
                <span style={{ width: 15, textAlign: 'center', fontSize: '0.75rem' }}>{item.icon}</span>
                {t.nav[item.key]}
                {badge > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--rose)', color: '#fff', fontSize: '0.6rem', padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>{badge}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{clinic?.name || '...'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--mid)', marginTop: 2 }}>{t.nav.plan}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--mint)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--mint)' }}>{t.nav.operational}</span>
          </div>
          <button onClick={handleSignOut} style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--mid)', fontSize: '0.72rem', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>↪</span> {t.nav.signOut}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ background: 'var(--navy)', borderBottom: '1px solid var(--border)', padding: '15px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.73rem', color: 'var(--mid)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RiskBadge score={riskScore} />
            {topbarRight}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
