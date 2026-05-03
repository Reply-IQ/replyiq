// ── SPINNER ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, border: `2px solid rgba(201,169,110,.2)`, borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
const BV = {
  primary:   { background: 'linear-gradient(135deg,#C9A96E,#b8945a)', color: '#141920', border: 'none' },
  secondary: { background: 'rgba(201,169,110,.08)', color: '#C9A96E', border: '1px solid rgba(201,169,110,.25)' },
  ghost:     { background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border2)' },
  danger:    { background: 'rgba(184,92,56,.12)', color: '#B85C38', border: '1px solid rgba(184,92,56,.3)' },
  teal:      { background: 'linear-gradient(135deg,#4A7C6F,#5a9080)', color: '#F0EDE8', border: 'none' },
}
const BS = {
  sm: { padding: '5px 12px', fontSize: '12px', borderRadius: '8px' },
  md: { padding: '8px 16px', fontSize: '13px', borderRadius: '10px' },
  lg: { padding: '12px 24px', fontSize: '15px', borderRadius: '12px' },
}
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style, fullWidth, type = 'button' }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, transition: 'var(--ease)', width: fullWidth ? '100%' : undefined, justifyContent: fullWidth ? 'center' : undefined, ...BV[variant], ...BS[size], ...style }}>
      {children}
    </button>
  )
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, glow }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20, ...(glow ? { animation: 'glow 3s ease infinite' } : {}), ...style }}>
      {children}
    </div>
  )
}

// ── GRID ──────────────────────────────────────────────────────────────────────
export function Grid({ cols = 2, gap = 16, children, style }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap, ...style }}>{children}</div>
}

// ── KPI CARD ──────────────────────────────────────────────────────────────────
const ACCENT_COLORS = {
  gold:    { bg: 'rgba(201,169,110,.07)', border: 'rgba(201,169,110,.18)', text: '#C9A96E' },
  teal:    { bg: 'rgba(74,124,111,.07)',  border: 'rgba(74,124,111,.2)',  text: '#5a9080' },
  emerald: { bg: 'rgba(74,124,111,.07)', border: 'rgba(74,124,111,.2)',  text: '#4A7C6F' },
  rose:    { bg: 'rgba(184,92,56,.08)',   border: 'rgba(184,92,56,.2)',   text: '#B85C38' },
  violet:  { bg: 'rgba(122,138,158,.07)',border: 'rgba(122,138,158,.2)', text: '#7A8A9E' },
}
export function KpiCard({ label, value, sub, trend, trendDir = 'flat', accent = 'gold', icon }) {
  const a = ACCENT_COLORS[accent] || ACCENT_COLORS.gold
  const tc = trendDir === 'up' ? '#4A7C6F' : trendDir === 'down' ? '#B85C38' : 'var(--text3)'
  const ta = trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : '—'
  return (
    <div style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', fontWeight: 600 }}>{label}</div>
        {icon && <span style={{ fontSize: '18px', opacity: .7 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: a.text, lineHeight: 1, marginBottom: 8 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: trend ? 4 : 0 }}>{sub}</div>}
      {trend && <div style={{ fontSize: '12px', color: tc, fontWeight: 600 }}>{ta} {trend}</div>}
    </div>
  )
}

// ── PLATFORM BADGE ────────────────────────────────────────────────────────────
const PLATFORMS = {
  google:      { icon: '🔍', color: '#4285F4', label: 'Google' },
  tripadvisor: { icon: '🦉', color: '#00AF87', label: 'TripAdvisor' },
  booking:     { icon: '🏨', color: '#003580', label: 'Booking.com' },
  instagram:   { icon: '📸', color: '#E1306C', label: 'Instagram' },
  facebook:    { icon: '📘', color: '#1877F2', label: 'Facebook' },
  linkedin:    { icon: '💼', color: '#0A66C2', label: 'LinkedIn' },
}
export function PlatformBadge({ platform }) {
  const p = PLATFORMS[platform?.toLowerCase()] || { icon: '⭐', color: 'var(--gold)', label: platform }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: 20, padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: p.color }}>
      {p.icon} {p.label}
    </span>
  )
}

// ── STARS ─────────────────────────────────────────────────────────────────────
export function Stars({ n, max = 5, size = '14px' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ fontSize: size, color: i < n ? 'var(--gold)' : 'var(--text3)', lineHeight: 1 }}>★</span>
      ))}
    </span>
  )
}

// ── RATING SELECTOR ───────────────────────────────────────────────────────────
export function RatingSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${value >= n ? 'var(--gold)' : 'var(--border)'}`, background: value >= n ? 'rgba(245,200,66,.12)' : 'transparent', color: value >= n ? 'var(--gold)' : 'var(--text3)', fontSize: '16px', cursor: 'pointer', transition: 'var(--ease)' }}>
          ★
        </button>
      ))}
    </div>
  )
}

// ── INPUT ─────────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, type = 'text', placeholder, prefix, suffix, style, step, min, max, required }) {
  return (
    <div style={style}>
      {label && <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', fontWeight: 600, marginBottom: 7 }}>{label}{required && <span style={{ color: 'var(--gold)', marginLeft: 3 }}>*</span>}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {prefix && <span style={{ color: 'var(--text3)', fontSize: '13px', flexShrink: 0 }}>{prefix}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} min={min} max={max}
          style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '9px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', transition: 'border-color .15s', width: '100%' }}
          onFocus={e => e.target.style.borderColor = 'rgba(245,200,66,.5)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        {suffix && <span style={{ color: 'var(--text3)', fontSize: '13px', flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  )
}

// ── TEXTAREA ──────────────────────────────────────────────────────────────────
export function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      {label && <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', fontWeight: 600, marginBottom: 7 }}>{label}</div>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--text1)', fontSize: '13px', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', lineHeight: 1.6, transition: 'border-color .15s' }}
        onFocus={e => e.target.style.borderColor = 'rgba(245,200,66,.5)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'} />
    </div>
  )
}

// ── TABS ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', borderRadius: 10, padding: 4, marginBottom: 16 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ flex: 1, padding: '7px 12px', textAlign: 'center', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)', background: active === t.id ? 'var(--card)' : 'transparent', color: active === t.id ? 'var(--gold)' : 'var(--text3)', fontWeight: active === t.id ? 600 : 400, transition: 'var(--ease)', boxShadow: active === t.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none' }}>
          {t.label}{t.count !== undefined ? <span style={{ opacity: .6, marginLeft: 5 }}>({t.count})</span> : ''}
        </button>
      ))}
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '2.5rem', opacity: .2, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: 320, margin: '0 auto 20px', lineHeight: 1.6 }}>{description}</div>
      {action}
    </div>
  )
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', marginBottom: subtitle ? 3 : 0 }}>{title}</div>
        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

// ── DIVIDER ───────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <div style={{ height: 1, background: 'var(--border)', margin: '16px 0', ...style }} />
}

// ── ALERT ─────────────────────────────────────────────────────────────────────
const AS = {
  danger:  { bg: 'rgba(184,92,56,.08)',    border: 'rgba(184,92,56,.25)',   tc: '#B85C38', icon: '!' },
  warning: { bg: 'rgba(201,169,110,.07)', border: 'rgba(201,169,110,.22)', tc: '#C9A96E', icon: '~' },
  info:    { bg: 'rgba(74,124,111,.07)',  border: 'rgba(74,124,111,.25)',  tc: '#4A7C6F', icon: 'i' },
  success: { bg: 'rgba(74,124,111,.07)', border: 'rgba(74,124,111,.25)',  tc: '#4A7C6F', icon: '✓' },
}
export function Alert({ type = 'warning', title, children }) {
  const s = AS[type] || AS.warning
  return (
    <div style={{ display: 'flex', gap: 12, padding: '13px 16px', borderRadius: 'var(--r-md)', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 10 }}>
      <span style={{ flexShrink: 0 }}>{s.icon}</span>
      <div>
        {title && <div style={{ fontWeight: 600, color: s.tc, marginBottom: 3, fontSize: '13px' }}>{title}</div>}
        <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  )
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onDismiss }) {
  if (!message) return null
  const colors = { success: '#4A7C6F', error: '#B85C38', info: '#C9A96E', warning: '#C9A96E' }
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: 'var(--card2)', border: `1px solid ${colors[type] || colors.success}`, borderRadius: 'var(--r-md)', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 40px rgba(0,0,0,.6)', animation: 'toastIn .3s ease', maxWidth: 380, fontSize: '13px' }}>
      <span style={{ color: colors[type] }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
    </div>
  )
}

// ── INSIGHT ITEM ──────────────────────────────────────────────────────────────
export function InsightItem({ iconBg, iconColor, icon, title, body, last }) {
  return (
    <div style={{ display: 'flex', gap: 13, padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor, fontSize: '14px' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  )
}

// ── RISK BADGE ────────────────────────────────────────────────────────────────
export function RiskBadge({ score }) {
  const c = score >= 70 ? '#B85C38' : score >= 45 ? '#C9A96E' : '#4A7C6F'
  const l = score >= 70 ? 'HIGH RISK' : score >= 45 ? 'MODERATE' : 'STABLE'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${c}15`, border: `1px solid ${c}40`, borderRadius: 20, padding: '5px 14px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, animation: 'pulse 2s infinite', flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: c, fontWeight: 700 }}>Risk {score} — {l}</span>
    </div>
  )
}

// ── TRIAL BANNER ──────────────────────────────────────────────────────────────
export function TrialBanner({ daysLeft, aiUsed, aiLimit, aiRemaining, onUpgrade }) {
  const pct = Math.round((aiUsed / aiLimit) * 100)
  const urgent = aiRemaining <= 2 || daysLeft <= 3

  return (
    <div style={{
      background: urgent ? 'rgba(184,92,56,0.08)' : 'rgba(201,169,110,0.06)',
      border: `1px solid ${urgent ? 'rgba(184,92,56,0.25)' : 'rgba(201,169,110,0.18)'}`,
      borderRadius: 'var(--r-md)',
      padding: '12px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '11px', color: urgent ? '#B85C38' : '#C9A96E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Free Trial — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
            {aiRemaining} of {aiLimit} AI generations remaining
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: 180 }}>
          <div style={{ height: 5, background: 'var(--border2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: urgent ? '#B85C38' : '#C9A96E', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>
      <button onClick={onUpgrade}
        style={{ background: 'linear-gradient(135deg,#C9A96E,#b8945a)', border: 'none', borderRadius: 8, padding: '8px 18px', color: '#141920', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', flexShrink: 0, boxShadow: '0 2px 12px rgba(201,169,110,0.2)' }}>
        Upgrade Now →
      </button>
    </div>
  )
}

// ── UPGRADE MODAL ─────────────────────────────────────────────────────────────
export function UpgradeModal({ onClose, onCheckout, reason }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,25,32,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#1C2430', border: '1px solid #243044', borderRadius: 'var(--r-xl)', padding: '40px 36px', maxWidth: 480, width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: 'var(--text3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: 8 }}>Upgrade ReplyIQ</div>
          {reason && <div style={{ fontSize: '13px', color: '#B85C38', background: 'rgba(184,92,56,0.08)', border: '1px solid rgba(184,92,56,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 10 }}>{reason}</div>}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { plan: 'monthly', price: 'CHF 249', period: '/month', label: 'Monthly', badge: null },
            { plan: 'annual',  price: 'CHF 2,490', period: '/year', label: 'Annual', badge: '2 months free' },
          ].map(p => (
            <button key={p.plan} onClick={() => onCheckout(p.plan)}
              style={{ flex: 1, background: p.plan === 'annual' ? 'rgba(201,169,110,0.08)' : 'var(--surface)', border: `1px solid ${p.plan === 'annual' ? 'rgba(201,169,110,0.3)' : '#243044'}`, borderRadius: 'var(--r-md)', padding: '20px 16px', cursor: 'pointer', textAlign: 'center', transition: 'var(--ease)', fontFamily: 'var(--font-sans)' }}>
              {p.badge && <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{p.badge}</div>}
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#C9A96E', marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{p.period}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)', marginTop: 8 }}>{p.label}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['Unlimited AI generations','All platforms: Google, TripAdvisor, Booking, Instagram, Facebook','Competitor intelligence','Weekly reports + email','Cancel anytime'].map(f => (
            <div key={f} style={{ display: 'flex', gap: 10, fontSize: '13px', color: 'var(--text2)' }}>
              <span style={{ color: '#4A7C6F', flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>
          Visa · Mastercard · TWINT · SEPA · Apple Pay · Google Pay
        </div>
      </div>
    </div>
  )
}
