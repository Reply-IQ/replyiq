// ─── COMPLETE UI COMPONENT LIBRARY ────────────────────────────────────────────

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', padding: 20,
        ...(accent ? { borderTop: `3px solid var(--${accent})` } : {}),
        ...(onClick ? { cursor: 'pointer' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Grid ──────────────────────────────────────────────────────────────────────
export function Grid({ cols = 2, gap = 16, children, style }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, ...style }}>
      {children}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, trend, trendDir, accent = 'teal' }) {
  const tc = trendDir === 'up' ? 'var(--mint)' : trendDir === 'down' ? 'var(--rose)' : 'var(--mid)'
  const ta = trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : '→'
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 18, borderTop: `3px solid var(--${accent})` }}>
      <div style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '1.8px', color: 'var(--mid)', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', lineHeight: 1 }}>{value}</div>
      {sub    && <div style={{ fontSize: '0.72rem', color: 'var(--silver)', marginTop: 5 }}>{sub}</div>}
      {trend  && <div style={{ fontSize: '0.72rem', fontWeight: 600, color: tc, marginTop: 4 }}>{ta} {trend}</div>}
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────
const BV = {
  primary:   { background: 'var(--teal)',             color: '#fff',          border: 'none' },
  secondary: { background: 'rgba(2,131,144,0.12)',    color: 'var(--mint)',   border: '1px solid rgba(2,131,144,0.28)' },
  ghost:     { background: 'transparent',             color: 'var(--silver)', border: '1px solid var(--border)' },
  danger:    { background: 'rgba(232,72,85,0.1)',     color: 'var(--rose)',   border: '1px solid rgba(232,72,85,0.28)' },
  success:   { background: 'rgba(2,195,154,0.1)',     color: 'var(--mint)',   border: '1px solid rgba(2,195,154,0.28)' },
}
const BS = { sm: { padding: '5px 12px', fontSize: '0.75rem' }, md: { padding: '8px 16px', fontSize: '0.82rem' }, lg: { padding: '12px 24px', fontSize: '0.95rem' } }

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style, fullWidth }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--r-sm)', fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'var(--ease)', width: fullWidth ? '100%' : undefined, justifyContent: fullWidth ? 'center' : undefined, ...BV[variant], ...BS[size], ...style }}>
      {children}
    </button>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 14 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, border: '2px solid rgba(2,195,154,0.2)', borderTopColor: 'var(--mint)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
}

// ── Stars ─────────────────────────────────────────────────────────────────────
export function Stars({ n, size = '0.88rem' }) {
  return <span style={{ color: 'var(--gold)', fontSize: size, letterSpacing: 1 }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>
}

// ── Tag ───────────────────────────────────────────────────────────────────────
const TC = {
  wait_time:           'rgba(244,162,97,.15)  | var(--gold)  | rgba(244,162,97,.28)',
  billing:             'rgba(232,72,85,.12)   | var(--rose)  | rgba(232,72,85,.28)',
  hygiene:             'rgba(2,195,154,.1)    | var(--mint)  | rgba(2,195,154,.22)',
  staff:               'rgba(0,168,150,.1)    | var(--sea)   | rgba(0,168,150,.22)',
  pain:                'rgba(232,72,85,.12)   | var(--rose)  | rgba(232,72,85,.28)',
  treatment_quality:   'rgba(2,195,154,.1)    | var(--mint)  | rgba(2,195,154,.22)',
  positive_experience: 'rgba(2,195,154,.1)    | var(--mint)  | rgba(2,195,154,.22)',
  compliance_risk:     'rgba(232,72,85,.2)    | var(--rose)  | rgba(232,72,85,.4)',
  low:                 'rgba(2,195,154,.08)   | var(--mint)  | rgba(2,195,154,.2)',
  medium:              'rgba(244,162,97,.1)   | var(--gold)  | rgba(244,162,97,.22)',
  high:                'rgba(232,72,85,.12)   | var(--rose)  | rgba(232,72,85,.28)',
  critical:            'rgba(232,72,85,.2)    | var(--rose)  | rgba(232,72,85,.4)',
  positive:            'rgba(2,195,154,.1)    | var(--mint)  | rgba(2,195,154,.22)',
  negative:            'rgba(232,72,85,.12)   | var(--rose)  | rgba(232,72,85,.28)',
  neutral:             'rgba(90,122,135,.12)  | var(--mid)   | rgba(90,122,135,.22)',
}

export function Tag({ type, children }) {
  const parts = (TC[type] || TC.neutral).split(' | ').map(s => s.trim())
  return (
    <span style={{ fontSize: '0.63rem', padding: '2px 8px', borderRadius: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', background: parts[0], color: parts[1], border: `1px solid ${parts[2]}` }}>
      {children || type.replace(/_/g, ' ')}
    </span>
  )
}

// ── RiskBadge ─────────────────────────────────────────────────────────────────
export function RiskBadge({ score }) {
  const c = score >= 70 ? 'var(--rose)' : score >= 45 ? 'var(--gold)' : 'var(--mint)'
  const l = score >= 70 ? 'HIGH RISK'   : score >= 45 ? 'MODERATE'    : 'STABLE'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: `${c}18`, border: `1px solid ${c}44`, borderRadius: 20, padding: '5px 14px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, animation: 'pulse 2s infinite', flexShrink: 0 }} />
      <span style={{ fontSize: '0.75rem', color: c, fontWeight: 600 }}>Risk: {score} — {l}</span>
    </div>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
const AS = {
  danger:  { bg: 'rgba(232,72,85,.08)',  border: 'rgba(232,72,85,.25)',  icon: '🚨', tc: 'var(--rose)' },
  warning: { bg: 'rgba(244,162,97,.08)', border: 'rgba(244,162,97,.25)', icon: '⚡', tc: 'var(--gold)' },
  info:    { bg: 'rgba(2,131,144,.08)',  border: 'rgba(2,131,144,.25)',  icon: 'ℹ',  tc: 'var(--teal)' },
  success: { bg: 'rgba(2,195,154,.08)',  border: 'rgba(2,195,154,.25)',  icon: '✓',  tc: 'var(--mint)' },
}
export function Alert({ type = 'warning', title, children }) {
  const s = AS[type]
  return (
    <div style={{ display: 'flex', gap: 12, padding: '13px 16px', borderRadius: 'var(--r-md)', background: s.bg, border: `1px solid ${s.border}`, marginBottom: 10 }}>
      <div style={{ flexShrink: 0, fontSize: '0.9rem', marginTop: 1 }}>{s.icon}</div>
      <div>
        {title && <div style={{ fontWeight: 600, color: s.tc, marginBottom: 3, fontSize: '0.85rem' }}>{title}</div>}
        <div style={{ fontSize: '0.83rem', color: 'var(--silver)', lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <div style={{ height: 1, background: 'var(--border)', margin: '16px 0', ...style }} />
}

// ── Label ─────────────────────────────────────────────────────────────────────
export function Label({ children, style }) {
  return <div style={{ fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '1.8px', color: 'var(--mid)', fontWeight: 600, ...style }}>{children}</div>
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--mid)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: 'var(--navy)', borderRadius: 9, padding: 4, marginBottom: 18 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, padding: '7px', textAlign: 'center', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-sans)', background: active === t.id ? 'var(--teal)' : 'transparent', color: active === t.id ? '#fff' : 'var(--silver)', fontWeight: active === t.id ? 500 : 400, transition: 'var(--ease)' }}>
          {t.label}{t.count !== undefined ? <span style={{ opacity: 0.7 }}> ({t.count})</span> : ''}
        </button>
      ))}
    </div>
  )
}

// ── Input / Textarea ──────────────────────────────────────────────────────────
export function Input({ label, value, onChange, type = 'text', placeholder, prefix, suffix, style, step, min, max }) {
  return (
    <div style={style}>
      {label && <Label style={{ marginBottom: 6 }}>{label}</Label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {prefix && <span style={{ color: 'var(--silver)', fontSize: '0.85rem', flexShrink: 0 }}>{prefix}</span>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} step={step} min={min} max={max}
          style={{ flex: 1, background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 12px', color: 'var(--white)', fontSize: '0.88rem', outline: 'none', transition: 'border-color .15s', width: '100%' }}
          onFocus={e => e.target.style.borderColor = 'var(--teal)'}
          onBlur={e  => e.target.style.borderColor = 'var(--border)'}
        />
        {suffix && <span style={{ color: 'var(--silver)', fontSize: '0.85rem', flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  )
}

export function Textarea({ label, value, onChange, placeholder, rows = 5 }) {
  return (
    <div>
      {label && <Label style={{ marginBottom: 6 }}>{label}</Label>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: '100%', background: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px', color: 'var(--white)', fontSize: '0.88rem', fontFamily: 'var(--font-sans)', resize: 'vertical', outline: 'none', lineHeight: 1.6, transition: 'border-color .15s' }}
        onFocus={e => e.target.style.borderColor = 'var(--teal)'}
        onBlur={e  => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}

// ── RatingSelector ────────────────────────────────────────────────────────────
export function RatingSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${value >= n ? 'var(--gold)' : 'var(--border)'}`, background: value >= n ? 'rgba(244,162,97,0.15)' : 'transparent', color: value >= n ? 'var(--gold)' : 'var(--mid)', fontSize: '1rem' }}>
          ★
        </button>
      ))}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: '2.2rem', opacity: 0.25, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: '0.84rem', color: 'var(--silver)', marginBottom: action ? 18 : 0, maxWidth: 340, margin: '0 auto' }}>{description}</div>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  )
}

// ── InsightItem ───────────────────────────────────────────────────────────────
export function InsightItem({ iconBg, iconColor, icon, title, body, last }) {
  return (
    <div style={{ display: 'flex', gap: 13, padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor, fontSize: '0.85rem' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.87rem', fontWeight: 600, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--silver)', lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  )
}

// ── StatRow ───────────────────────────────────────────────────────────────────
export function StatRow({ label, value, valueColor, last }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--border)', fontSize: '0.85rem' }}>
      <span style={{ color: 'var(--silver)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.82rem', color: valueColor || 'var(--white)' }}>{value}</span>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onDismiss }) {
  if (!message) return null
  const colors = { success: 'var(--mint)', error: 'var(--rose)', info: 'var(--teal)', warning: 'var(--gold)' }
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: 'var(--card)', border: `1px solid ${colors[type]}`, borderRadius: 'var(--r-md)', padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)', animation: 'toastIn .3s ease', maxWidth: 380, fontSize: '0.85rem' }}>
      <span style={{ color: colors[type] }}>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--mid)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, padding: 0 }}>×</button>
    </div>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = 'var(--teal)', height = 8, label, showValue }) {
  const pct = Math.min(100, Math.round(value))
  return (
    <div>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem' }}>
          {label    && <span style={{ color: 'var(--silver)' }}>{label}</span>}
          {showValue && <span style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{value}</span>}
        </div>
      )}
      <div style={{ height, background: 'var(--navy)', borderRadius: height / 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height / 2 }} />
      </div>
    </div>
  )
}
