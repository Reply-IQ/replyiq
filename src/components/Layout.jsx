import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { RiskBadge } from './UI.jsx'
import { useApp, useRiskScore, useUnanswered, useIsMobile, useLang } from '../lib/store.jsx'
import { signOut } from '../lib/supabase.js'
import { T, t } from '../lib/i18n.js'

const SIDEBAR_PATHS = [
  { path:'/',            key:'dashboard',   icon:'▦' },
  { path:'/inbox',       key:'inbox',       icon:'◎', badge:true },
  { path:'/reviews',     key:'reviews',     icon:'✦' },
  { path:'/risk',        key:'risk',        icon:'◈' },
  { path:'/revenue',     key:'revenue',     icon:'◆' },
  { path:'/competitors', key:'competitors', icon:'⊞' },
  { path:'/report',      key:'report',      icon:'▤' },
  { path:'/widget',      key:'widget',      icon:'⬡' },
  { path:'/platforms',   key:'platforms',   icon:'⊛' },
  { path:'/settings',    key:'settings',    icon:'⚙' },
]

const BOTTOM_PATHS = [
  { path:'/',        key:'dashboard', icon:'▦' },
  { path:'/inbox',   key:'inbox',     icon:'◎', badge:true },
  { path:'/reviews', key:'reviews',   icon:'✦' },
  { path:'/report',  key:'report',    icon:'▤' },
  { path:'/settings',key:'settings',  icon:'⚙' },
]

const SwissFlag = ({ size=11 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:2, flexShrink:0 }}>
    <rect width="20" height="20" fill="#FF0000"/>
    <rect x="3" y="7" width="14" height="6" fill="white"/>
    <rect x="7" y="3" width="6" height="14" fill="white"/>
  </svg>
)

function getGreeting(lang) {
  const h = new Date().getHours()
  if (h < 12) return t(T.greeting.morning, lang)
  if (h < 18) return t(T.greeting.afternoon, lang)
  return t(T.greeting.evening, lang)
}

export function Layout({ children, title, subtitle, topbarRight }) {
  const { pathname } = useLocation()
  const { property, reviews, showToast } = useApp()
  const { lang } = useLang()
  const isMobile  = useIsMobile()
  const riskScore = useRiskScore(reviews)
  const unans     = useUnanswered(reviews)

  const firstName = property?.name?.split(' ')[0] || 'there'
  const initials  = property?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'
  const isInbox   = pathname === '/inbox'

  const planLabel = t(T.sidebar.proPlan, lang)

// ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) {
    const BOTTOM_H = 60

    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)', overflow:'hidden' }}>

        <header style={{ height:52, background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', flexShrink:0, zIndex:10 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,var(--gold),var(--amber))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>★</div>
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
              <span style={{ fontFamily:'var(--font-serif)', fontSize:'1.1rem', color:'var(--text1)' }}>Reply<span style={{ color:'var(--gold)' }}>IQ</span></span>
              <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                <SwissFlag size={10} />
                <span style={{ fontSize:'8px', color:'rgba(201,169,110,0.45)', letterSpacing:'1.5px' }}>SWISS</span>
              </span>
            </div>
          </div>

        </header>



        {topbarRight && !isInbox && (
          <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface)', display:'flex', justifyContent:'flex-end', gap:8, flexShrink:0 }}>
            {topbarRight}
          </div>
        )}

        <main style={{ flex:1, overflowY:isInbox?'hidden':'auto', overflowX:'hidden', padding:isInbox?0:'12px 14px', paddingBottom:isInbox?0:`${BOTTOM_H+12}px`, WebkitOverflowScrolling:'touch' }}>
          {children}
        </main>

        {/* Bottom tab bar */}
        <nav style={{ position:'fixed', bottom:0, left:0, right:0, height:BOTTOM_H, background:'var(--surface)', borderTop:'1px solid var(--border)', display:'flex', alignItems:'stretch', zIndex:100, paddingBottom:'env(safe-area-inset-bottom)' }}>
          {BOTTOM_PATHS.map(item => {
            const active = pathname === item.path
            const badge  = item.badge ? unans : 0
            const label  = t(T.nav[item.key], lang)
            return (
              <Link key={item.path} to={item.path} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, color:active?'var(--gold)':'var(--text3)', textDecoration:'none', position:'relative', transition:'var(--ease)' }}>
                {active && <div style={{ position:'absolute', top:0, left:'25%', right:'25%', height:2, background:'var(--gold)', borderRadius:'0 0 2px 2px' }} />}
                <div style={{ position:'relative' }}>
                  <span style={{ fontSize:'18px', lineHeight:1 }}>{item.icon}</span>
                  {badge > 0 && <div style={{ position:'absolute', top:-4, right:-8, background:'#B85C38', color:'#fff', fontSize:'9px', fontWeight:700, borderRadius:8, minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{badge > 99 ? '99+' : badge}</div>}
                </div>
                <span style={{ fontSize:'9px', fontWeight:active?700:400, letterSpacing:'0.3px' }}>{label}</span>
              </Link>
            )
          })}
        </nav>

      </div>
    )
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      <aside style={{ width:220, minWidth:220, height:'100vh', flexShrink:0, background:'var(--surface)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Logo */}
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,var(--gold),var(--amber))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:'14px' }}>★</span>
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.2rem', letterSpacing:'-0.5px', color:'var(--white)', lineHeight:1 }}>Reply<span style={{ color:'#C9A96E' }}>IQ</span></div>
            <div style={{ fontSize:'9px', color:'var(--text3)', letterSpacing:'2px', textTransform:'uppercase', marginTop:2 }}>Reputation AI</div>
            <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
              <SwissFlag size={11} />
              <span style={{ fontSize:'8px', color:'rgba(201,169,110,0.4)', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:600 }}>Swiss</span>
            </div>
          </div>
        </div>

{/* Nav */}
        <nav style={{ padding:'10px', flex:1, overflowY:'auto' }}>
          <div style={{ fontSize:'10px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1.5px', padding:'6px 10px 8px', fontWeight:600 }}>{t(T.nav.platform, lang)}</div>
          {SIDEBAR_PATHS.map(item => {
            const active = pathname === item.path
            const badge  = item.badge ? unans : 0
            const label  = t(T.nav[item.key], lang)
            return (
              <Link key={item.path} to={item.path}
                style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 10px', borderRadius:8, marginBottom:2, color:active?'#C9A96E':'var(--text2)', background:active?'rgba(201,169,110,.08)':'transparent', fontWeight:active?600:400, fontSize:'13px', transition:'var(--ease)', textDecoration:'none' }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background='rgba(255,255,255,.03)'; e.currentTarget.style.color='var(--text1)' }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)' }}}>
                <span style={{ width:16, textAlign:'center', fontSize:'12px', flexShrink:0 }}>{item.icon}</span>
                <span style={{ flex:1 }}>{label}</span>
                {badge > 0 && <span style={{ background:'#B85C38', color:'#fff', fontSize:'10px', padding:'1px 6px', borderRadius:10, fontWeight:700, minWidth:18, textAlign:'center' }}>{badge}</span>}
              </Link>
            )
          })}
        </nav>

{/* Property + sign out */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,var(--gold),var(--amber))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'var(--bg)', flexShrink:0 }}>{initials}</div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{property?.name || '...'}</div>
              <div style={{ fontSize:'10px', color:'var(--text3)' }}>{planLabel}</div>
            </div>
          </div>
          <button onClick={() => signOut()} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:'11px', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:5 }}
            onMouseEnter={e => e.currentTarget.style.color='var(--text1)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text3)'}>
            ↪ {t(T.sidebar.signOut, lang)}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        <header style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, height:56 }}>
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', minWidth:0, flex:1 }}>
            {pathname === '/' ? (
              <>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.2rem', color:'var(--text1)', lineHeight:1.2 }}>{getGreeting(lang)}, {firstName} 👋</div>
                <div style={{ fontSize:'12px', color:'var(--text3)', marginTop:2 }}>{t(T.greeting.subtitle, lang)}</div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.2rem', color:'var(--text1)', lineHeight:1.2 }}>{title}</div>
                {subtitle && <div style={{ fontSize:'12px', color:'var(--text3)', marginTop:2 }}>{subtitle}</div>}
              </>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <RiskBadge score={riskScore} lang={lang} />
            {topbarRight}
          </div>
        </header>

        <main style={{ flex:1, overflowY:isInbox?'hidden':'auto', overflowX:'hidden', padding:isInbox?0:'18px 22px', minWidth:0 }}>

          {children}
        </main>
      </div>

    </div>
  )
}
