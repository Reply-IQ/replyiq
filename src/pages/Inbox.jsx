import { useState, useMemo } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Button, Spinner, UpgradeModal } from '../components/UI.jsx'
import { useApp, useIsMobile, useLang } from '../lib/store.jsx'
import { T, t } from '../lib/i18n.js'
import { draftResponse } from '../lib/api.js'
import { saveResponse } from '../lib/supabase.js'

const PLATFORM_META = {
  google:      { icon:'🔍', color:'#4285F4', bg:'rgba(66,133,244,.1)',  label:'Google',      url:'https://business.google.com/reviews' },
  tripadvisor: { icon:'🦉', color:'#00AF87', bg:'rgba(0,175,135,.1)',   label:'TripAdvisor', url:'https://www.tripadvisor.com' },
  booking:     { icon:'🏨', color:'#003580', bg:'rgba(0,53,128,.1)',    label:'Booking.com', url:'https://www.booking.com' },
  instagram:   { icon:'📸', color:'#E1306C', bg:'rgba(225,48,108,.1)', label:'Instagram',   url:'https://instagram.com' },
  facebook:    { icon:'📘', color:'#1877F2', bg:'rgba(24,119,242,.1)', label:'Facebook',    url:'https://www.facebook.com' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff/3600000), d = Math.floor(diff/86400000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
}

function Stars({ n, size=12 }) {
  return (
    <div style={{ display:'flex', gap:1 }}>
      {[1,2,3,4,5].map(i => <span key={i} style={{ color:i<=n?'#C9A96E':'var(--border)', fontSize:size }}>{i<=n?'★':'☆'}</span>)}
    </div>
  )
}

export default function Inbox() {
  const { reviews, property, updateReviewInState, consumeAIGeneration, showToast } = useApp()
  const isMobile = useIsMobile()
  const { lang }  = useLang()

  const [filter,        setFilter]       = useState('pending')
  const [selected,      setSelected]     = useState(null)
  const [draft,         setDraft]        = useState('')
  const [tone,          setTone]         = useState('professional')
  const [generating,    setGenerating]   = useState(false)
  const [approving,     setApproving]    = useState(false)
  const [editMode,      setEditMode]     = useState(false)
  const [aiError,       setAiError]      = useState(false)
  const [showUpgrade,   setShowUpgrade]  = useState(false)
  const [upgradeReason, setUpgradeReason]= useState('')
  // Mobile: track which panel is visible
  const [mobileView,   setMobileView]   = useState('list') // 'list' | 'detail'

  const pending  = reviews.filter(r => !r.responded)
  const urgent   = reviews.filter(r => !r.responded && r.rating <= 2)
  const positive = reviews.filter(r => r.rating >= 4)
  const all      = reviews

  const filtered = useMemo(() => {
    return filter==='pending'?pending:filter==='urgent'?urgent:filter==='positive'?positive:all
  }, [filter, reviews])

  function selectReview(review) {
    setSelected(review)
    setDraft(review.response_text || '')
    setEditMode(false)
    setAiError(false)
    if (isMobile) setMobileView('detail')
  }

  function goBackToList() {
    setMobileView('list')
    setSelected(null)
    setDraft('')
    setAiError(false)
  }

  async function generate() {
    if (!selected) return
    const check = await consumeAIGeneration()
    if (!check.allowed) { setUpgradeReason(check.reason); setShowUpgrade(true); return }
    setGenerating(true)
    setDraft('')
    setAiError(false)
    const r = await draftResponse(selected, property, tone)
    if (r.response || r.raw) {
      setDraft(r.response || r.raw)
      setAiError(false)
    } else {
      setAiError(true)
      showToast('AI generation failed — try again', 'error')
    }
    setGenerating(false)
    setEditMode(false)
  }

  async function approve() {
    if (!draft || !selected) return
    setApproving(true)

    // Robust clipboard copy
    let copied = false
    try {
      await navigator.clipboard.writeText(draft)
      copied = true
    } catch {
      try {
        const ta = document.createElement('textarea')
        ta.value = draft
        ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
        document.body.appendChild(ta)
        ta.focus(); ta.select()
        copied = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { copied = false }
    }

    const { data } = await saveResponse(selected.id, draft)
    if (data) {
      updateReviewInState(data)
      setSelected(data)
      const p = PLATFORM_META[selected.platform?.toLowerCase()]||PLATFORM_META.google
      window.open(p.url, '_blank', 'noopener')
      showToast(copied ? `✓ Copied! Paste it on ${p.label}` : `Opened ${p.label} — copy your response manually`, 'success')
    }
    setApproving(false)
  }

  async function markDone() {
    if (!selected) return
    const { data } = await saveResponse(selected.id, draft || '(Replied manually)')
    if (data) { updateReviewInState(data); setSelected(data); showToast('Marked as done ✓','success') }
  }

  const selectedMeta = selected ? (PLATFORM_META[selected.platform?.toLowerCase()]||PLATFORM_META.google) : null
  const isDone = selected?.responded

  const TABS = [
    { id:'pending',  label:t(T.inbox.pending, lang),    count:pending.length  },
    { id:'urgent',   label:'⚠ '+t(T.inbox.urgent, lang),   count:urgent.length   },
    { id:'positive', label:'★ '+t(T.inbox.positive, lang), count:positive.length },
    { id:'all',      label:t(T.inbox.all, lang),        count:all.length      },
  ]

  // ── Review List Panel ───────────────────────────────────────────────────────
  const listPanel = (
    <div style={{
      width: isMobile ? '100%' : 400,
      minWidth: isMobile ? 'auto' : 360,
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface)',
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ padding: isMobile ? '12px 16px 0' : '16px 16px 0', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text1)', marginBottom: 12 }}>
          {filter==='pending' ? `${pending.length} reviews awaiting response` : `${filtered.length} reviews`}
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg)', borderRadius: 10, padding: 3, overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setFilter(tab.id); setSelected(null); setDraft('') }}
              style={{ flex: '1 0 auto', padding: '6px 8px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '11px', fontWeight: filter===tab.id?600:400, background: filter===tab.id?'var(--card)':'transparent', color: filter===tab.id?'var(--text1)':'var(--text3)', transition: 'var(--ease)', whiteSpace: 'nowrap' }}>
              {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: '13px' }}>
            {filter==='pending' ? t(T.inbox.allCaughtUp, lang) : t(T.common.noData, lang)}
          </div>
        ) : filtered.map(review => {
          const p = PLATFORM_META[review.platform?.toLowerCase()]||PLATFORM_META.google
          const isUrgent = review.rating <= 2 && !review.responded
          const isSel = selected?.id === review.id

          return (
            <div key={review.id} onClick={() => selectReview(review)}
              style={{ padding: '12px', borderRadius: 10, marginBottom: 4, cursor: 'pointer', background: isSel ? 'rgba(201,169,110,.06)' : 'transparent', border: `1px solid ${isSel?'rgba(201,169,110,.3)':isUrgent?'rgba(184,92,56,.15)':'transparent'}`, transition: 'var(--ease)', opacity: review.responded ? 0.6 : 1 }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background='rgba(255,255,255,.02)' }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background='transparent' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>{p.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text1)' }}>{review.author}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isUrgent && <span style={{ fontSize: '10px', color: '#B85C38', fontWeight: 700 }}>⚠</span>}
                      {review.responded && <span style={{ fontSize: '10px', color: '#4A7C6F', fontWeight: 700 }}>✓</span>}
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(review.review_date)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Stars n={review.rating} />
                    <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{p.label}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                    {review.text||'(No text)'}
                  </div>
                </div>
              </div>
              {!review.responded && (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ padding: '4px 12px', background: 'rgba(201,169,110,.1)', border: '1px solid rgba(201,169,110,.25)', borderRadius: 20, fontSize: '11px', color: 'var(--gold)', fontWeight: 600 }}>
                    Respond now
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {reviews.length > 0 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button onClick={() => setFilter('all')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer' }}>
            View all {reviews.length} reviews →
          </button>
        </div>
      )}
    </div>
  )

  // ── Response Panel ──────────────────────────────────────────────────────────
  const detailPanel = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: 12 }}>
          <div style={{ fontSize: '32px', opacity: 0.3 }}>✍</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Select a review to start responding</div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>Click any review on the left to load it here</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px 28px' }}>

          {/* Mobile back button */}
          {isMobile && (
            <button onClick={goBackToList} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text3)', fontSize: '13px', cursor: 'pointer', padding: '0 0 16px', fontFamily: 'var(--font-sans)' }}>
              ← Back to reviews
            </button>
          )}

          {/* Review header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: selectedMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{selectedMeta.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>{selected.author}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 20, background: `${selectedMeta.color}15`, color: selectedMeta.color, fontWeight: 600, border: `1px solid ${selectedMeta.color}30` }}>{selectedMeta.label}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 20, background: 'rgba(201,169,110,.1)', color: 'var(--gold)', fontWeight: 600, border: '1px solid rgba(201,169,110,.25)' }}>{selected.rating}★</span>
                {isDone && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 20, background: 'rgba(74,124,111,.1)', color: '#4A7C6F', fontWeight: 600, border: '1px solid rgba(74,124,111,.25)' }}>✓ Replied</span>}
              </div>
              <Stars n={selected.rating} size={14} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text3)', flexShrink: 0 }}>{timeAgo(selected.review_date)}</span>
          </div>

          {/* Review text */}
          <div style={{ fontSize: '14px', color: 'var(--text1)', lineHeight: 1.75, marginBottom: 24, padding: '16px 20px', background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            {selected.text||'(No text)'}
          </div>

          {/* AI Response workspace */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[['ai','✨ AI suggested'],['manual',t(T.inbox.writeManually, lang)]].map(([id,label]) => (
                  <button key={id} onClick={() => setEditMode(id==='manual')}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '12px', fontWeight: (!editMode&&id==='ai')||(editMode&&id==='manual')?600:400, background: (!editMode&&id==='ai')||(editMode&&id==='manual')?'var(--card)':'transparent', color: (!editMode&&id==='ai')||(editMode&&id==='manual')?'var(--text1)':'var(--text3)', transition: 'var(--ease)' }}>
                    {label}
                  </button>
                ))}
              </div>
              {!editMode && draft && !aiError && (
                <span style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic' }}>AI brand voice</span>
              )}
            </div>

            {/* Response area */}
            <div style={{ padding: '16px' }}>
              {/* AI error state */}
              {aiError && !generating && (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: 10 }}>⚠</div>
                  <div style={{ fontSize: '13px', color: '#B85C38', marginBottom: 6, fontWeight: 600 }}>AI generation failed</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: 16 }}>This can happen if the AI service is temporarily busy. Try again.</div>
                  <Button onClick={generate} variant="secondary">↻ Try Again</Button>
                </div>
              )}

              {/* Empty — no draft yet */}
              {!draft && !generating && !editMode && !aiError && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)' }}>
                  <div style={{ fontSize: '24px', marginBottom: 10 }}>✨</div>
                  <div style={{ fontSize: '13px', marginBottom: 16 }}>Generate an AI response in your brand voice</div>
                  <Button onClick={generate} disabled={generating} style={{ background: 'linear-gradient(135deg,var(--gold),var(--amber))', color: 'var(--bg)' }}>
                    Generate AI Response
                  </Button>
                </div>
              )}

              {/* Loading */}
              {generating && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gold)' }}>
                  <Spinner size={24} />
                  <div style={{ marginTop: 10, fontSize: '13px' }}>Crafting response in your brand voice...</div>
                </div>
              )}

              {/* Draft */}
              {draft && !generating && !aiError && (
                <div
                  contentEditable={!isDone}
                  suppressContentEditableWarning
                  onBlur={e => setDraft(e.target.textContent)}
                  style={{ fontSize: '14px', color: 'var(--text1)', lineHeight: 1.8, minHeight: 120, outline: 'none', borderLeft: '3px solid var(--gold)', paddingLeft: 16, whiteSpace: 'pre-wrap' }}>
                  {draft}
                </div>
              )}
            </div>

            {/* Tone selector */}
            {(draft || editMode) && !generating && !aiError && (
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Tone</span>
                <select value={tone} onChange={e => setTone(e.target.value)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text1)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                  <option value="professional">Professional</option>
                  <option value="empathetic">Empathetic</option>
                  <option value="concise">Concise</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
            )}

            {/* Action buttons */}
            {!isDone && draft && !generating && !aiError && (
              <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={approve} disabled={approving}
                  style={{ flex: 1, minWidth: 140, padding: '12px 16px', background: 'linear-gradient(135deg,var(--gold),var(--amber))', border: 'none', borderRadius: 'var(--r-md)', color: 'var(--bg)', fontSize: '13px', fontWeight: 700, cursor: approving?'not-allowed':'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: approving?0.7:1 }}>
                  {approving ? <><Spinner /> Posting...</> : <>✓ Approve & Post</>}
                </button>
                <button onClick={() => setEditMode(true)}
                  style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text2)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                  ✎ Edit
                </button>
                <button onClick={generate} disabled={generating}
                  style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text2)', fontSize: '13px', cursor: generating?'not-allowed':'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                  ↻
                </button>
                <button onClick={markDone} title="Mark as done without posting"
                  style={{ padding: '12px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text3)', fontSize: '13px', cursor: 'pointer' }}>
                  ✓
                </button>
              </div>
            )}

            {!isDone && draft && !generating && !aiError && (
              <div style={{ padding: '8px 16px 12px', fontSize: '11px', color: 'var(--text3)', textAlign: 'center' }}>
                "Approve & Post" copies your response and opens {selectedMeta?.label} — paste and publish.
              </div>
            )}

            {isDone && (
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#4A7C6F', fontWeight: 500 }}>✓ Response saved</span>
                <button onClick={() => navigator.clipboard?.writeText(draft).then(() => showToast('Copied!','success'))}
                  style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: '12px', cursor: 'pointer' }}>
                  📋 Copy again
                </button>
              </div>
            )}
          </div>

          {!draft && !generating && editMode && !aiError && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <Button onClick={generate} disabled={generating} variant="secondary">✨ Generate AI Draft</Button>
              <Button onClick={markDone} variant="ghost">Mark as Done</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <Layout title="Inbox" subtitle="AI drafts the perfect response — you approve and post">
      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        {/* Mobile: show one panel at a time */}
        {isMobile ? (
          mobileView === 'list' ? listPanel : detailPanel
        ) : (
          /* Desktop: side-by-side */
          <>{listPanel}{detailPanel}</>
        )}
      </div>

      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} reason={upgradeReason}
          onCheckout={async (plan) => {
            const r = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, clinicId: property?.id, email: property?.owner_email }) })
            const d = await r.json()
            if (d.url) window.location.href = d.url
          }} />
      )}
    </Layout>
  )
}
