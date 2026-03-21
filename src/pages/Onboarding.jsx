import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Spinner } from '../components/UI.jsx'
import { updateClinic } from '../lib/supabase.js'
import { useApp } from '../lib/store.jsx'
import { useLang } from '../lib/lang.jsx'

export default function Onboarding() {
  const { clinic, updateClinicInState } = useApp()
  const { t } = useLang()
  const to = t.onboarding
  const navigate = useNavigate()
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [form, setForm]     = useState({
    name: '', address: '', phone: '',
    owner_email: clinic?.owner_email || '',
    monthly_appts: 80, avg_revenue: 1200, target_rating: 4.7,
  })

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  async function next() {
    setError('')
    if (step === 0) {
      if (!form.name.trim()) { setError('Please enter your clinic name.'); return }
      setStep(1)
    } else if (step === 1) {
      setSaving(true)
      const { data, error: err } = await updateClinic({
        name: form.name,
        address: form.address,
        phone: form.phone,
        owner_email: form.owner_email,
        monthly_appts: form.monthly_appts,
        avg_revenue: form.avg_revenue,
        target_rating: form.target_rating,
      })
      if (err) {
        setError('Could not save: ' + err.message)
        setSaving(false)
        return
      }
      if (data) {
        updateClinicInState(data)
        // Mark as onboarded so we never show this again
        if (data.id) localStorage.setItem(`replyiq_onboarded_${data.id}`, '1')
      }
      setSaving(false)
      setStep(2)
    } else {
      // Step 3 complete — navigate to dashboard WITHOUT reloading
      navigate('/', { replace: true })
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ position:'fixed', top:'-10%', right:'-5%', width:500, height:500, borderRadius:'50%', background:'var(--teal)', opacity:0.04, pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:'-10%', left:'-5%', width:400, height:400, borderRadius:'50%', background:'var(--sea)', opacity:0.04, pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:480 }}>
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.2rem', letterSpacing:'-1px' }}>ReplyIQ</div>
          <div style={{ fontSize:'0.65rem', color:'var(--mint)', letterSpacing:'3px', textTransform:'uppercase', marginTop:4, fontWeight:600 }}>
            {to?.setup || 'Setup your clinic'}
          </div>
        </div>

        {/* Steps */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:32 }}>
          {['Your Clinic', 'Your Numbers', 'Ready'].map((s, i) => (
            <div key={s} style={{ display:'flex', alignItems:'center' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.82rem', fontWeight:600, background:i<=step?'var(--teal)':'var(--navy)', color:i<=step?'#fff':'var(--mid)', border:`2px solid ${i<=step?'var(--teal)':'var(--border)'}`, transition:'all .2s' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ fontSize:'0.68rem', color:i===step?'var(--mint)':'var(--mid)', fontWeight:i===step?600:400 }}>{s}</div>
              </div>
              {i < 2 && <div style={{ width:60, height:2, background:i<step?'var(--teal)':'var(--border)', margin:'0 8px', marginBottom:20, transition:'background .2s' }}/>}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'32px 28px' }}>

          {/* Step 0 — Clinic info */}
          {step === 0 && (
            <>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', marginBottom:6 }}>Tell us about your clinic</div>
              <div style={{ fontSize:'0.85rem', color:'var(--silver)', marginBottom:24, lineHeight:1.5 }}>This personalises your intelligence reports and benchmarking.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Input label="Clinic Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Zahnarztpraxis Weber"/>
                <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. Bahnhofstrasse 12, 8001 Zürich"/>
                <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. +41 44 123 45 67"/>
                <Input label="Your Email (for weekly reports)" type="email" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} placeholder="your@email.com"/>
              </div>
            </>
          )}

          {/* Step 1 — Numbers */}
          {step === 1 && (
            <>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', marginBottom:6 }}>A few quick numbers</div>
              <div style={{ fontSize:'0.85rem', color:'var(--silver)', marginBottom:24, lineHeight:1.5 }}>Used to calculate your revenue impact estimates. Change any time in Settings.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Input label="Monthly Appointments" type="number" value={form.monthly_appts} onChange={e => set('monthly_appts', +e.target.value)} suffix="visits/month"/>
                <Input label="Average Revenue Per Visit" type="number" value={form.avg_revenue} onChange={e => set('avg_revenue', +e.target.value)} prefix="CHF"/>
                <Input label="Target Google Rating" type="number" value={form.target_rating} onChange={e => set('target_rating', +e.target.value)} step="0.1" min="4" max="5" suffix="★ goal"/>
              </div>
              <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(2,131,144,.08)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', fontSize:'0.8rem', color:'var(--silver)', lineHeight:1.5 }}>
                Estimated monthly revenue: <strong style={{ color:'var(--white)' }}>CHF {(form.monthly_appts * form.avg_revenue).toLocaleString()}</strong>
              </div>
            </>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <div style={{ fontSize:'3rem', marginBottom:16 }}>✓</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.4rem', marginBottom:10 }}>You're all set!</div>
              <div style={{ fontSize:'0.9rem', color:'var(--silver)', lineHeight:1.6, marginBottom:24 }}>
                <strong style={{ color:'var(--white)' }}>{form.name}</strong> is ready.<br/>
                Your dashboard has 12 demo reviews loaded so you can explore every feature right now.<br/><br/>
                Weekly reports will be sent to <strong style={{ color:'var(--mint)' }}>{form.owner_email}</strong>.
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:'0.85rem', color:'var(--silver)', textAlign:'left', background:'var(--navy)', borderRadius:'var(--r-sm)', padding:'16px' }}>
                {['✓ AI review classification', '✓ GDPR-compliant response drafting', '✓ Reputation Risk Index', '✓ Revenue impact estimator', '✓ Competitor benchmarking', '✓ Weekly intelligence report'].map(f => <div key={f}>{f}</div>)}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(232,72,85,.1)', border:'1px solid rgba(232,72,85,.25)', borderRadius:'var(--r-sm)', fontSize:'0.83rem', color:'var(--rose)' }}>
              {error}
            </div>
          )}

          <Button fullWidth size="lg" onClick={next} disabled={saving || (step === 0 && !form.name.trim())} style={{ marginTop:24 }}>
            {saving ? <><Spinner/> Saving...</> : step === 2 ? 'Open My Dashboard →' : 'Continue →'}
          </Button>
        </div>

        <div style={{ textAlign:'center', marginTop:16, fontSize:'0.75rem', color:'var(--mid)' }}>
          You can update all of this any time in Settings
        </div>
      </div>
    </div>
  )
}
