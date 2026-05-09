import { useState } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, Button, Input, Spinner, SectionHeader } from '../components/UI.jsx'
import { useApp } from '../lib/store.jsx'
import { updateProperty } from '../lib/supabase.js'
import { scanWebsite } from '../lib/api.js'

export default function Settings() {
  const { property, updatePropertyInState, showToast } = useApp()
  const [form,     setForm]     = useState(property || {})
  const [saving,   setSaving]   = useState(false)
  const [scanning, setScanning] = useState(false)
  const [upgrading, setUpgrading] = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const isSubscribed  = property?.subscription_status === 'active'
  const isEarlyAccess = property?.plan === 'early_access' || isSubscribed

  async function save() {
    setSaving(true)
    const { data, error } = await updateProperty({ name:form.name, address:form.address, phone:form.phone, owner_email:form.owner_email, website_url:form.website_url, avg_revenue:form.avg_revenue, target_rating:form.target_rating })
    if (error) showToast('Error: '+error.message, 'error')
    else { updatePropertyInState(data); showToast('Settings saved!', 'success') }
    setSaving(false)
  }

  async function rescan() {
    if (!form.website_url) { showToast('Enter your website URL first', 'error'); return }
    setScanning(true)
    const url = form.website_url.startsWith('http') ? form.website_url : `https://${form.website_url}`
    const data = await scanWebsite(url)
    if (data.error) { showToast('Scan failed: '+data.error, 'error'); setScanning(false); return }
    await updateProperty({ ai_profile: data.profile })
    updatePropertyInState({ ...property, ai_profile: data.profile })
    showToast('AI profile updated!', 'success')
    setScanning(false)
  }

  async function checkout(plan) {
    setUpgrading(plan)
    const r = await fetch('/api/create-checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ plan, clinicId:property?.id, email:property?.owner_email }) })
    const d = await r.json()
    if (d.url) window.location.href = d.url
    else { showToast('Checkout error — try again', 'error'); setUpgrading(null) }
  }

  const aiProfile = property?.ai_profile || {}

  return (
    <Layout title="Settings" subtitle="Property profile and configuration">
      <Grid cols={2} gap={20} style={{ alignItems:'start' }}>

        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card>
            <SectionHeader title="Property Profile" />
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Input label="Property Name"         value={form.name||''}           onChange={e=>set('name',e.target.value)} />
              {property?.platform_connections?.google?.identifier && (
                <div>
                  <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'1.5px', color:'var(--text3)', fontWeight:600, marginBottom:7 }}>Google Place ID</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)' }}>
                    <span style={{ fontSize:'13px', color:'var(--text2)', fontFamily:'var(--font-mono)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{property.platform_connections.google.identifier}</span>
                    <span style={{ fontSize:'11px', color:'var(--text3)', flexShrink:0 }}>🔒 Locked</span>
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:4 }}>Contact support to change your Google property</div>
                </div>
              )}
              <Input label="Website URL"           value={form.website_url||''}    onChange={e=>set('website_url',e.target.value)} placeholder="www.yourhotel.ch" />
              <Input label="Address"               value={form.address||''}        onChange={e=>set('address',e.target.value)} />
              <Input label="Phone"                 value={form.phone||''}          onChange={e=>set('phone',e.target.value)} />
              <Input label="Report Email"          value={form.owner_email||''}    onChange={e=>set('owner_email',e.target.value)} type="email" />
              <Input label="Monthly Revenue (CHF)" value={form.avg_revenue||0}     onChange={e=>set('avg_revenue',+e.target.value)} type="number" prefix="CHF" />
              <Input label="Target Rating"         value={form.target_rating||4.7} onChange={e=>set('target_rating',+e.target.value)} type="number" step="0.1" min="4" max="5" suffix="★" />
            </div>
            <Button fullWidth onClick={save} disabled={saving} style={{ marginTop:18 }}>
              {saving ? <><Spinner /> Saving...</> : 'Save Changes'}
            </Button>
          </Card>
        </div>

        {/* RIGHT */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* AI Brand Profile */}
          <Card>
            <SectionHeader title="🤖 AI Brand Profile" subtitle="How AI responds on your behalf" />
            {aiProfile.responsePersonality ? (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14, fontSize:'12px' }}>
                  {[['Industry',aiProfile.industry],['Language',aiProfile.responseLanguage],['Tone',aiProfile.brandTone],['Country',aiProfile.country]].map(([k,v]) => (
                    <div key={k} style={{ background:'var(--surface)', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ color:'var(--text3)', marginBottom:3, fontSize:'11px' }}>{k}</div>
                      <div style={{ fontWeight:600, color:'var(--text1)', textTransform:'capitalize' }}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:'var(--surface)', borderRadius:8, padding:'10px 14px', fontSize:'13px', color:'var(--text2)', lineHeight:1.6, borderLeft:'3px solid var(--gold)', marginBottom:14 }}>
                  "{aiProfile.responsePersonality}"
                </div>
              </>
            ) : (
              <div style={{ fontSize:'13px', color:'var(--text3)', marginBottom:14, padding:'12px 14px', background:'var(--surface)', borderRadius:8, lineHeight:1.5 }}>
                No AI profile yet. Add your website URL above and click Rebuild.
              </div>
            )}
            <Button fullWidth variant="secondary" onClick={rescan} disabled={scanning}>
              {scanning ? <><Spinner /> Scanning website...</> : '🔍 Rebuild AI Profile from Website'}
            </Button>
          </Card>

          {/* Subscription */}
          <Card>
            <SectionHeader title="Subscription" />

            {isSubscribed ? (
              <div style={{ background:'rgba(74,124,111,.06)', border:'1px solid rgba(74,124,111,.2)', borderRadius:'var(--r-md)', padding:16, marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.1rem', marginBottom:3 }}>Early Access</div>
                    <div style={{ fontSize:'12px', color:'var(--text3)' }}>You keep CHF 199/mo forever · {Object.keys(property?.platform_connections||{}).length} platforms connected</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', color:'var(--gold)' }}>CHF 199<span style={{ fontSize:'11px', color:'var(--text3)' }}>/mo</span></div>
                    <span style={{ color:'#4A7C6F', fontWeight:700, fontSize:'12px' }}>✓ Active</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Plan comparison */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                  {/* Early Access */}
                  <div style={{ padding:'16px', background:'rgba(201,169,110,.06)', border:'2px solid rgba(201,169,110,.3)', borderRadius:'var(--r-md)', position:'relative' }}>
                    <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'var(--gold)', color:'var(--bg)', fontSize:'10px', fontWeight:700, padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap' }}>LIMITED SPOTS</div>
                    <div style={{ fontSize:'11px', color:'var(--gold)', fontWeight:700, letterSpacing:'1px', marginBottom:6 }}>EARLY ACCESS</div>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.5rem', color:'var(--gold)', marginBottom:2 }}>CHF 199<span style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'inherit' }}>/mo</span></div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:10 }}>or CHF 1,990/yr · 2 months free</div>
                    <div style={{ fontSize:'11px', color:'var(--text2)', lineHeight:1.7 }}>
                      Lock in forever · 1 booking covers your cost
                    </div>
                  </div>
                  {/* Professional */}
                  <div style={{ padding:'16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', opacity:0.6 }}>
                    <div style={{ fontSize:'11px', color:'var(--text3)', fontWeight:700, letterSpacing:'1px', marginBottom:6 }}>PROFESSIONAL</div>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.5rem', color:'var(--text2)', marginBottom:2 }}>CHF 249<span style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'inherit' }}>/mo</span></div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:10 }}>or CHF 2,490/yr</div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', lineHeight:1.7 }}>Future pricing · After early access closes</div>
                  </div>
                </div>

                {/* Features */}
                {['All review platforms','Unlimited AI responses','Daily automatic sync','Competitor benchmarking','Revenue ROI model','Weekly reports'].map((f,i,arr) => (
                  <div key={f} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', fontSize:'13px' }}>
                    <span style={{ color:'var(--gold)' }}>✓</span><span style={{ color:'var(--text2)' }}>{f}</span>
                  </div>
                ))}

                {/* Upgrade buttons */}
                <div style={{ display:'flex', gap:8, marginTop:16 }}>
                  <Button variant="secondary" fullWidth disabled={!!upgrading} onClick={() => checkout('monthly')}>
                    {upgrading==='monthly' ? <><Spinner /> Loading...</> : 'Monthly — CHF 199'}
                  </Button>
                  <Button fullWidth disabled={!!upgrading} style={{ background:'linear-gradient(135deg,var(--gold),var(--amber))', color:'var(--bg)' }} onClick={() => checkout('annual')}>
                    {upgrading==='annual' ? <><Spinner /> Loading...</> : 'Yearly — CHF 1,990'}
                  </Button>
                </div>
                <div style={{ textAlign:'center', marginTop:10, fontSize:'11px', color:'var(--text3)' }}>
                  Cancel anytime · Early adopters keep CHF 199 forever
                </div>
              </>
            )}
          </Card>
        </div>
      </Grid>
    </Layout>
  )
}
