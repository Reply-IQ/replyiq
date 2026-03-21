import { useState } from 'react'
import { Button, Input, Spinner } from '../components/UI.jsx'
import { supabase } from '../lib/supabase.js'
import { useLang } from '../lib/lang.jsx'
import { LANGUAGES } from '../lib/translations.js'

export default function Auth() {
  const { t, lang, switchLang } = useLang()
  const ta = t.auth
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!email || !password) { setError(ta.noEmail); return }
    if (password.length < 6)  { setError(ta.shortPw); return }
    setLoading(true)

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message === 'Invalid login credentials' ? ta.wrongCreds : err.message)
    } else {
      // Sign up with emailRedirectTo pointing to localhost
      // so Supabase confirmation email (if sent) comes back to our local app
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      // If session exists immediately — user is signed in (email confirm OFF)
      if (data?.session) {
        // Store.jsx auth listener will pick this up automatically
        setLoading(false)
        return
      }

      // If no session — email confirmation is required
      // Try signing in anyway (works if email confirm is off but signUp didn't return session)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInData?.session) {
        // Signed in — store.jsx will handle redirect
        setLoading(false)
        return
      }

      // If still no session, email confirmation is genuinely required
      setSuccess('Account created! Check your email inbox for a confirmation link, then come back and sign in.')
      setMode('login')
    }

    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ position:'fixed', top:'-10%', right:'-5%', width:500, height:500, borderRadius:'50%', background:'var(--teal)', opacity:0.04, pointerEvents:'none' }}/>
      <div style={{ position:'fixed', bottom:'-10%', left:'-5%', width:400, height:400, borderRadius:'50%', background:'var(--sea)', opacity:0.04, pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:'2.4rem', marginBottom:4, letterSpacing:'-1px' }}>ReplyIQ</div>
          <div style={{ fontSize:'0.65rem', color:'var(--mint)', letterSpacing:'3px', textTransform:'uppercase', fontWeight:600 }}>{ta.subtitle}</div>
          <div style={{ marginTop:12, fontSize:'0.9rem', color:'var(--silver)' }}>{ta.tagline}</div>
          <div style={{ marginTop:14, display:'flex', gap:8, justifyContent:'center' }}>
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => switchLang(l.code)}
                style={{ background: lang===l.code ? 'var(--teal)' : 'var(--navy)', border:`1px solid ${lang===l.code?'var(--teal)':'var(--border)'}`, borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:'0.95rem', color: lang===l.code ? '#fff' : 'var(--silver)', transition:'all .15s' }}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'32px 28px' }}>
          <div style={{ display:'flex', gap:3, background:'var(--navy)', borderRadius:9, padding:4, marginBottom:26 }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{ flex:1, padding:'8px', border:'none', borderRadius:7, cursor:'pointer', fontFamily:'var(--font-sans)', fontSize:'0.85rem', background: mode===m ? 'var(--teal)' : 'transparent', color: mode===m ? '#fff' : 'var(--silver)', fontWeight: mode===m ? 500 : 400, transition:'var(--ease)' }}>
                {m==='login' ? ta.signIn : ta.createAccount}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label={ta.email}    type="email"    value={email}    onChange={e => setEmail(e.target.value)}    placeholder="your@email.com" />
            <Input label={ta.password} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode==='signup' ? ta.passwordHint : ta.passwordPH} />

            {error   && <div style={{ background:'rgba(232,72,85,.1)',  border:'1px solid rgba(232,72,85,.25)',  borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:'0.83rem', color:'var(--rose)' }}>{error}</div>}
            {success && <div style={{ background:'rgba(2,195,154,.1)',  border:'1px solid rgba(2,195,154,.25)', borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:'0.83rem', color:'var(--mint)' }}>{success}</div>}

            <Button type="submit" fullWidth size="lg" disabled={loading} style={{ marginTop:4 }}>
              {loading
                ? <><Spinner /> {mode==='login' ? ta.signingIn : ta.creating}</>
                : mode==='login' ? ta.signIn : ta.createAccount}
            </Button>
          </form>

          {mode==='signup' && (
            <div style={{ marginTop:20, padding:'14px', background:'rgba(2,131,144,.08)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', fontSize:'0.8rem', color:'var(--silver)', lineHeight:1.6 }}>
              {ta.trialLine1}<br/>{ta.trialLine2}<br/>{ta.trialLine3}
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:'0.75rem', color:'var(--mid)' }}>{ta.footer}</div>
      </div>
    </div>
  )
}
