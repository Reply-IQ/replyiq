import { useState } from 'react'
import { Layout } from '../components/Layout.jsx'
import { Card, Grid, Button, Input, Spinner, SectionHeader, Divider } from '../components/UI.jsx'
import { useApp } from '../lib/store.jsx'
import { updateProperty } from '../lib/supabase.js'
import { scanWebsite } from '../lib/api.js'

export default function Settings() {
  const { property, updatePropertyInState, showToast } = useApp()
  const [form, setForm]         = useState(property || {})
  const [saving, setSaving]     = useState(false)
  const [scanning, setScanning] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    setSaving(true)
    const { data, error } = await updateProperty({ name: form.name, address: form.address, phone: form.phone, email: form.email, owner_email: form.owner_email, website_url: form.website_url, avg_revenue: form.avg_revenue, target_rating: form.target_rating })
    if (error) showToast('Error: ' + error.message, 'error')
    else { updatePropertyInState(data); showToast('Settings saved!', 'success') }
    setSaving(false)
  }

  async function rescan() {
    if (!form.website_url) { showToast('Enter your website URL first', 'error'); return }
    setScanning(true)
    const url = form.website_url.startsWith('http') ? form.website_url : `https://${form.website_url}`
    const data = await scanWebsite(url)
    if (data.error) { showToast('Scan failed: ' + data.error, 'error'); setScanning(false); return }
    // Update ai_profile in DB
    await updateProperty({ ai_profile: data.profile })
    updatePropertyInState({ ...property, ai_profile: data.profile })
    showToast('AI profile updated from website!', 'success')
    setScanning(false)
  }

  const aiProfile = property?.ai_profile || {}

  return (
    <Layout title="Settings" subtitle="Property profile and configuration">
      <Grid cols={2} gap={20} style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Property Profile */}
          <Card>
            <SectionHeader title="Property Profile" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Property Name"          value={form.name || ''}          onChange={e => set('name', e.target.value)} />
              <Input label="Website URL"            value={form.website_url || ''}   onChange={e => set('website_url', e.target.value)} placeholder="www.yourhotel.ch" />
              <Input label="Address"                value={form.address || ''}       onChange={e => set('address', e.target.value)} />
              <Input label="Phone"                  value={form.phone || ''}         onChange={e => set('phone', e.target.value)} />
              <Input label="Report Email"           value={form.owner_email || ''}   onChange={e => set('owner_email', e.target.value)} type="email" />
              <Input label="Monthly Revenue (CHF)"  value={form.avg_revenue || 0}    onChange={e => set('avg_revenue', +e.target.value)} type="number" prefix="CHF" />
              <Input label="Target Rating"          value={form.target_rating || 4.7} onChange={e => set('target_rating', +e.target.value)} type="number" step="0.1" min="4" max="5" suffix="★" />
            </div>
            <div style={{ marginTop: 18 }}>
              <Button fullWidth onClick={save} disabled={saving}>
                {saving ? <><Spinner /> Saving...</> : 'Save Changes'}
              </Button>
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* AI Profile */}
          <Card>
            <SectionHeader title="🤖 AI Brand Profile" subtitle="How AI responds on your behalf" />
            {aiProfile.responsePersonality ? (
              <>
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6, borderLeft: '3px solid var(--gold)', marginBottom: 14 }}>
                  "{aiProfile.responsePersonality}"
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, fontSize: '12px' }}>
                  {[['Industry', aiProfile.industry], ['Language', aiProfile.responseLanguage], ['Tone', aiProfile.brandTone], ['Country', aiProfile.country]].map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ color: 'var(--text3)', marginBottom: 3 }}>{k}</div>
                      <div style={{ fontWeight: 600, color: 'var(--text1)', textTransform: 'capitalize' }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>
                {aiProfile.complianceRules && (
                  <div style={{ background: 'rgba(201,169,110,.04)', border: '1px solid rgba(201,169,110,.15)', borderRadius: 8, padding: '10px 12px', fontSize: '12px', color: 'var(--text3)', marginBottom: 14 }}>
                    <strong style={{ color: 'var(--gold)' }}>Compliance: </strong>{aiProfile.complianceRules}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: 14, padding: '12px', background: 'var(--surface)', borderRadius: 8 }}>
                No AI profile yet. Enter your website URL and click "Rebuild AI Profile" to let AI learn your brand voice.
              </div>
            )}
            <Button fullWidth variant="secondary" onClick={rescan} disabled={scanning}>
              {scanning ? <><Spinner /> Scanning website...</> : '🔍 Rebuild AI Profile from Website'}
            </Button>
          </Card>

          {/* Subscription */}
          <Card>
            <SectionHeader title="Subscription" />
            <div style={{ background: 'rgba(201,169,110,.06)', border: '1px solid rgba(201,169,110,.2)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem' }}>Starter Plan</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)' }}>CHF 249<span style={{ fontSize: '12px', color: 'var(--text3)' }}>/mo</span></div>
                  <div style={{ fontSize: '11px', color: 'var(--gold)', opacity: .7 }}>or CHF 2,490/yr <span style={{ background: 'rgba(201,169,110,.15)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>2 months free</span></div>
                </div>
              </div>
              {property?.created_at && <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Active since {new Date(property.created_at).toLocaleDateString()}</div>}
            </div>
            {['All review platforms','AI response drafting','Google auto-import','Competitor tracking','Revenue ROI model','Weekly reports'].map((f, i, arr) => (
              <div key={f} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                <span style={{ color: 'var(--gold)' }}>✓</span><span style={{ color: 'var(--text2)' }}>{f}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button variant="secondary" fullWidth>Monthly — CHF 249</Button>
              <Button fullWidth style={{ background: 'linear-gradient(135deg,var(--gold),var(--amber))', color: 'var(--bg)' }}>Yearly — CHF 2,490</Button>
            </div>
          </Card>
        </div>
      </Grid>
    </Layout>
  )
}
