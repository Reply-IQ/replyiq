import { useState, useEffect, useRef } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Button, Spinner } from '../components/UI.jsx'
import { useApp, useLang } from '../lib/store.jsx'
import { T, t } from '../lib/i18n.js'
import { supabase } from '../lib/supabase.js'

const PLATFORMS = [
  {
    id: 'google', icon: '🔍', color: '#4285F4', name: 'Google Business',
    desc: 'Your most important platform. All guest reviews imported automatically.',
    fieldLabel: 'Google Place ID',
    fieldPH: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    steps: [
      'Go to Google Maps and search for your property',
      'Click on your property in the results',
      'Copy the Place ID from the URL or use the Place ID Finder tool',
    ],
    hint: '🔗 Find your Place ID: maps.google.com → search your property → share link → copy the ChIJ… code',
    hintLink: 'https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder',
    hintLinkLabel: 'Open Place ID Finder',
  },
  {
    id: 'tripadvisor', icon: '🦉', color: '#00AF87', name: 'TripAdvisor',
    desc: 'Critical for hotels. Millions of travellers check TripAdvisor before booking.',
    fieldLabel: 'TripAdvisor Property URL',
    fieldPH: 'https://www.tripadvisor.com/Hotel_Review-g188113-d123456-Reviews-Hotel_Name-Zurich.html',
    steps: [
      'Go to tripadvisor.com and search for your hotel or restaurant',
      'Click on your property page',
      'Copy the full URL from your browser address bar',
      'Paste it below — it must start with tripadvisor.com/Hotel_Review or /Restaurant_Review',
    ],
    hint: '⚠ The URL must be the full property page URL, not a search result. Example: tripadvisor.com/Hotel_Review-g188113-d123456-...',
  },
  {
    id: 'booking', icon: '🏨', color: '#003580', name: 'Booking.com',
    desc: 'Essential for hotels. Guests trust Booking.com reviews heavily.',
    fieldLabel: 'Booking.com Property URL',
    fieldPH: 'https://www.booking.com/hotel/ch/hotel-name-zurich.en-gb.html',
    steps: [
      'Go to booking.com and search for your property',
      'Click on your property listing',
      'Copy the full URL from the address bar',
      'Paste it below — it must contain booking.com/hotel/',
    ],
    hint: '⚠ Copy the URL directly from your property page on Booking.com, not from search results.',
  },
  {
    id: 'holidaycheck', icon: '🌞', color: '#FF6600', name: 'HolidayCheck',
    desc: '9.4M German-speaking users. The #1 review platform for German-speaking guests.',
    fieldLabel: 'HolidayCheck Property URL',
    fieldPH: 'https://www.holidaycheck.de/h/hotel-name/uuid',
    steps: [
      'Go to holidaycheck.de and search for your hotel',
      'Click on your property page',
      'Copy the full URL from the address bar',
      'Paste it below — it must start with holidaycheck.de/h/',
    ],
    hint: '⚠ Copy the URL from your property page on HolidayCheck, not from search results.',
  },
]

export default function Platforms() {
  const { property, updatePropertyInState, showToast, loadAll } = useApp()
  const { lang } = useLang()
  const [inputs,   setInputs]   = useState({})
  const [loading,  setLoading]  = useState({})
  const [progress, setProgress] = useState({})
  const pollRef = useRef(null)
  const connections = property?.platform_connections || {}

  function setInput(id, v) { setInputs(p => ({ ...p, [id]: v })) }
  function setLoad(id, v)  { setLoading(p => ({ ...p, [id]: v })) }
  function setMsg(id, v)   { setProgress(p => ({ ...p, [id]: v })) }

  // On page load: auto-resume any in-progress import
  useEffect(() => {
    if (!property?.pending_review_job) return
    try {
      const pending = JSON.parse(property.pending_review_job)
      if (!pending?.jobId) return
      const platform = PLATFORMS.find(p => p.id === pending.platformId)
      if (!platform) return
      setLoad(platform.id, true)
      setMsg(platform.id, 'Resuming import — checking status...')
      pollForResults(platform, pending.jobId, pending.clinicId || property.id, pending.identifier)
    } catch {}
  }, [property?.id])

  async function connect(platform) {
    const identifier = inputs[platform.id]?.trim()
    if (!identifier) { showToast('Please enter the ' + platform.fieldLabel, 'error'); return }
    setLoad(platform.id, true)
    setMsg(platform.id, `Starting import — fetching all reviews from ${platform.name}...`)

    try {
      const r = await fetch('/api/fetch-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform.id, identifier, clinicId: property.id }),
      })
      const data = await r.json()

      if (data.error) {
        showToast(`Error: ${data.error}`, 'error')
        setLoad(platform.id, false)
        setMsg(platform.id, '')
        return
      }

      if (data.jobId) {
        // Save identifier to connection immediately so UI shows connected
        const newConns = {
          ...connections,
          [platform.id]: {
            ...connections[platform.id],
            identifier,
            connectedAt: connections[platform.id]?.connectedAt || new Date().toISOString(),
            reviewCount: connections[platform.id]?.reviewCount || 0,
          }
        }
        await supabase.from('clinics').update({ platform_connections: newConns }).eq('id', property.id)
        updatePropertyInState({ ...property, platform_connections: newConns })

        setMsg(platform.id, 'Import running — you can navigate away, reviews will appear automatically ✓')
        pollForResults(platform, data.jobId, property.id, identifier)
      }
    } catch (e) {
      showToast('Connection failed: ' + e.message, 'error')
      setLoad(platform.id, false)
      setMsg(platform.id, '')
    }
  }

  function pollForResults(platform, jobId, clinicId, identifier) {
    if (pollRef.current) clearInterval(pollRef.current)
    let attempts = 0
    const maxAttempts = 60 // 60 × 10s = 10 minutes max

    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const r = await fetch('/api/check-reviews-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, clinicId, platform: platform.id, identifier }),
        })
        const data = await r.json()

        if (data.status === 'done') {
          clearInterval(pollRef.current)
          pollRef.current = null
          if (data.count > 0) {
            showToast(`✓ ${data.count} reviews imported successfully!`, 'success')
          } else {
            showToast(data.warning || 'Import complete — no new reviews found.', 'info')
          }
          await loadAll()
          setLoad(platform.id, false)
          setMsg(platform.id, '')
          return
        }

        if (data.error) {
          clearInterval(pollRef.current)
          pollRef.current = null
          showToast('Import error: ' + data.error, 'error')
          setLoad(platform.id, false)
          setMsg(platform.id, '')
          return
        }

        // Still pending — update elapsed time
        const elapsed = attempts * 10
        setMsg(platform.id, `Fetching reviews from ${platform.name}... ${elapsed}s elapsed. You can navigate away.`)

        if (attempts >= maxAttempts) {
          clearInterval(pollRef.current)
          pollRef.current = null
          setLoad(platform.id, false)
          setMsg(platform.id, '')
          showToast('Import is taking longer than expected. Come back in a few minutes — your reviews will appear automatically.', 'info')
        }
      } catch {}
    }, 10000)
  }

  async function syncReviews(platform) {
    const conn = connections[platform.id]
    if (!conn?.identifier) return
    const identifier = conn.identifier
    setLoad(platform.id, true)
    setMsg(platform.id, `Syncing latest reviews from ${platform.name}...`)
    try {
      const r = await fetch('/api/fetch-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform.id, identifier, clinicId: property.id }),
      })
      const data = await r.json()
      if (data.error) { showToast(data.error, 'error'); setLoad(platform.id, false); setMsg(platform.id, ''); return }
      if (data.jobId) {
        setMsg(platform.id, 'Sync running in background — reviews will update automatically ✓')
        pollForResults(platform, data.jobId, property.id, identifier)
      }
    } catch (e) { showToast(e.message, 'error'); setLoad(platform.id, false); setMsg(platform.id, '') }
  }

  async function disconnect(id) {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    const newConns = { ...connections }
    delete newConns[id]
    await supabase.from('clinics').update({ platform_connections: newConns, pending_review_job: null }).eq('id', property.id)
    await supabase.from('reviews').delete().eq('clinic_id', property.id).eq('platform', id)
    updatePropertyInState({ ...property, platform_connections: newConns, pending_review_job: null })
    await loadAll()
    showToast('Platform disconnected', 'info')
  }

  const totalReviews = Object.values(connections).reduce((s, c) => s + (c.reviewCount || 0), 0)
  const connected    = Object.keys(connections).length

  return (
    <Layout title={t(T.nav.platforms, lang)} subtitle={t(T.platforms.subtitle, lang)}>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: t(T.platforms.connected, lang)+' '+t(T.nav.platforms, lang), value: `${connected} / 6`, accent: 'var(--gold)' },
          { label: t(T.platforms.totalReviews, lang),        value: totalReviews.toLocaleString(),        accent: '#5a9080' },
          { label: t(T.platforms.autoResponse, lang),        value: connected > 0 ? t(T.platforms.active247, lang) : 'Connect a platform', accent: connected > 0 ? '#4A7C6F' : 'var(--text3)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Platform cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLATFORMS.map(platform => {
          const conn   = connections[platform.id]
          const isConn = !!conn
          const isLoad = loading[platform.id]
          const msg    = progress[platform.id]

          return (
            <Card key={platform.id} style={{ borderLeft: isConn ? `4px solid ${platform.color}` : '1px solid var(--border)', transition: 'var(--ease)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

                {/* Icon */}
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${platform.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {platform.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{platform.name}</span>
                    {isConn && (
                      <span style={{ background: `${platform.color}15`, color: platform.color, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${platform.color}40` }}>
                        ✓ Connected · {(conn.reviewCount || 0).toLocaleString()} reviews
                      </span>
                    )}
                    {isConn && conn.lastSyncedAt && (
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                        Last sync: {new Date(conn.lastSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5 }}>{platform.desc}</div>

                  {/* Progress message */}
                  {msg && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: '10px 14px', background: `${platform.color}08`, borderRadius: 8, border: `1px solid ${platform.color}25` }}>
                      <Spinner />
                      <span style={{ fontSize: '13px', color: platform.color, fontWeight: 500, lineHeight: 1.5 }}>{msg}</span>
                    </div>
                  )}

                  {/* Not connected — show step-by-step guide + input */}
                  {!isConn && !isLoad && (
                    <div>
                      {/* Step-by-step instructions */}
                      {platform.steps && (
                        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', marginBottom: 14, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                            How to find your {platform.name} URL
                          </div>
                          {platform.steps.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < platform.steps.length - 1 ? 8 : 0, alignItems: 'flex-start' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${platform.color}20`, color: platform.color, fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>{step}</div>
                            </div>
                          ))}
                          {platform.hintLink && (
                            <a href={platform.hintLink} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-block', marginTop: 10, fontSize: '12px', color: platform.color, fontWeight: 600 }}>
                              → {platform.hintLinkLabel || 'Open tool'}
                            </a>
                          )}
                        </div>
                      )}

                      {/* Input + connect */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text3)', fontWeight: 600, marginBottom: 5 }}>
                            {platform.fieldLabel}
                          </div>
                          <input
                            value={inputs[platform.id] || ''}
                            onChange={e => setInput(platform.id, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && connect(platform)}
                            placeholder={platform.fieldPH}
                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={e => e.target.style.borderColor = platform.color}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                          />
                          {platform.hint && (
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: 5, lineHeight: 1.5 }}>{platform.hint}</div>
                          )}
                        </div>
                        <Button
                          onClick={() => connect(platform)}
                          disabled={!inputs[platform.id]?.trim()}
                          style={{ background: platform.color, color: 'white', flexShrink: 0 }}>
                          Connect {platform.name}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Not connected but loading */}
                  {!isConn && isLoad && !msg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: '13px' }}>
                      <Spinner /> Connecting...
                    </div>
                  )}

                  {/* Connected — Google is locked, others can disconnect */}
                  {isConn && !isLoad && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Show locked Place ID for Google */}
                      {platform.id === 'google' && conn?.identifier && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>Place ID</span>
                          <span style={{ fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--font-mono)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conn.identifier}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text3)', flexShrink: 0 }}>🔒 Locked</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="secondary" size="sm" onClick={() => syncReviews(platform)}>
                          🔄 Sync Reviews
                        </Button>
                        {/* Only allow disconnect for non-Google platforms */}
                        {platform.id !== 'google' && (
                          <Button variant="ghost" size="sm" onClick={() => disconnect(platform.id)}>
                            Disconnect
                          </Button>
                        )}
                        {platform.id === 'google' && (
                          <span style={{ fontSize: '11px', color: 'var(--text3)', alignSelf: 'center' }}>
                            Contact support to change your property
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Connected but loading */}
                  {isConn && isLoad && !msg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: '13px' }}>
                      <Spinner /> Syncing...
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </Layout>
  )
}
