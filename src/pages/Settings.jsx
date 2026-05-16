import { useState } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, Button, Input, Spinner, SectionHeader } from '../components/UI.jsx'
import { useApp, useIsMobile, useLang } from '../lib/store.jsx'
import { T, t } from '../lib/i18n.js'
import { updateProperty } from '../lib/supabase.js'
import { scanWebsite, draft5StarTemplate } from '../lib/api.js'

export default function Settings() {
  const { property, updatePropertyInState, showToast } = useApp()
  const { lang, setLang } = useLang()
  const isMobile = useIsMobile()
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
      <Grid cols={isMobile?1:2} gap={20} style={{ alignItems:'start' }}>

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
                    <div style={{ fontSize:'12px', color:'var(--text3)' }}>You keep CHF 149/mo forever · {Object.keys(property?.platform_connections||{}).length} platforms connected</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', color:'var(--gold)' }}>CHF 149<span style={{ fontSize:'11px', color:'var(--text3)' }}>/mo</span></div>
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
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.5rem', color:'var(--gold)', marginBottom:2 }}>CHF 149<span style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'inherit' }}>/mo</span></div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:10 }}>or CHF 1,490/yr · 2 months free</div>
                    <div style={{ fontSize:'11px', color:'var(--text2)', lineHeight:1.7 }}>
                      Lock in forever · 1 booking covers your cost
                    </div>
                  </div>
                  {/* Professional */}
                  <div style={{ padding:'16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', opacity:0.6 }}>
                    <div style={{ fontSize:'11px', color:'var(--text3)', fontWeight:700, letterSpacing:'1px', marginBottom:6 }}>PROFESSIONAL</div>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.5rem', color:'var(--text2)', marginBottom:2 }}>CHF 199<span style={{ fontSize:'11px', color:'var(--text3)', fontFamily:'inherit' }}>/mo</span></div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:10 }}>or CHF 1,990/yr</div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', lineHeight:1.7 }}>Future pricing · After early access closes</div>
                  </div>
                </div>

                {/* Features */}
                {[
                  'All review platforms',
                  'Unlimited AI responses — no per-reply fees, ever',
                  'Daily automatic sync',
                  'Competitor benchmarking',
                  'Revenue ROI model',
                  'Weekly email reports',
                  'Review widget for your website',
                  'Smart Snippets for personalised replies',
                ].map((f,i,arr) => (
                  <div key={f} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', fontSize:'13px' }}>
                    <span style={{ color:'var(--gold)' }}>✓</span><span style={{ color:'var(--text2)' }}>{f}</span>
                  </div>
                ))}

                {/* DACH Data Privacy Notice */}
                <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(201,169,110,.04)', border:'1px solid rgba(201,169,110,.15)', borderRadius:10, fontSize:'11px', color:'var(--text3)', lineHeight:1.7 }}>
                  🇨🇭 <strong style={{ color:'var(--gold)' }}>Swiss company.</strong> Your data is stored in Switzerland and governed by Swiss data protection law (DSG/nDSG). We never sell your data. No US cloud providers process your guest information.
                </div>

                {/* Upgrade buttons */}
                <div style={{ display:'flex', gap:8, marginTop:16 }}>
                  <Button variant="secondary" fullWidth disabled={!!upgrading} onClick={() => checkout('monthly')}>
                    {upgrading==='monthly' ? <><Spinner /> Loading...</> : 'Monthly — CHF 149'}
                  </Button>
                  <Button fullWidth disabled={!!upgrading} style={{ background:'linear-gradient(135deg,var(--gold),var(--amber))', color:'var(--bg)' }} onClick={() => checkout('annual')}>
                    {upgrading==='annual' ? <><Spinner /> Loading...</> : 'Yearly — CHF 1,490'}
                  </Button>
                </div>
                <div style={{ textAlign:'center', marginTop:10, fontSize:'11px', color:'var(--text3)' }}>
                  Cancel anytime · Early adopters keep CHF 149 forever
                </div>
              </>
            )}
          </Card>

          {/* SMART SNIPPETS */}
          <SnippetsCard property={property} updatePropertyInState={updatePropertyInState} showToast={showToast} />

          {/* AUTO-REPLY */}
          <AutoReplyCard property={property} updatePropertyInState={updatePropertyInState} showToast={showToast} />

        </div>
      </Grid>

      {/* Language selector — prominent card */}
      <div style={{ marginTop:16 }}>
        <Card>
          <SectionHeader title={t(T.settings.language, lang)} subtitle={t(T.settings.langDesc, lang)} />
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            {[
              { code:'en', label:'English', flag:'🇬🇧', native:'English' },
              { code:'de', label:'German',  flag:'🇩🇪', native:'Deutsch' },
              { code:'fr', label:'French',  flag:'🇫🇷', native:'Français' },
            ].map(({ code, label, native }) => {
              const active = lang === code
              return (
                <button key={code} onClick={() => setLang(code)} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'12px 18px',
                  background: active ? 'rgba(201,169,110,.08)' : 'var(--surface)',
                  border: active ? '1px solid rgba(201,169,110,.4)' : '1px solid var(--border)',
                  borderRadius:10, cursor:'pointer', transition:'var(--ease)',
                  fontFamily:'var(--font-sans)',
                }}>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:'13px', fontWeight:700, color:active?'var(--gold)':'var(--text1)' }}>{native}</div>
                    <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:2 }}>{label}</div>
                  </div>
                  {active && <span style={{ color:'var(--gold)', fontSize:'16px', marginLeft:'auto' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </Card>
      </div>
    </Layout>
  )
}

// ── Smart Snippets Card ───────────────────────────────────────────────────────
function SnippetsCard({ property, updatePropertyInState, showToast }) {
  const snippets = property?.ai_profile?.smartSnippets || []
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function addSnippet() {
    if (!text.trim()) return
    setSaving(true)
    const updated = [...snippets, text.trim()]
    const newProfile = { ...(property?.ai_profile || {}), smartSnippets: updated }
    const { data, error } = await updateProperty({ ai_profile: newProfile })
    if (error) showToast('Error saving snippet', 'error')
    else { updatePropertyInState(data); setText(''); showToast('Snippet added!', 'success') }
    setSaving(false)
  }

  async function removeSnippet(idx) {
    const updated = snippets.filter((_,i) => i !== idx)
    const newProfile = { ...(property?.ai_profile || {}), smartSnippets: updated }
    const { data, error } = await updateProperty({ ai_profile: newProfile })
    if (error) showToast('Error removing snippet', 'error')
    else { updatePropertyInState(data); showToast('Snippet removed', 'info') }
  }

  return (
    <Card>
      <SectionHeader title="✨ Smart Snippets" subtitle="Facts the AI weaves naturally into every response" />
      <div style={{ fontSize:'12px', color:'var(--text3)', marginBottom:14, lineHeight:1.6 }}>
        Add recurring facts about your property. The AI uses these to personalise every reply — parking info, breakfast hours, pet policy, contact details, anything that matters to guests.
      </div>
      {snippets.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
          {snippets.map((snip, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--surface)', borderRadius:8, border:'1px solid var(--border)' }}>
              <span style={{ flex:1, fontSize:'12px', color:'var(--text2)' }}>{snip}</span>
              <button onClick={() => removeSnippet(i)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'16px', lineHeight:1, padding:0 }}
                onMouseEnter={e => e.target.style.color='var(--red)'}
                onMouseLeave={e => e.target.style.color='var(--text3)'}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:'flex', gap:8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSnippet()}
          placeholder='e.g. "Free parking available on-site for all guests"'
          style={{ flex:1, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', color:'var(--text1)', fontSize:'13px', outline:'none' }}
          onFocus={e => e.target.style.borderColor='var(--gold)'}
          onBlur={e => e.target.style.borderColor='var(--border)'}
        />
        <Button onClick={addSnippet} disabled={!text.trim() || saving} variant="secondary">
          {saving ? <Spinner /> : '+ Add'}
        </Button>
      </div>
      {snippets.length === 0 && (
        <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:8, fontStyle:'italic' }}>
          Examples: breakfast hours, check-in time, parking, pet policy, spa booking email, best room views...
        </div>
      )}
    </Card>
  )
}

// ── Auto-Reply Card ───────────────────────────────────────────────────────────
function AutoReplyCard({ property, updatePropertyInState, showToast }) {
  const profile  = property?.ai_profile || {}
  const enabled  = profile.autoReply5Star || false
  const saved    = profile.autoReply5StarTemplate || ''
  const [tmpl,      setTmpl]      = useState(saved)
  const [saving,    setSaving]    = useState(false)
  const [drafting,  setDrafting]  = useState(false)
  const [aiError,   setAiError]   = useState(false)

  // Keep local state in sync when property reloads
  useState(() => { setTmpl(saved) }, [saved])

  async function toggle() {
    setSaving(true)
    const newProfile = { ...profile, autoReply5Star: !enabled }
    const { data, error } = await updateProperty({ ai_profile: newProfile })
    if (error) showToast('Error saving setting', 'error')
    else { updatePropertyInState(data); showToast(!enabled ? 'Auto-reply enabled' : 'Auto-reply disabled', 'success') }
    setSaving(false)
  }

  async function aiDraft() {
    setDrafting(true)
    setAiError(false)
    const result = await draft5StarTemplate(property)
    if (result?.response || result?.raw) {
      setTmpl(result.response || result.raw)
    } else {
      setAiError(true)
      showToast('AI draft failed — try again', 'error')
    }
    setDrafting(false)
  }

  async function saveTemplate() {
    if (!tmpl.trim()) { showToast('Template cannot be empty', 'error'); return }
    setSaving(true)
    const newProfile = { ...profile, autoReply5StarTemplate: tmpl }
    const { data, error } = await updateProperty({ ai_profile: newProfile })
    if (error) showToast('Error saving template', 'error')
    else { updatePropertyInState(data); showToast('Template saved!', 'success') }
    setSaving(false)
  }

  return (
    <Card>
      {/* Header + toggle */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:'14px', fontWeight:700, color:'var(--text1)', marginBottom:3 }}>⚡ Auto-Reply for 5-Star Reviews</div>
          <div style={{ fontSize:'12px', color:'var(--text3)', lineHeight:1.5 }}>
            Automatically posts a personalised thank-you to text-free 5-star reviews.<br/>
            Your AI brand voice, snippets and sign-off are all applied automatically.
          </div>
        </div>
        <button onClick={toggle} disabled={saving} style={{
          width:44, height:24, borderRadius:12, flexShrink:0, marginLeft:16,
          background: enabled ? 'var(--gold)' : 'var(--border)',
          border:'none', cursor:saving?'not-allowed':'pointer',
          position:'relative', transition:'background .2s',
        }}>
          <div style={{ position:'absolute', top:3, left:enabled?20:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left .2s' }} />
        </button>
      </div>

      {enabled && (
        <>
          {/* Context note */}
          <div style={{ padding:'10px 14px', background:'rgba(201,169,110,.04)', border:'1px solid rgba(201,169,110,.12)', borderRadius:8, fontSize:'12px', color:'var(--text3)', lineHeight:1.65, marginBottom:14 }}>
            <strong style={{ color:'var(--gold)' }}>What the AI knows about your property:</strong><br/>
            Brand voice: <em>{profile.responsePersonality?.slice(0,80) || profile.brandTone || 'Not set — scan your website in Settings'}</em>
            {profile.smartSnippets?.length > 0 && <><br/>Smart snippets active: {profile.smartSnippets.length} fact{profile.smartSnippets.length > 1 ? 's' : ''} available</>}
            {profile.keyStrengths?.length > 0 && <><br/>Key strengths: {profile.keyStrengths.slice(0,3).join(', ')}</>}
          </div>

          {/* Template editor */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ fontSize:'12px', color:'var(--text3)' }}>
              Template — use <code style={{ background:'var(--surface)', padding:'1px 5px', borderRadius:4, fontSize:'11px' }}>{'{name}'}</code> for the guest's name
            </div>
            {/* AI Draft button */}
            <button
              onClick={aiDraft}
              disabled={drafting || saving}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'rgba(201,169,110,.08)', border:'1px solid rgba(201,169,110,.25)', borderRadius:8, color:'var(--gold)', fontSize:'12px', fontWeight:600, cursor:drafting?'not-allowed':'pointer', fontFamily:'var(--font-sans)', transition:'var(--ease)' }}
              onMouseEnter={e => { if (!drafting) e.currentTarget.style.background='rgba(201,169,110,.14)' }}
              onMouseLeave={e => e.currentTarget.style.background='rgba(201,169,110,.08)'}
            >
              {drafting ? <><Spinner size={11}/>Drafting...</> : <>✨ AI Draft</>}
            </button>
          </div>

          {/* Error state */}
          {aiError && !drafting && (
            <div style={{ padding:'10px 12px', background:'rgba(184,92,56,.08)', border:'1px solid rgba(184,92,56,.2)', borderRadius:8, fontSize:'12px', color:'#B85C38', marginBottom:10 }}>
              AI draft failed. Check your internet connection and try again.
            </div>
          )}

          {/* Drafting animation */}
          {drafting && (
            <div style={{ padding:'16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, marginBottom:10, fontSize:'13px', color:'var(--gold)', textAlign:'center' }}>
              <Spinner size={16} /><span style={{ marginLeft:8 }}>Writing in your brand voice...</span>
            </div>
          )}

          {/* Textarea */}
          {!drafting && (
            <textarea
              value={tmpl}
              onChange={e => setTmpl(e.target.value)}
              placeholder={'Click "AI Draft" to generate a personalised template in your brand voice, then edit if needed.'}
              rows={5}
              style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px', color:'var(--text1)', fontSize:'13px', resize:'vertical', outline:'none', boxSizing:'border-box', lineHeight:1.7, marginBottom:12, fontFamily:'var(--font-sans)' }}
              onFocus={e => e.target.style.borderColor='var(--gold)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />
          )}

          <div style={{ display:'flex', gap:8 }}>
            <Button onClick={saveTemplate} disabled={saving || drafting || !tmpl.trim()}>
              {saving ? <><Spinner />Saving...</> : '✓ Save Template'}
            </Button>
            {tmpl && !saving && (
              <Button variant="ghost" onClick={() => setTmpl('')}>Clear</Button>
            )}
          </div>

          {saved && (
            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(74,124,111,.06)', border:'1px solid rgba(74,124,111,.15)', borderRadius:8, fontSize:'11px', color:'#4A7C6F' }}>
              ✓ Active template saved — auto-replies are live for text-free 5-star reviews
            </div>
          )}
        </>
      )}

      {!enabled && (
        <div style={{ fontSize:'11px', color:'var(--text3)', fontStyle:'italic', lineHeight:1.7 }}>
          When enabled, ReplyIQ automatically posts a thank-you to every 5-star review with no text.
          The AI uses your full brand voice, smart snippets and sign-off style — no approval needed.
        </div>
      )}
    </Card>
  )
}
