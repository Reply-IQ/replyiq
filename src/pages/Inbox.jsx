import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Button, Spinner, Stars, PlatformBadge, Tabs, EmptyState, UpgradeModal } from '../components/UI.jsx'
import { useApp } from '../lib/store.jsx'
import { draftResponse } from '../lib/api.js'
import { saveResponse } from '../lib/supabase.js'

const PLATFORM_CONFIG = {
  google:      { icon: '🔍', color: '#4285F4', label: 'Google',      bg: 'rgba(66,133,244,.08)' },
  tripadvisor: { icon: '🦉', color: '#00AF87', label: 'TripAdvisor', bg: 'rgba(0,175,135,.08)' },
  booking:     { icon: '🏨', color: '#003580', label: 'Booking.com', bg: 'rgba(0,53,128,.08)' },
  instagram:   { icon: '📸', color: '#E1306C', label: 'Instagram',   bg: 'rgba(225,48,108,.08)' },
  facebook:    { icon: '📘', color: '#1877F2', label: 'Facebook',    bg: 'rgba(24,119,242,.08)' },
}

function ReviewCard({ review, property, onResponded, onUpgradeNeeded }) {
  const [draft, setDraft]     = useState(review.response_text || '')
  const [loading, setLoading] = useState(false)
  const [tone, setTone]       = useState('professional')
  const [copied, setCopied]   = useState(false)
  const [sent, setSent]       = useState(review.responded || false)
  const [expanded, setExpanded] = useState(false)

  const p = PLATFORM_CONFIG[review.platform?.toLowerCase()] || PLATFORM_CONFIG.google
  const isNegative = review.rating <= 2
  const isNeutral  = review.rating === 3

  async function generate() {
    setLoading(true)
    const r = await draftResponse(review, property, tone, onUpgradeNeeded)
    if (r.response || r.raw) setDraft(r.response || r.raw)
    setLoading(false)
  }

  async function send() {
    if (!draft) return
    // Copy to clipboard
    await navigator.clipboard?.writeText(draft).catch(() => {})
    setCopied(true)
    // Save to DB
    const { data } = await saveResponse(review.id, draft)
    if (data) { setSent(true); onResponded?.(data) }
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div style={{ background: sent ? 'var(--card)' : 'var(--card2)', border: `1px solid ${isNegative && !sent ? 'rgba(184,92,56,.2)' : 'var(--border)'}`, borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 10, opacity: sent ? .65 : 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        {/* Platform icon */}
        <div style={{ width: 36, height: 36, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
          {p.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{review.author}</span>
            <PlatformBadge platform={review.platform} />
            <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: 'auto' }}>{review.review_date}</span>
          </div>
          <Stars n={review.rating} />
          <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: 6, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: expanded ? 'none' : 2, WebkitBoxOrient: 'vertical' }}>
            {review.text}
          </div>
        </div>

        {/* Status */}
        <div style={{ flexShrink: 0 }}>
          {sent ? (
            <span style={{ background: 'rgba(74,124,111,.1)', color: '#4A7C6F', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>✓ Replied</span>
          ) : isNegative ? (
            <span style={{ background: 'rgba(184,92,56,.1)', color: '#B85C38', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>⚠ Urgent</span>
          ) : (
            <span style={{ background: 'rgba(201,169,110,.08)', color: 'var(--gold)', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>Pending</span>
          )}
        </div>
      </div>

      {/* Response area - shown when expanded or not yet replied */}
      {(expanded || !sent) && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 14 }}>
            {/* Tone selector */}
            {!sent && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: '11px', color: 'var(--text3)', alignSelf: 'center', marginRight: 4 }}>Tone:</span>
                {['professional', 'empathetic', 'concise'].map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${tone === t ? 'var(--gold)' : 'var(--border)'}`, background: tone === t ? 'rgba(201,169,110,.08)' : 'transparent', color: tone === t ? 'var(--gold)' : 'var(--text3)', fontSize: '11px', cursor: 'pointer', fontWeight: tone === t ? 600 : 400, transition: 'var(--ease)', textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Draft response */}
            {draft ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 14px', fontSize: '13px', color: 'var(--text1)', lineHeight: 1.7, marginBottom: 12, borderLeft: '3px solid var(--gold)', position: 'relative' }}>
                <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>AI Draft Response</div>
                <div contentEditable={!sent} suppressContentEditableWarning onBlur={e => setDraft(e.target.textContent)} style={{ outline: 'none' }}>
                  {draft}
                </div>
              </div>
            ) : null}

            {/* Action buttons */}
            {!sent && (
              <div style={{ display: 'flex', gap: 8 }}>
                {!draft ? (
                  <Button onClick={generate} disabled={loading} style={{ flex: 1 }}>
                    {loading ? <><Spinner /> Generating AI Response...</> : '✨ Generate AI Response'}
                  </Button>
                ) : (
                  <>
                    <Button onClick={send} style={{ flex: 1, background: 'linear-gradient(135deg,#4A7C6F,#4A7C6F)', color: '#141920' }}>
                      {copied ? '✓ Copied to Clipboard!' : '📋 Copy & Mark as Replied'}
                    </Button>
                    <Button variant="ghost" onClick={generate} disabled={loading}>
                      {loading ? <Spinner /> : '↻'}
                    </Button>
                  </>
                )}
              </div>
            )}

            {sent && draft && (
              <div style={{ fontSize: '12px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✓</span> Response saved · Paste this into Google/TripAdvisor to publish
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Inbox() {
  const { reviews, property, updateReviewInState, consumeAIGeneration, showToast } = useApp()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('')
  const [filter, setFilter] = useState('pending')

  const pending  = reviews.filter(r => !r.responded)
  const urgent   = reviews.filter(r => !r.responded && r.rating <= 2)
  const all      = reviews
  const positive = reviews.filter(r => r.rating >= 4)

  const filtered = filter === 'pending' ? pending : filter === 'urgent' ? urgent : filter === 'positive' ? positive : all

  // Platform summary
  const platforms = {}
  reviews.forEach(r => {
    const p = r.platform?.toLowerCase() || 'google'
    if (!platforms[p]) platforms[p] = { total: 0, unanswered: 0 }
    platforms[p].total++
    if (!r.responded) platforms[p].unanswered++
  })

  return (
    <Layout title="Inbox" subtitle="All reviews and comments — AI response in one click"
      topbarRight={
        <div style={{ display: 'flex', align: 'center', gap: 8, fontSize: '12px', color: 'var(--text3)' }}>
          <span style={{ color: '#B85C38', fontWeight: 700 }}>{urgent.length} urgent</span>
          <span>·</span>
          <span>{pending.length} pending</span>
        </div>
      }
    >
      {/* Platform summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
          const data = platforms[key]
          if (!data) return null
          return (
            <div key={key} style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 'var(--r-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
              <span style={{ fontSize: '22px' }}>{cfg.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: cfg.color, fontSize: '18px' }}>{data.total}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{data.unanswered > 0 ? <span style={{ color: '#B85C38' }}>{data.unanswered} unanswered</span> : '✓ All replied'}</div>
              </div>
            </div>
          )
        })}
        {Object.keys(platforms).length === 0 && (
          <div style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 20px', fontSize: '13px', color: 'var(--text3)' }}>
            Connect your review platforms in <strong style={{ color: 'var(--gold)' }}>Settings → Platforms</strong> to see reviews here
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs active={filter} onChange={setFilter} tabs={[
        { id: 'pending',  label: 'Pending',  count: pending.length },
        { id: 'urgent',   label: '⚠ Urgent', count: urgent.length },
        { id: 'positive', label: '★ Positive', count: positive.length },
        { id: 'all',      label: 'All',      count: all.length },
      ]} />

      {/* Reviews */}
      {filtered.length === 0 ? (
        <EmptyState icon="📭" title={filter === 'pending' ? 'All caught up!' : 'No reviews here'} description={filter === 'pending' ? 'Every review has been replied to. Great work!' : 'No reviews match this filter yet.'} />
      ) : (
        filtered.map(review => (
          <ReviewCard
            key={review.id}
            review={review}
            property={property}
            onResponded={(updated) => updateReviewInState(updated)}
            onUpgradeNeeded={async () => { const r = await consumeAIGeneration(); if (!r.allowed) { setUpgradeReason(r.reason); setShowUpgrade(true) } return r }}
          />
        ))
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} reason={upgradeReason} onCheckout={async (plan) => { const r = await fetch('/api/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan,clinicId:property?.id,email:property?.owner_email})}); const d = await r.json(); if(d.url) window.location.href=d.url }} />}
    </Layout>
  )
}
