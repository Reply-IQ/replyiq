import { useState, useRef } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Button, Spinner } from '../components/UI.jsx'
import { useApp } from '../lib/store.jsx'
import { supabase, upsertReviews } from '../lib/supabase.js'

const PLATFORMS = [
  { id: 'google',      icon: '🔍', color: '#4285F4', name: 'Google Business',  desc: 'Your most important platform. All guest reviews.',                      fieldLabel: 'Google Place ID',   fieldPH: 'ChIJN1t_tDeuEmsRUsoyG83frY4', hint: 'Find at: developers.google.com/maps/documentation/javascript/examples/places-placeid-finder' },
  { id: 'tripadvisor', icon: '🦉', color: '#00AF87', name: 'TripAdvisor',      desc: 'Critical for hotels. Millions of travellers check TripAdvisor first.', fieldLabel: 'TripAdvisor URL',   fieldPH: 'https://www.tripadvisor.com/Hotel_Review-...', hint: 'Copy the full URL of your TripAdvisor property page' },
  { id: 'booking',     icon: '🏨', color: '#003580', name: 'Booking.com',      desc: 'Essential for hotels. Guests trust Booking reviews heavily.',           fieldLabel: 'Booking.com URL',   fieldPH: 'https://www.booking.com/hotel/ch/...', hint: 'Copy the full URL of your Booking.com property page' },
  { id: 'instagram',   icon: '📸', color: '#E1306C', name: 'Instagram',        desc: 'Monitor comments and DMs. Use with Chrome extension.',                 fieldLabel: 'Instagram Handle',  fieldPH: '@yourhotel', hint: 'Use the ReplyIQ Chrome extension for Instagram comments' },
  { id: 'facebook',    icon: '📘', color: '#1877F2', name: 'Facebook Reviews', desc: 'Many guests still leave reviews on Facebook.',                         fieldLabel: 'Facebook Page URL', fieldPH: 'https://www.facebook.com/YourHotel', hint: 'Copy the URL of your Facebook business page' },
]

export default function Platforms() {
  const { property, updatePropertyInState, showToast, loadAll } = useApp()
  const [inputs, setInputs]       = useState({})
  const [loading, setLoading]     = useState({})
  const [progress, setProgress]   = useState({}) // { platformId: 'message' }
  const pollRefs                  = useRef({})
  const connections               = property?.platform_connections || {}

  function setInput(id, v) { setInputs(p => ({ ...p, [id]: v })) }
  function setLoad(id, v)  { setLoading(p => ({ ...p, [id]: v })) }
  function setMsg(id, v)   { setProgress(p => ({ ...p, [id]: v })) }

  async function connect(platform) {
    const identifier = inputs[platform.id]?.trim()
    if (!identifier) { showToast('Please enter the ' + platform.fieldLabel, 'error'); return }
    setLoad(platform.id, true)
    setMsg(platform.id, 'Starting import...')

    try {
      const r = await fetch('/api/fetch-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform.id, identifier }),
      })
      const data = await r.json()

      if (data.error) {
        showToast(`${platform.name}: ${data.error}`, 'error')
        setLoad(platform.id, false)
        setMsg(platform.id, '')
        return
      }

      // Async job started — begin polling
      if (data.jobId) {
        setMsg(platform.id, 'Fetching all reviews from Google... this takes 30–60 seconds ⏳')
        pollForResults(platform, identifier, data.jobId)
        return
      }

      // Sync response (fallback)
      await saveResults(platform, identifier, data)

    } catch (e) {
      showToast('Connection failed: ' + e.message, 'error')
      setLoad(platform.id, false)
      setMsg(platform.id, '')
    }
  }

  function pollForResults(platform, identifier, jobId) {
    let attempts = 0
    const maxAttempts = 40 // 40 × 5s = 3.5 min max

    const interval = setInterval(async () => {
      attempts++
      try {
        const r = await fetch('/api/check-reviews-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId }),
        })
        const data = await r.json()

        if (data.status === 'done') {
          clearInterval(interval)
          delete pollRefs.current[platform.id]
          setMsg(platform.id, `✓ Found ${data.count} reviews — saving...`)
          await saveResults(platform, identifier, data)
          return
        }

        if (data.error) {
          clearInterval(interval)
          delete pollRefs.current[platform.id]
          showToast('Import failed: ' + data.error, 'error')
          setLoad(platform.id, false)
          setMsg(platform.id, '')
          return
        }

        // Still pending — update message with elapsed time
        const elapsed = attempts * 5
        setMsg(platform.id, `Fetching all reviews from Google... ${elapsed}s elapsed ⏳`)

        if (attempts >= maxAttempts) {
          clearInterval(interval)
          delete pollRefs.current[platform.id]
          showToast('Import timed out — try again or contact support', 'error')
          setLoad(platform.id, false)
          setMsg(platform.id, '')
        }
      } catch (e) {
        // Network glitch — keep polling
      }
    }, 5000)

    pollRefs.current[platform.id] = interval
  }

  async function saveResults(platform, identifier, data) {
    try {
      const newConns = {
        ...connections,
        [platform.id]: {
          identifier,
          connectedAt: new Date().toISOString(),
          reviewCount: data.count,
          businessInfo: data.businessInfo,
        }
      }
      await supabase.from('clinics').update({ platform_connections: newConns }).eq('id', property.id)
      updatePropertyInState({ ...property, platform_connections: newConns })

      if (data.reviews?.length > 0) {
        await upsertReviews(property.id, data.reviews)
        await loadAll()
      }

      showToast(`✓ ${platform.name} connected! ${data.count} reviews imported.`, 'success')
    } catch (e) {
      showToast('Failed to save reviews: ' + e.message, 'error')
    }
    setLoad(platform.id, false)
    setMsg(platform.id, '')
  }

  async function disconnect(id) {
    if (pollRefs.current[id]) { clearInterval(pollRefs.current[id]); delete pollRefs.current[id] }
    const newConns = { ...connections }
    delete newConns[id]
    await supabase.from('clinics').update({ platform_connections: newConns }).eq('id', property.id)
    await supabase.from('reviews').delete().eq('clinic_id', property.id).eq('platform', id)
    updatePropertyInState({ ...property, platform_connections: newConns })
    await loadAll()
    showToast('Platform disconnected', 'info')
  }

  const totalReviews = Object.values(connections).reduce((s, c) => s + (c.reviewCount || 0), 0)
  const connected    = Object.keys(connections).length

  return (
    <Layout title="Platforms" subtitle="Connect your review platforms — AI monitors all simultaneously">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Platforms Connected', value: `${connected} / ${PLATFORMS.length}`, accent: 'var(--gold)' },
          { label: 'Total Reviews',        value: totalReviews.toLocaleString(),        accent: '#5a9080' },
          { label: 'Auto-Response',        value: connected > 0 ? '✓ Active 24/7' : 'Connect a platform', accent: connected > 0 ? '#4A7C6F' : 'var(--text3)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLATFORMS.map(platform => {
          const conn  = connections[platform.id]
          const isConn = !!conn
          const isLoad = loading[platform.id]
          const msg   = progress[platform.id]

          return (
            <Card key={platform.id} style={{ borderLeft: isConn ? `4px solid ${platform.color}` : '1px solid var(--border)', transition: 'var(--ease)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${platform.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {platform.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{platform.name}</span>
                    {isConn && (
                      <span style={{ background: `${platform.color}15`, color: platform.color, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: `1px solid ${platform.color}40` }}>
                        ✓ Connected · {conn.reviewCount || 0} reviews
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: isConn ? 10 : 14, lineHeight: 1.5 }}>{platform.desc}</div>

                  {/* Progress message during import */}
                  {msg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', background: `${platform.color}10`, borderRadius: 8, border: `1px solid ${platform.color}30` }}>
                      <Spinner />
                      <span style={{ fontSize: '13px', color: platform.color, fontWeight: 500 }}>{msg}</span>
                    </div>
                  )}

                  {!isConn && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text3)', fontWeight: 600, marginBottom: 5 }}>{platform.fieldLabel}</div>
                        <input value={inputs[platform.id] || ''} onChange={e => setInput(platform.id, e.target.value)} placeholder={platform.fieldPH}
                          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none' }}
                          onFocus={e => e.target.style.borderColor = platform.color}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: 4 }}>{platform.hint}</div>
                      </div>
                      <Button onClick={() => connect(platform)} disabled={isLoad || !inputs[platform.id]} style={{ background: platform.color, flexShrink: 0 }}>
                        {isLoad ? <><Spinner /> Importing...</> : `Connect ${platform.name}`}
                      </Button>
                    </div>
                  )}

                  {isConn && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => { setInput(platform.id, conn.identifier); connect(platform) }} disabled={isLoad}>
                        {isLoad ? <><Spinner /> Syncing...</> : '🔄 Sync Reviews'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => disconnect(platform.id)}>Disconnect</Button>
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