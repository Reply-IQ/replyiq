import { useState, useRef, useEffect } from 'react'
import { Button, Input, Spinner } from '../components/UI.jsx'
import { updateProperty, supabase } from '../lib/supabase.js'
import { useApp } from '../lib/store.jsx'
import { scanWebsite } from '../lib/api.js'

const STEPS = ['Your Property', 'Connect Platforms', 'Ready']

const PLATFORMS = [
  { id:'google',      icon:'🔍', color:'#4285F4', name:'Google Business', badge:'Most important', required:true,  comingSoon:false,
    desc:'Google reviews directly affect your search ranking and bookings. Connect this first.',
    fieldLabel:'Google Place ID', fieldPH:'ChIJN1t_tDeuEmsRUsoyG83frY4',
    hint:'Find yours free at: developers.google.com/maps/documentation/javascript/examples/places-placeid-finder' },
  { id:'tripadvisor', icon:'🦉', color:'#00AF87', name:'TripAdvisor', badge:'Optional', required:false, comingSoon:false,
    desc:'Millions of travellers check TripAdvisor before booking a hotel.',
    fieldLabel:'TripAdvisor URL', fieldPH:'https://www.tripadvisor.com/Hotel_Review-...', hint:'Copy the full URL from your TripAdvisor property page' },
  { id:'booking', icon:'🏨', color:'#003580', name:'Booking.com', badge:'Optional', required:false, comingSoon:false,
    desc:'Guests trust Booking.com reviews heavily when deciding where to stay.',
    fieldLabel:'Booking.com URL', fieldPH:'https://www.booking.com/hotel/ch/...', hint:'Copy the full URL from your Booking.com property page' },
  { id:'instagram', icon:'📸', color:'#E1306C', name:'Instagram', badge:'Coming soon', required:false, comingSoon:true, desc:'Monitor comments and mentions on Instagram.', fieldLabel:'', fieldPH:'', hint:'' },
  { id:'facebook',  icon:'📘', color:'#1877F2', name:'Facebook',  badge:'Coming soon', required:false, comingSoon:true, desc:'Facebook reviews and page comments.', fieldLabel:'', fieldPH:'', hint:'' },
]

export default function Onboarding() {
  const { property, updatePropertyInState } = useApp()

  const [step,     setStep]    = useState(0)
  const [scanning, setScanning]= useState(false)
  const [saving,   setSaving]  = useState(false)
  const [aiProfile,setProfile] = useState(null)
  const [error,    setError]   = useState('')

  const [form, setForm] = useState({
    name:'', website_url:'', address:'', phone:'',
    owner_email: property?.owner_email || '',
    monthly_revenue:150000, target_rating:4.7, property_type:'hotel',
  })
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const [pInputs,  setPInputs]  = useState({})
  const [pLoading, setPLoading] = useState({})
  const [pDone,    setPDone]    = useState({})
  const [pMessages,setPMessages]= useState({})
  const pollRef     = useRef({})
  const savedPropId = useRef(null)

  useEffect(() => () => { Object.values(pollRef.current).forEach(clearInterval) }, [])

  // canProceed = import started OR import done OR other platform saved
  const importStarted = Object.values(pMessages).some(m => m && m.length > 0) ||
    Object.values(pLoading).some(v => v)
  const canProceed = Object.keys(pDone).length > 0 ||
    importStarted ||
    ['tripadvisor','booking'].some(id => pInputs[id]?.trim())

  // ── Step 0 → Step 1 ────────────────────────────────────────────────────────
  async function goToStep1() {
    setError('')
    if (!form.name.trim()) { setError('Please enter your property name'); return }
    if (form.website_url) {
      setScanning(true)
      const url = form.website_url.startsWith('http') ? form.website_url : `https://${form.website_url}`
      const data = await scanWebsite(url)
      if (!data.error && data.profile) setProfile(data.profile)
      setScanning(false)
    }
    setStep(1)
  }

  // ── Save property ─────────────────────────────────────────────────────────
  async function ensurePropertySaved() {
    if (savedPropId.current) return savedPropId.current

    // Returning user: property already exists with real data — don't overwrite with empty form
    if (property?.id && property?.name && property.name !== 'My Dental Clinic' && !form.name.trim()) {
      savedPropId.current = property.id
      return property.id
    }

    const url = form.website_url
      ? (form.website_url.startsWith('http') ? form.website_url : `https://${form.website_url}`)
      : ''
    const defaultProfile = {
      industry:form.property_type, responseLanguage:'de', brandTone:'luxury', country:'CH',
      responsePersonality:`Professional, warm and personally attentive ${form.property_type} that genuinely cares about every guest.`,
    }
    const { data, error:err } = await updateProperty({
      name:form.name, website_url:url, address:form.address, phone:form.phone,
      owner_email:form.owner_email, avg_revenue:form.monthly_revenue,
      target_rating:form.target_rating, ai_profile:aiProfile||defaultProfile,
    })
    if (err) { setError('Save failed: '+err.message); return null }
    if (data) {
      updatePropertyInState(data)
      savedPropId.current = data.id
      // NOTE: localStorage flag is ONLY set in goToDashboard()
      // Setting it here would trigger the routing guard prematurely
      return data.id
    }
    return null
  }

  // ── Start platform import ───────────────────────────────────────────────────
  async function startImport(platform) {
    const identifier = pInputs[platform.id]?.trim()
    if (!identifier) { setError(`Please enter your ${platform.fieldLabel}`); return }
    setError('')
    setPLoading(p=>({...p,[platform.id]:true}))
    setPMessages(p=>({...p,[platform.id]:'Starting import...'}))

    try {
      const propId = await ensurePropertySaved()
      if (!propId) { setPLoading(p=>({...p,[platform.id]:false})); return }

      const r = await fetch('/api/fetch-reviews', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ platform:platform.id, identifier, clinicId:propId }),
      })
      const data = await r.json()

      if (data.error) {
        setError(data.error)
        setPLoading(p=>({...p,[platform.id]:false}))
        setPMessages(p=>({...p,[platform.id]:''}))
        return
      }

      if (data.jobId) {
        // ── CRITICAL: Save to Supabase RIGHT NOW using authenticated client ──
        // Do NOT wait until goToDashboard — by then it might be too late
        const existingConns = property?.platform_connections || {}
        const { error: saveErr } = await supabase.from('clinics').update({
          pending_review_job: JSON.stringify({
            jobId:      data.jobId,
            platformId: platform.id,
            identifier,
            clinicId:   propId,
          }),
          platform_connections: {
            ...existingConns,
            [platform.id]: {
              ...(existingConns[platform.id] || {}),
              identifier,
              connectedAt: existingConns[platform.id]?.connectedAt || new Date().toISOString(),
              reviewCount: existingConns[platform.id]?.reviewCount || 0,
              importing:   true,
            }
          }
        }).eq('id', propId)

        if (saveErr) {
          console.error('[onboarding] Supabase save error:', saveErr.message)
        } else {
          console.log('[onboarding] Saved pending_review_job and platform_connections ✓')
        }

        setPMessages(p=>({...p,[platform.id]:`Fetching reviews from ${platform.name}...`}))
        pollImport(platform, data.jobId, propId, identifier)
      }
    } catch(e) {
      setError('Import failed: '+e.message)
      setPLoading(p=>({...p,[platform.id]:false}))
      setPMessages(p=>({...p,[platform.id]:''}))
    }
  }

  // ── Poll import status ──────────────────────────────────────────────────────
  function pollImport(platform, jobId, clinicId, identifier) {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const r = await fetch('/api/check-reviews-job', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ jobId, clinicId, platform:platform.id, identifier }),
        })
        const data = await r.json()

        if (data.status === 'done') {
          clearInterval(interval); delete pollRef.current[platform.id]
          setPLoading(p=>({...p,[platform.id]:false}))
          setPDone(p=>({...p,[platform.id]:{ count:data.count, jobId }}))
          setPMessages(p=>({...p,[platform.id]:''}))
          return
        }

        const elapsed = attempts * 5
        setPMessages(p=>({...p,[platform.id]:`Fetching reviews... ${elapsed}s elapsed`}))

        // After 60s stop polling here — dashboard will resume automatically
        if (attempts >= 12) {
          clearInterval(interval); delete pollRef.current[platform.id]
          setPLoading(p=>({...p,[platform.id]:false}))
          setPDone(p=>({...p,[platform.id]:{ count:0, jobId, delayed:true }}))
          setPMessages(p=>({...p,[platform.id]:''}))
        }
      } catch {}
    }, 5000)
    pollRef.current[platform.id] = interval
  }

  // ── Step 1 → Step 3 (You're all set!) ────────────────────────────────────
  async function goToStep3() {
    setSaving(true)
    setError('')

    // Ensure property saved
    const propId = savedPropId.current || property?.id
    if (!propId) {
      const id = await ensurePropertySaved()
      if (!id) { setSaving(false); return }
    }

    // Save any TripAdvisor/Booking URLs in background
    const finalId = savedPropId.current || property?.id
    const otherConns = {}
    ;['tripadvisor','booking'].forEach(id => {
      const url = pInputs[id]?.trim()
      if (url) otherConns[id] = { identifier:url, connectedAt:new Date().toISOString(), reviewCount:0 }
    })
    if (Object.keys(otherConns).length > 0) {
      const existing = property?.platform_connections || {}
      supabase.from('clinics').update({ platform_connections:{...existing,...otherConns} }).eq('id', finalId)
    }

    setSaving(false)
    setStep(2)
  }

  // ── Step 3 → Dashboard ────────────────────────────────────────────────────
  function goToDashboard() {
    // Set onboarding complete flag RIGHT before navigation
    const navId = savedPropId.current || property?.id
    if (navId) localStorage.setItem(`replyiq_onboarded_${navId}`, '1')
    window.location.replace('/')
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ position:'fixed', top:'5%', right:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(201,169,110,.05) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ width:'100%', maxWidth: step===1 ? 660 : 520 }}>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'2rem', marginBottom:4 }}>Reply<span style={{ color:'var(--gold)' }}>IQ</span></div>
          <div style={{ fontSize:'11px', color:'var(--text3)', letterSpacing:'2.5px', textTransform:'uppercase' }}>Setup your property</div>
        </div>

        {/* Steps */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
          {STEPS.map((s,i) => (
            <div key={s} style={{ display:'flex', alignItems:'center' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, background:i<=step?'var(--gold)':'var(--card)', color:i<=step?'var(--bg)':'var(--text3)', border:`2px solid ${i<=step?'var(--gold)':'var(--border)'}`, transition:'all .2s' }}>{i<step?'✓':i+1}</div>
                <div style={{ fontSize:'10px', color:i===step?'var(--gold)':'var(--text3)', fontWeight:i===step?600:400, whiteSpace:'nowrap' }}>{s}</div>
              </div>
              {i<STEPS.length-1 && <div style={{ width:50, height:2, background:i<step?'var(--gold)':'var(--border)', margin:'0 8px', marginBottom:20, transition:'background .3s' }} />}
            </div>
          ))}
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:step===1?'28px 28px':'28px 24px' }}>

          {/* ── Step 0 ── */}
          {step===0 && <>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', marginBottom:5 }}>Tell us about your property</div>
            <div style={{ fontSize:'13px', color:'var(--text3)', marginBottom:20, lineHeight:1.5 }}>Works for hotels, restaurants, resorts and bars across DACH.</div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', fontWeight:600, marginBottom:8 }}>Property Type</div>
              <div style={{ display:'flex', gap:8 }}>
                {[{id:'hotel',icon:'🏨',label:'Hotel'},{id:'restaurant',icon:'🍽️',label:'Restaurant'},{id:'bar',icon:'🍸',label:'Bar'},{id:'resort',icon:'🌴',label:'Resort'}].map(t=>(
                  <button key={t.id} onClick={()=>set('property_type',t.id)} style={{ flex:1, padding:'10px 6px', border:`1px solid ${form.property_type===t.id?'var(--gold)':'var(--border)'}`, borderRadius:'var(--r-md)', background:form.property_type===t.id?'rgba(201,169,110,.08)':'var(--surface)', color:form.property_type===t.id?'var(--gold)':'var(--text3)', cursor:'pointer', fontSize:'11px', textAlign:'center', transition:'var(--ease)' }}>
                    <div style={{ fontSize:'18px', marginBottom:4 }}>{t.icon}</div>{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Input label="Property Name *" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Hotel Baur au Lac" />
              <Input label="Website URL" value={form.website_url} onChange={e=>set('website_url',e.target.value)} placeholder="www.yourhotel.ch" hint="We'll scan this to build your AI brand voice automatically" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Input label="Address" value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Talstrasse 1, 8001 Zürich" />
                <Input label="Phone"   value={form.phone}   onChange={e=>set('phone',e.target.value)}   placeholder="+41 44 220 50 20" />
              </div>
              <Input label="Report Email" value={form.owner_email} onChange={e=>set('owner_email',e.target.value)} placeholder="gm@yourhotel.ch" type="email" hint="Weekly intelligence reports sent here" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Input label="Monthly Revenue (CHF)" value={form.monthly_revenue} onChange={e=>set('monthly_revenue',+e.target.value)} type="number" prefix="CHF" hint="For ROI calculations" />
                <Input label="Target Rating"         value={form.target_rating}   onChange={e=>set('target_rating',+e.target.value)}   type="number" step="0.1" min="4" max="5" suffix="★" hint="Your Google rating goal" />
              </div>
            </div>
          </>}

          {/* ── Step 1 ── */}
          {step===1 && <>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', marginBottom:5 }}>Connect your review platforms</div>
            <div style={{ fontSize:'13px', color:'var(--text3)', marginBottom:16, lineHeight:1.5 }}>Connect Google Business to import your reviews. Your dashboard populates automatically.</div>
            {aiProfile && (
              <div style={{ background:'rgba(74,124,111,.06)', border:'1px solid rgba(74,124,111,.2)', borderRadius:'var(--r-md)', padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ color:'#4A7C6F' }}>✓</span>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'#4A7C6F', marginBottom:1 }}>AI Profile created from your website</div>
                  <div style={{ fontSize:'11px', color:'var(--text3)' }}>{aiProfile.brandTone} · {aiProfile.responseLanguage?.toUpperCase()} · {aiProfile.industry}</div>
                </div>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {PLATFORMS.map((platform,idx) => {
                const isLoading = pLoading[platform.id]
                const isDone    = pDone[platform.id]
                const msg       = pMessages[platform.id]
                const inputVal  = pInputs[platform.id]||''
                const isFirst   = idx===0
                return (
                  <div key={platform.id} style={{ background:isFirst?'var(--card2)':'var(--surface)', border:`1px solid ${isDone?'rgba(74,124,111,.3)':isFirst?platform.color+'30':'var(--border)'}`, borderRadius:'var(--r-lg)', padding:'14px 16px', opacity:platform.comingSoon?0.5:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:platform.comingSoon?0:10 }}>
                      <div style={{ width:34, height:34, borderRadius:8, background:`${platform.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'17px', flexShrink:0 }}>{platform.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                          <span style={{ fontSize:'13px', fontWeight:700 }}>{platform.name}</span>
                          <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 6px', borderRadius:10, background:isDone?'rgba(74,124,111,.1)':`${platform.color}12`, color:isDone?'#4A7C6F':platform.color, border:`1px solid ${isDone?'rgba(74,124,111,.2)':platform.color+'30'}` }}>
                            {isDone ? '✓ Import started' : isLoading ? '⏳ Starting...' : platform.badge}
                          </span>
                        </div>
                        <div style={{ fontSize:'11px', color:'var(--text3)' }}>{platform.desc}</div>
                      </div>
                    </div>
                    {!platform.comingSoon && !isDone && !isLoading && (
                      <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <div style={{ flex:1 }}>
                          <input value={inputVal} onChange={e=>setPInputs(p=>({...p,[platform.id]:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&!isLoading&&inputVal&&startImport(platform)} placeholder={platform.fieldPH}
                            style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text1)', fontSize:'12px', outline:'none', boxSizing:'border-box' }}
                            onFocus={e=>e.target.style.borderColor=platform.color} onBlur={e=>e.target.style.borderColor='var(--border)'} />
                          {platform.hint && <div style={{ fontSize:'10px', color:'var(--text3)', marginTop:3, lineHeight:1.4 }}>{platform.hint}</div>}
                        </div>
                        <button onClick={()=>startImport(platform)} disabled={!inputVal.trim()}
                          style={{ padding:'9px 14px', background:platform.color, border:'none', borderRadius:8, color:'#fff', fontSize:'12px', fontWeight:600, cursor:!inputVal.trim()?'not-allowed':'pointer', flexShrink:0, opacity:!inputVal.trim()?0.5:1, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                          {platform.id==='google'?'Import Reviews':'Save'}
                        </button>
                      </div>
                    )}
                    {isLoading && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0' }}>
                        <Spinner /><span style={{ fontSize:'12px', color:platform.color }}>Saving to Supabase and starting import...</span>
                      </div>
                    )}
                    {msg && !isLoading && (
                      <div style={{ marginTop:8, padding:'8px 12px', background:`${platform.color}08`, border:`1px solid ${platform.color}20`, borderRadius:7, display:'flex', alignItems:'center', gap:8 }}>
                        <Spinner /><span style={{ fontSize:'12px', color:platform.color, lineHeight:1.4 }}>{msg}</span>
                      </div>
                    )}
                    {isDone && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(74,124,111,.06)', borderRadius:7, border:'1px solid rgba(74,124,111,.2)' }}>
                        <span style={{ color:'#4A7C6F' }}>✓</span>
                        <span style={{ fontSize:'12px', color:'#4A7C6F', fontWeight:500 }}>
                          {isDone.delayed
                            ? 'Import running. Your dashboard will show progress and update when ready.'
                            : `${(isDone.count||0).toLocaleString()} reviews imported successfully.`}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {!canProceed && (
              <div style={{ marginTop:14, padding:'10px 14px', background:'rgba(201,169,110,.06)', border:'1px solid rgba(201,169,110,.15)', borderRadius:8, fontSize:'12px', color:'var(--text2)', lineHeight:1.5 }}>
                ℹ Connect at least one platform above to proceed. Start with Google Business for maximum impact.
              </div>
            )}
          </>}

          {/* ── Step 2: You're all set ── */}
          {step===2 && (
            <div style={{ textAlign:'center', padding:'12px 0' }}>
              <div style={{ fontSize:'3.5rem', marginBottom:14 }}>🎉</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.5rem', marginBottom:8 }}>You're all set!</div>
              <div style={{ fontSize:'13px', color:'var(--text3)', lineHeight:1.8, marginBottom:20 }}>
                Your reviews are being imported in the background. Your dashboard will update automatically — no need to wait here.
              </div>

              {/* Import status */}
              {Object.keys(pDone).length > 0 && (
                <div style={{ marginBottom:20 }}>
                  {Object.entries(pDone).map(([pid, done]) => (
                    <div key={pid} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(74,124,111,.06)', border:'1px solid rgba(74,124,111,.2)', borderRadius:10, marginBottom:8 }}>
                      <span style={{ color:'#4A7C6F', fontSize:'16px' }}>✓</span>
                      <div style={{ textAlign:'left' }}>
                        <div style={{ fontSize:'13px', fontWeight:600, color:'#4A7C6F' }}>
                          {done.delayed ? 'Import running in background' : `${(done.count||0).toLocaleString()} reviews imported`}
                        </div>
                        <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:2 }}>
                          {done.delayed
                            ? 'Your dashboard will show a progress bar. Reviews appear when ready.'
                            : 'Reviews are ready in your dashboard.'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Features list */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:'13px', color:'var(--text2)', textAlign:'left', background:'var(--surface)', borderRadius:'var(--r-md)', padding:'14px 16px' }}>
                {[
                  ['✓','Reviews sync daily automatically'],
                  ['✓','Inbox shows all unanswered reviews'],
                  ['✓','AI responds in your brand voice'],
                  ['✓','Risk score tracks reputation health'],
                  ['✓','Competitor benchmarking within 3km'],
                  ['✓','Weekly intelligence reports by email'],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ color:'var(--gold)', flexShrink:0 }}>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(184,92,56,.08)', border:'1px solid rgba(184,92,56,.2)', borderRadius:8, fontSize:'13px', color:'#B85C38' }}>{error}</div>}

          <button
            onClick={step===0 ? goToStep1 : step===1 ? goToStep3 : goToDashboard}
            disabled={scanning || saving || (step===0 && !form.name.trim()) || (step===1 && !canProceed)}
            style={{ width:'100%', marginTop:22, padding:'14px', background:canProceed||step!==1?'linear-gradient(135deg,var(--gold),var(--amber))':'var(--surface)', border:'none', borderRadius:11, color:canProceed||step!==1?'var(--bg)':'var(--text3)', fontSize:'15px', fontWeight:700, cursor:(scanning||saving||(step===0&&!form.name.trim())||(step===1&&!canProceed))?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'var(--ease)', opacity:(step===1&&!canProceed)?0.5:1 }}>
            {scanning ? <><Spinner />Scanning your website...</> : saving ? <><Spinner />Saving...</> : step===0 ? 'Continue →' : step===1 ? 'Continue →' : 'Open Dashboard →'}
          </button>

          {step===1 && canProceed && !saving && (
            <div style={{ textAlign:'center', marginTop:10, fontSize:'12px', color:'var(--text3)' }}>
              Continue to see your setup summary before opening the dashboard.
            </div>
          )}
        </div>
        <div style={{ textAlign:'center', marginTop:14, fontSize:'12px', color:'var(--text3)' }}>All details can be updated in Settings at any time</div>
      </div>
    </div>
  )
}
