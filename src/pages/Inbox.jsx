import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Button, Spinner, Stars, PlatformBadge, Tabs, EmptyState, UpgradeModal } from '../components/UI.jsx'
import { useApp } from '../lib/store.jsx'
import { draftResponse } from '../lib/api.js'
import { saveResponse } from '../lib/supabase.js'

const PLATFORM_META = {
  google:      { icon:'🔍', color:'#4285F4', bg:'rgba(66,133,244,.08)',  label:'Google',      reviewUrl: () => 'https://business.google.com/reviews' },
  tripadvisor: { icon:'🦉', color:'#00AF87', bg:'rgba(0,175,135,.08)',   label:'TripAdvisor', reviewUrl: (id) => id || 'https://www.tripadvisor.com' },
  booking:     { icon:'🏨', color:'#003580', bg:'rgba(0,53,128,.08)',    label:'Booking.com', reviewUrl: (id) => id || 'https://www.booking.com' },
  instagram:   { icon:'📸', color:'#E1306C', bg:'rgba(225,48,108,.08)', label:'Instagram',   reviewUrl: (id) => id ? `https://instagram.com/${id.replace('@','')}` : 'https://instagram.com' },
  facebook:    { icon:'📘', color:'#1877F2', bg:'rgba(24,119,242,.08)', label:'Facebook',    reviewUrl: (id) => id || 'https://www.facebook.com' },
}

function getPlatformUrl(platform, connections) {
  const key  = platform?.toLowerCase() || 'google'
  const meta = PLATFORM_META[key] || PLATFORM_META.google
  const conn = connections?.[key]
  return meta.reviewUrl(conn?.identifier)
}

function ReviewCard({ review, property, onResponded, onUpgradeNeeded }) {
  const [draft,    setDraft]    = useState(review.response_text || '')
  const [loading,  setLoading]  = useState(false)
  const [tone,     setTone]     = useState('professional')
  const [status,   setStatus]   = useState(review.responded ? 'done' : 'idle') // idle | generating | draft | approving | done
  const [expanded, setExpanded] = useState(false)

  const p         = PLATFORM_META[review.platform?.toLowerCase()] || PLATFORM_META.google
  const isNeg     = review.rating <= 2
  const isDone    = status === 'done'

  async function generate() {
    setLoading(true); setStatus('generating')
    const check = await onUpgradeNeeded?.()
    if (check && !check.allowed) { setLoading(false); setStatus('idle'); return }
    const r = await draftResponse(review, property, tone, onUpgradeNeeded)
    if (r.response || r.raw) { setDraft(r.response || r.raw); setStatus('draft') }
    else setStatus('idle')
    setLoading(false)
  }

  async function approve() {
    if (!draft) return
    setStatus('approving')
    // Copy to clipboard
    await navigator.clipboard?.writeText(draft).catch(() => {})
    // Save to DB
    const { data } = await saveResponse(review.id, draft)
    if (data) { onResponded?.(data) }
    // Open platform in new tab so they can paste
    const url = getPlatformUrl(review.platform, property?.platform_connections)
    if (url) window.open(url, '_blank', 'noopener')
    setStatus('done')
  }

  async function markDone() {
    const { data } = await saveResponse(review.id, draft || '(Replied manually)')
    if (data) { onResponded?.(data) }
    setStatus('done')
  }

  return (
    <div style={{ background: isDone ? 'var(--card)' : 'var(--card2)', border: `1px solid ${isNeg && !isDone ? 'rgba(184,92,56,.2)' : 'var(--border)'}`, borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 10, opacity: isDone ? 0.6 : 1, transition: 'opacity .3s' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', cursor:'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width:36, height:36, borderRadius:10, background:p.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>
          {p.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{ fontWeight:600, fontSize:'13px' }}>{review.author}</span>
            <PlatformBadge platform={review.platform} />
            <span style={{ fontSize:'11px', color:'var(--text3)', marginLeft:'auto' }}>{review.review_date}</span>
          </div>
          <Stars n={review.rating} />
          <div style={{ fontSize:'13px', color:'var(--text2)', marginTop:6, lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:expanded?'none':2, WebkitBoxOrient:'vertical' }}>
            {review.text}
          </div>
        </div>
        <div style={{ flexShrink:0 }}>
          {isDone ? (
            <span style={{ background:'rgba(74,124,111,.1)', color:'#4A7C6F', fontSize:'11px', fontWeight:600, padding:'3px 8px', borderRadius:20 }}>✓ Responded</span>
          ) : isNeg ? (
            <span style={{ background:'rgba(184,92,56,.1)', color:'#B85C38', fontSize:'11px', fontWeight:600, padding:'3px 8px', borderRadius:20 }}>⚠ Urgent</span>
          ) : (
            <span style={{ background:'rgba(201,169,110,.08)', color:'var(--gold)', fontSize:'11px', fontWeight:600, padding:'3px 8px', borderRadius:20 }}>Pending</span>
          )}
        </div>
      </div>

      {/* Response area */}
      {(expanded || !isDone) && (
        <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)' }}>
          <div style={{ paddingTop:14 }}>

            {/* Tone selector */}
            {!isDone && (
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                <span style={{ fontSize:'11px', color:'var(--text3)', alignSelf:'center', marginRight:4 }}>Tone:</span>
                {['professional','empathetic','concise'].map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${tone===t?'var(--gold)':'var(--border)'}`, background:tone===t?'rgba(201,169,110,.08)':'transparent', color:tone===t?'var(--gold)':'var(--text3)', fontSize:'11px', cursor:'pointer', fontWeight:tone===t?600:400, transition:'var(--ease)', textTransform:'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Draft */}
            {draft && (
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'12px 14px', fontSize:'13px', color:'var(--text1)', lineHeight:1.7, marginBottom:12, borderLeft:'3px solid var(--gold)', position:'relative' }}>
                <div style={{ fontSize:'10px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>AI Draft Response</div>
                <div contentEditable={!isDone} suppressContentEditableWarning onBlur={e => setDraft(e.target.textContent)} style={{ outline:'none' }}>
                  {draft}
                </div>
              </div>
            )}

            {/* Actions */}
            {!isDone && (
              <>
                {!draft ? (
                  <Button onClick={generate} disabled={loading} style={{ width:'100%' }}>
                    {loading ? <><Spinner /> Generating response...</> : '✨ Generate AI Response'}
                  </Button>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {/* Primary: Approve & Copy */}
                    <button onClick={approve} disabled={status==='approving'}
                      style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,var(--gold),var(--amber))', border:'none', borderRadius:'var(--r-md)', color:'var(--bg)', fontSize:'14px', fontWeight:700, cursor:status==='approving'?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'var(--ease)', opacity:status==='approving'?0.7:1 }}>
                      {status==='approving' ? <><Spinner /> Opening platform...</> : '✓ Approve & Copy — Post on ' + (PLATFORM_META[review.platform?.toLowerCase()]?.label || 'Platform')}
                    </button>

                    {/* Secondary row */}
                    <div style={{ display:'flex', gap:8 }}>
                      <Button variant="secondary" onClick={markDone} style={{ flex:1 }}>
                        Mark as Done
                      </Button>
                      <Button variant="ghost" onClick={generate} disabled={loading} style={{ flexShrink:0 }}>
                        {loading ? <Spinner /> : '↻ Regenerate'}
                      </Button>
                    </div>

                    {/* Helper text */}
                    <div style={{ fontSize:'11px', color:'var(--text3)', textAlign:'center', lineHeight:1.5 }}>
                      "Approve & Copy" copies the response and opens {PLATFORM_META[review.platform?.toLowerCase()]?.label || 'the platform'} — paste and post. Or click "Mark as Done" if you've already replied.
                    </div>
                  </div>
                )}
              </>
            )}

            {isDone && draft && (
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ fontSize:'12px', color:'var(--text3)', flex:1 }}>✓ Response saved · Copy it again if needed</div>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard?.writeText(draft)}>📋 Copy</Button>
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

  const filtered = filter==='pending'?pending:filter==='urgent'?urgent:filter==='positive'?positive:all

  const platforms = {}
  reviews.forEach(r => {
    const p = r.platform?.toLowerCase() || 'google'
    if (!platforms[p]) platforms[p] = { total:0, unanswered:0 }
    platforms[p].total++
    if (!r.responded) platforms[p].unanswered++
  })

  async function handleUpgradeNeeded() {
    const r = await consumeAIGeneration()
    if (!r.allowed) { setUpgradeReason(r.reason); setShowUpgrade(true) }
    return r
  }

  return (
    <Layout
      title="Inbox"
      subtitle="All reviews — AI drafts the perfect response, you approve and post"
      topbarRight={
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'12px', color:'var(--text3)' }}>
          <span style={{ color:'#B85C38', fontWeight:700 }}>{urgent.length} urgent</span>
          <span>·</span>
          <span>{pending.length} pending</span>
        </div>
      }
    >
      {/* Platform summary */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(PLATFORM_META).map(([key, cfg]) => {
          const data = platforms[key]
          if (!data) return null
          return (
            <div key={key} style={{ background:cfg.bg, border:`1px solid ${cfg.color}30`, borderRadius:'var(--r-md)', padding:'12px 16px', display:'flex', alignItems:'center', gap:10, minWidth:130 }}>
              <span style={{ fontSize:'22px' }}>{cfg.icon}</span>
              <div>
                <div style={{ fontWeight:700, color:cfg.color, fontSize:'18px' }}>{data.total}</div>
                <div style={{ fontSize:'11px', color:'var(--text3)' }}>{data.unanswered > 0 ? <span style={{ color:'#B85C38' }}>{data.unanswered} unanswered</span> : <span style={{ color:'#4A7C6F' }}>✓ All replied</span>}</div>
              </div>
            </div>
          )
        })}
        {Object.keys(platforms).length === 0 && (
          <div style={{ flex:1, background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'16px 20px', fontSize:'13px', color:'var(--text3)' }}>
            Connect your review platforms in <strong style={{ color:'var(--gold)' }}>Platforms</strong> to see reviews here.
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs active={filter} onChange={setFilter} tabs={[
        { id:'pending',  label:'Pending',    count:pending.length  },
        { id:'urgent',   label:'⚠ Urgent',   count:urgent.length   },
        { id:'positive', label:'★ Positive', count:positive.length },
        { id:'all',      label:'All',        count:all.length      },
      ]} />

      {filtered.length === 0 ? (
        <EmptyState icon="📭" title={filter==='pending'?'All caught up!':'No reviews here'} description={filter==='pending'?'Every review has been responded to. Great work!':'No reviews match this filter yet.'} />
      ) : (
        filtered.map(review => (
          <ReviewCard
            key={review.id}
            review={review}
            property={property}
            onResponded={updated => updateReviewInState(updated)}
            onUpgradeNeeded={handleUpgradeNeeded}
          />
        ))
      )}

      {showUpgrade && (
        <UpgradeModal
          onClose={() => setShowUpgrade(false)}
          reason={upgradeReason}
          onCheckout={async (plan) => {
            const r = await fetch('/api/create-checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ plan, clinicId:property?.id, email:property?.owner_email }) })
            const d = await r.json()
            if (d.url) window.location.href = d.url
          }}
        />
      )}
    </Layout>
  )
}
