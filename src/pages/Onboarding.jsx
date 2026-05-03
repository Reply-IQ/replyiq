import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Spinner } from '../components/UI.jsx'
import { updateProperty } from '../lib/supabase.js'
import { useApp } from '../lib/store.jsx'
import { scanWebsite } from '../lib/api.js'

const STEPS = ['Your Property', 'AI Setup', 'Ready']

export default function Onboarding() {
  const { property, updatePropertyInState } = useApp()
  const navigate = useNavigate()
  const [step, setStep]         = useState(0)
  const [saving, setSaving]     = useState(false)
  const [scanning, setScanning] = useState(false)
  const [aiProfile, setProfile] = useState(null)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({
    name: '', website_url: '', address: '', phone: '',
    owner_email: property?.owner_email || '',
    monthly_revenue: 150000, target_rating: 4.7,
    property_type: 'hotel',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function scan() {
    if (!form.website_url) { setError('Please enter your website URL first'); return }
    setScanning(true); setError('')
    const url = form.website_url.startsWith('http') ? form.website_url : `https://${form.website_url}`
    const data = await scanWebsite(url)
    if (data.error) { setError('Could not scan: ' + data.error); setScanning(false); return }
    setProfile(data.profile)
    if (!form.name && data.profile?.businessName) set('name', data.profile.businessName)
    setScanning(false)
  }

  async function next() {
    setError('')
    if (step === 0) {
      if (!form.name.trim()) { setError('Please enter your property name'); return }
      setStep(1)
    } else if (step === 1) {
      setSaving(true)
      const url = form.website_url.startsWith('http') ? form.website_url : form.website_url ? `https://${form.website_url}` : ''
      const { data, error: err } = await updateProperty({
        name: form.name, website_url: url, address: form.address,
        phone: form.phone, owner_email: form.owner_email,
        avg_revenue: form.monthly_revenue, target_rating: form.target_rating,
        ai_profile: aiProfile || { industry: form.property_type, responseLanguage: 'en', brandTone: 'professional', responsePersonality: `Warm, professional ${form.property_type} that genuinely cares about guest experiences.` },
      })
      if (err) { setError('Save failed: ' + err.message); setSaving(false); return }
      if (data) {
        updatePropertyInState(data)
        localStorage.setItem(`replyiq_onboarded_${data.id}`, '1')
      }
      setSaving(false); setStep(2)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'fixed', top: '5%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: 4 }}>
            Reply<span style={{ color: 'var(--gold)' }}>IQ</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 500 }}>Setup your property</div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, background: i <= step ? 'var(--gold)' : 'var(--card)', color: i <= step ? 'var(--bg)' : 'var(--text3)', border: `2px solid ${i <= step ? 'var(--gold)' : 'var(--border)'}`, transition: 'all .2s' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: '10px', color: i === step ? 'var(--gold)' : 'var(--text3)', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</div>
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 60, height: 2, background: i < step ? 'var(--gold)' : 'var(--border)', margin: '0 8px', marginBottom: 20, transition: 'background .2s' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '28px 24px' }}>

          {step === 0 && <>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: 5 }}>Tell us about your property</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: 22, lineHeight: 1.5 }}>ReplyIQ works for hotels, restaurants, resorts, bars and more.</div>

            {/* Property type */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text3)', fontWeight: 600, marginBottom: 8 }}>Property Type</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ id: 'hotel', icon: '🏨', label: 'Hotel' }, { id: 'restaurant', icon: '🍽️', label: 'Restaurant' }, { id: 'bar', icon: '🍸', label: 'Bar / Club' }, { id: 'resort', icon: '🌴', label: 'Resort' }].map(t => (
                  <button key={t.id} onClick={() => set('property_type', t.id)}
                    style={{ flex: 1, padding: '10px 8px', border: `1px solid ${form.property_type === t.id ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', background: form.property_type === t.id ? 'rgba(201,169,110,.08)' : 'var(--surface)', color: form.property_type === t.id ? 'var(--gold)' : 'var(--text3)', cursor: 'pointer', fontSize: '11px', textAlign: 'center', transition: 'var(--ease)' }}>
                    <div style={{ fontSize: '18px', marginBottom: 4 }}>{t.icon}</div>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Property Name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Hotel Baur au Lac" />
              <Input label="Website URL" value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="www.yourhotel.ch" />
              <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Talstrasse 1, 8001 Zürich" />
              <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+41 44 220 50 20" />
              <Input label="Your Email (weekly reports)" type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} placeholder="gm@yourhotel.ch" />
            </div>
          </>}

          {step === 1 && <>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: 5 }}>AI learns your property</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: 20, lineHeight: 1.5 }}>
              We scan your website to learn your tone, services, and brand voice. Every AI response will sound like you wrote it.
            </div>

            {!aiProfile ? (
              <Button fullWidth onClick={scan} disabled={scanning} style={{ marginBottom: 16 }}>
                {scanning ? <><Spinner /> Scanning {form.website_url}...</> : '🔍 Scan Website — Build AI Profile'}
              </Button>
            ) : (
              <div style={{ background: 'rgba(74,124,111,.06)', border: '1px solid rgba(74,124,111,.2)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16 }}>
                <div style={{ color: '#4A7C6F', fontWeight: 600, marginBottom: 10, fontSize: '13px' }}>✓ AI Profile Created</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '12px' }}>
                  {[
                    ['Industry', aiProfile.industry],
                    ['Language', aiProfile.responseLanguage || aiProfile.primaryLanguage],
                    ['Tone', aiProfile.brandTone],
                    ['Country', aiProfile.country],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color: 'var(--text3)', marginBottom: 2 }}>{k}</div>
                      <div style={{ color: 'var(--text1)', fontWeight: 500 }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
                {aiProfile.responsePersonality && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5, borderLeft: '3px solid var(--gold)' }}>
                    "{aiProfile.responsePersonality}"
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={scan} style={{ marginTop: 10 }}>↻ Re-scan</Button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Monthly Revenue (CHF)" type="number" value={form.monthly_revenue} onChange={e => set('monthly_revenue', +e.target.value)} prefix="CHF" />
              <Input label="Target Rating" type="number" value={form.target_rating} onChange={e => set('target_rating', +e.target.value)} step="0.1" min="4" max="5" suffix="★ goal" />
            </div>

            {!aiProfile && (
              <button onClick={() => setProfile({ industry: form.property_type, responseLanguage: 'de', brandTone: 'professional', responsePersonality: `Professional and warm ${form.property_type} that cares about every guest.` })}
                style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '12px', marginTop: 10, padding: 0 }}>
                No website yet? Skip AI scan →
              </button>
            )}
          </>}

          {step === 2 && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: 10 }}>You're all set!</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', lineHeight: 1.7, marginBottom: 22 }}>
                <strong style={{ color: 'var(--text1)' }}>{form.name}</strong> is live on ReplyIQ.<br />
                {aiProfile ? 'AI has learned your brand voice and is ready.' : 'Connect your website in Settings to activate AI voice.'}<br /><br />
                Next step: connect your review platforms in <strong style={{ color: 'var(--gold)' }}>Settings → Platforms</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '13px', color: 'var(--text2)', textAlign: 'left', background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 16 }}>
                {['✓ Google Reviews auto-import', '✓ TripAdvisor & Booking.com', '✓ AI response drafting', '✓ Revenue ROI tracking', '✓ Competitor benchmarking', '✓ Weekly intelligence reports'].map(f => <div key={f}>{f}</div>)}
              </div>
            </div>
          )}

          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(184,92,56,.08)', border: '1px solid rgba(184,92,56,.2)', borderRadius: 'var(--r-sm)', fontSize: '13px', color: '#B85C38' }}>{error}</div>}

          <Button fullWidth size="lg" onClick={next} disabled={saving || (step === 0 && !form.name.trim())} style={{ marginTop: 22 }}>
            {saving ? <><Spinner /> Saving...</> : step === 2 ? 'Open Dashboard →' : 'Continue →'}
          </Button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: '12px', color: 'var(--text3)' }}>All details can be updated in Settings</div>
      </div>
    </div>
  )
}
