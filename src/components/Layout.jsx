import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { RiskBadge, TrialBanner, UpgradeModal } from './UI.jsx'
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

const LANG_OPTIONS = [
  { code:'en', label:'EN', flag:'🇬🇧' },
  { code:'de', label:'DE', flag:'🇩🇪' },
  { code:'fr', label:'FR', flag:'🇫🇷' },
]

const SwissFlag = ({ size=11 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:2, flexShrink:0 }}>
    <rect width="20" height="20" fill="#FF0000"/>
    <rect x="3" y="7" width="14" height="6" fill="white"/>
    <rect x="7" y="3" width="6" height="14" fill="white"/>
  </svg>
)

function LangSwitcher({ lang, setLang, compact=false }) {
  return (
    <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,.04)', borderRadius:8, padding:2 }}>
      {LANG_OPTIONS.map(({ code, label }) => {
        const active = lang === code
        return (
          <button key={code} onClick={() => setLang(code)} style={{
            padding: compact ? '3px 7px' : '4px 10px',
            border:'none', borderRadius:6, cursor:'pointer',
            fontSize: compact ? '10px' : '11px',
            fontWeight: active ? 700 : 400,
            fontFamily:'var(--font-sans)',
            background: active ? 'var(--gold)' : 'transparent',
            color: active ? 'var(--bg)' : 'var(--text3)',
            transition:'all .15s',
          }}
          onMouseEnter={e => { if (!active) e.currentTarget.style.color='var(--text1)' }}
          onMouseLeave={e => { if (!active) e.currentTarget.style.color='var(--text3)' }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function getGreeting(lang) {
  const h = new Date().getHours()
  if (h < 12) return t(T.greeting.morning, lang)
  if (h < 18) return t(T.greeting.afternoon, lang)
  return t(T.greeting.evening, lang)
}

export function Layout({ children, title, subtitle, topbarRight }) {
  const { pathname } = useLocation()
  const { property, reviews, showToast, trialActive, trialExpired, aiUsed, aiLimit, aiRemaining, daysLeft } = useApp()
  const { lang, setLang } = useLang()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const isMobile  = useIsMobile()
  const riskScore = useRiskScore(reviews)
  const unans     = useUnanswered(reviews)

  const firstName = property?.name?.split(' ')[0] || 'there'
  const initials  = property?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'
  const isInbox   = pathname === '/inbox'

  const planLabel = trialActive
    ? t(T.sidebar.proPlan, lang)
    : trialExpired
    ? t(T.trial.trialExpired, lang)
    : `${t(T.sidebar.trialLeft, lang)} · ${daysLeft}d`

  async function handleCheckout(plan) {
    try {
      const r = await fetch('/api/create-checkout', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ plan, clinicId:property?.id, email:property?.owner_email }),
      })
      const data = await r.json()
      if (data.url) window.location.href = data.url
      else showToast('Stripe not configured yet', 'error')
    } catch (e) { showToast('Checkout failed: ' + e.message, 'error') }
  }

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
          {/* Language switcher on mobile */}
          <LangSwitcher lang={lang} setLang={setLang} compact />
        </header>

        {!trialActive && !trialExpired && (
          <div style={{ background:'rgba(201,169,110,.06)', borderBottom:'1px solid rgba(201,169,110,.15)', padding:'8px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <span style={{ fontSize:'11px', color:'var(--gold)' }}>⚡ {daysLeft}d · {aiRemaining} AI</span>
            <button onClick={() => setShowUpgrade(true)} style={{ fontSize:'11px', fontWeight:700, color:'var(--bg)', background:'var(--gold)', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontFamily:'var(--font-sans)' }}>
              {t(T.trial.upgrade, lang)}
            </button>
          </div>
        )}

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

        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onCheckout={handleCheckout} />}
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

        {/* Language switcher */}
        <div style={{ padding:'10px 12px 0', borderBottom:'1px solid var(--border)', paddingBottom:10 }}>
          <div style={{ fontSize:'9px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:6, fontWeight:600 }}>
            {t(T.settings.language, lang)}
          </div>
          <LangSwitcher lang={lang} setLang={setLang} />
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

        {/* Upgrade CTA */}
        {!trialActive && !trialExpired && (
          <div style={{ margin:'0 10px 10px', padding:'14px', background:'rgba(201,169,110,.06)', border:'1px solid rgba(201,169,110,.15)', borderRadius:12 }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'var(--gold)', marginBottom:4 }}>⚡ {t(T.trial.earlyAccess, lang)}</div>
            <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:10, lineHeight:1.5 }}>CHF 149/mo · {t(T.trial.spots, lang)}</div>
            <button onClick={() => setShowUpgrade(true)} style={{ width:'100%', padding:'8px', background:'linear-gradient(135deg,var(--gold),var(--amber))', border:'none', borderRadius:8, color:'var(--bg)', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-sans)' }}>
              {t(T.trial.upgrade, lang)}
            </button>
          </div>
        )}

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
          {!trialActive && !trialExpired && (
            <TrialBanner daysLeft={daysLeft} aiUsed={aiUsed} aiLimit={aiLimit} aiRemaining={aiRemaining} onUpgrade={() => setShowUpgrade(true)} lang={lang} />
          )}
          {trialExpired && (
            <div style={{ background:'rgba(184,92,56,0.1)', border:'1px solid rgba(184,92,56,0.3)', borderRadius:'var(--r-md)', padding:'14px 18px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
              <div>
                <div style={{ fontWeight:700, color:'#B85C38', fontSize:'13px', marginBottom:3 }}>{t(T.trial.trialExpired, lang)}</div>
                <div style={{ fontSize:'12px', color:'var(--text2)' }}>{t(T.trial.upgradeMsg, lang)}</div>
              </div>
              <button onClick={() => setShowUpgrade(true)} style={{ background:'linear-gradient(135deg,#C9A96E,#b8945a)', border:'none', borderRadius:8, padding:'8px 18px', color:'#141920', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-sans)' }}>
                {t(T.trial.upgrade, lang)}
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onCheckout={handleCheckout} />}
    </div>
  )
}
