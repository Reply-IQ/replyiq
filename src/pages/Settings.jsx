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
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

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

  const aiProfile = property?.ai_profile || {}

  return (
    <Layout title={t(T.nav.settings, lang)} subtitle={t(T.settings.subtitle, lang)}>
      <Grid cols={isMobile?1:2} gap={20} style={{ alignItems:'start' }}>

        {/* LEFT */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Card>
            <SectionHeader title={t(T.settingsExtra.propertyProfile, lang)} />
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Input label={t(T.settingsExtra.propertyName, lang)}         value={form.name||''}           onChange={e=>set('name',e.target.value)} />
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
              <Input label={t(T.settingsExtra.websiteUrl, lang)}           value={form.website_url||''}    onChange={e=>set('website_url',e.target.value)} placeholder="www.yourhotel.ch" />
              <Input label='Address'               value={form.address||''}        onChange={e=>set('address',e.target.value)} />
              <Input label='Phone'                 value={form.phone||''}          onChange={e=>set('phone',e.target.value)} />
              <Input label={t(T.settingsExtra.reportEmail, lang)}          value={form.owner_email||''}    onChange={e=>set('owner_email',e.target.value)} type="email" />
              <Input label={t(T.settingsExtra.monthlyRev, lang)} value={form.avg_revenue||0}     onChange={e=>set('avg_revenue',+e.target.value)} type="number" prefix="CHF" />
              <Input label={t(T.settingsExtra.targetRating, lang)}         value={form.target_rating||4.7} onChange={e=>set('target_rating',+e.target.value)} type="number" step="0.1" min="4" max="5" suffix="★" />
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
            <SectionHeader title={"🤖 "+t(T.settingsExtra.aiDesc, lang)} subtitle="" />
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

          {/* Language */}
          <Card>
            <SectionHeader title={t(T.settings.language, lang)} subtitle={t(T.settings.langDesc, lang)} />
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              {[
                { code:'en', label:'English',  flag:'🇬🇧' },
                { code:'de', label:'Deutsch',  flag:'🇩🇪' },
                { code:'fr', label:'Français', flag:'🇫🇷' },
              ].map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{
                    flex:1, padding:'12px 8px', borderRadius:'var(--r-md)', cursor:'pointer',
                    fontFamily:'var(--font-sans)', fontSize:'13px', fontWeight:lang===l.code?700:400,
                    background:lang===l.code?'rgba(201,169,110,0.1)':'var(--surface)',
                    border:lang===l.code?'1.5px solid var(--gold)':'1px solid var(--border)',
                    color:lang===l.code?'var(--gold)':'var(--text2)',
                    transition:'var(--ease)',
                  }}>
                  <div style={{ fontSize:'20px', marginBottom:4 }}>{l.flag}</div>
                  {l.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop:10, fontSize:'11px', color:'var(--text3)', lineHeight:1.6 }}>
              {lang==='en' && 'Dashboard interface language. Reviews always stay in the language your guests wrote them.'}
              {lang==='de' && 'Sprache der Dashboard-Oberfläche. Bewertungen bleiben immer in der Originalsprache Ihrer Gäste.'}
              {lang==='fr' && "Langue de l'interface du tableau de bord. Les avis restent toujours dans la langue de vos clients."}
            </div>
          </Card>

          {/* Subscription */}
          <Card>
            <SectionHeader title={t(T.settingsExtra.subscription, lang)} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', background:'rgba(74,124,111,.05)', border:'1px solid rgba(74,124,111,.2)', borderRadius:'var(--r-md)', marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.1rem', marginBottom:3 }}>Early Access</div>
                <div style={{ fontSize:'12px', color:'var(--text3)' }}>{Object.keys(property?.platform_connections||{}).length} platforms connected</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.3rem', color:'var(--gold)' }}>CHF 149<span style={{ fontSize:'11px', color:'var(--text3)' }}>/mo</span></div>
                <span style={{ color:'#4A7C6F', fontWeight:700, fontSize:'12px' }}>✓ Active</span>
              </div>
            </div>
            {[
              'Unlimited AI responses. No per-reply fees, ever.',
              'All review platforms',
              'Daily automatic sync',
              'Competitor benchmarking',
              'Weekly email reports',
              'Review widget for your website',
              'Smart Snippets for personalised replies',
            ].map((f,i,arr) => (
              <div key={f} style={{ display:'flex', gap:10, padding:'7px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none', fontSize:'13px' }}>
                <span style={{ color:'var(--gold)' }}>✓</span><span style={{ color:'var(--text2)' }}>{f}</span>
              </div>
            ))}
            <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(201,169,110,.04)', border:'1px solid rgba(201,169,110,.15)', borderRadius:10, fontSize:'11px', color:'var(--text3)', lineHeight:1.7 }}>
              <svg width="11" height="11" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius:2, display:'inline-block', verticalAlign:'middle', marginRight:5 }}><rect width="20" height="20" fill="#FF0000"/><rect x="3" y="7" width="14" height="6" fill="white"/><rect x="7" y="3" width="6" height="14" fill="white"/></svg>
              <strong style={{ color:'var(--gold)' }}>Swiss company.</strong> Your data is stored in Switzerland and governed by Swiss data protection law (DSG/nDSG). We never sell your data.
            </div>
            <div style={{ marginTop:10, fontSize:'11px', color:'var(--text3)', textAlign:'center' }}>
              Questions about your subscription? Contact <a href="mailto:info@replyiq.ch" style={{ color:'var(--gold)', textDecoration:'none' }}>info@replyiq.ch</a>
            </div>
          </Card>

          {/* SMART SNIPPETS */}
          <SnippetsCard property={property} updatePropertyInState={updatePropertyInState} showToast={showToast} lang={lang} />

          {/* AUTO-REPLY */}
          <AutoReplyCard property={property} updatePropertyInState={updatePropertyInState} showToast={showToast} lang={lang} />

        </div>
      </Grid>

    </Layout>
  )
}

// ── Smart Snippets Card ───────────────────────────────────────────────────────
function SnippetsCard({ property, updatePropertyInState, showToast, lang }) {
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
      <SectionHeader title={"✨ Smart Snippets"} subtitle={t(T.settingsExtra.snippetDesc, lang)} />
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
function AutoReplyCard({ property, updatePropertyInState, showToast, lang }) {
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
    else { updatePropertyInState(data); showToast(!enabled ? '5-star template enabled' : '5-star template disabled', 'success') }
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
      showToast('AI draft failed. Please try again.', 'error')
    }
    setDrafting(false)
  }

  async function saveTemplate() {
    if (!tmpl.trim()) { showToast('Template cannot be empty', 'error'); return }
    setSaving(true)
    const newProfile = { ...profile, autoReply5StarTemplate: tmpl }
    const { data, error } = await updateProperty({ ai_profile: newProfile })
    if (error) showToast('Error saving template', 'error')
    else { updatePropertyInState(data); showToast('5-star template saved', 'success') }
    setSaving(false)
  }

  return (
    <Card>
      {/* Header + toggle */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:'14px', fontWeight:700, color:'var(--text1)', marginBottom:3 }}>⚡ 5-Star Response Template</div>
          <div style={{ fontSize:'12px', color:'var(--text3)', lineHeight:1.5 }}>
            Save a pre-written reply for text-free 5-star reviews. When a guest leaves 5 stars with no text, the Inbox pre-fills this template — you review it and post in one click.
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
              ✓ Template saved — pre-fills automatically in Inbox for text-free 5-star reviews
            </div>
          )}
        </>
      )}

      {!enabled && (
        <div style={{ fontSize:'11px', color:'var(--text3)', fontStyle:'italic', lineHeight:1.7 }}>
          Save a template that pre-fills in the Inbox whenever a guest leaves 5 stars with no review text. You still approve before posting — but the hard work is already done.
        </div>
      )}
    </Card>
  )
}
