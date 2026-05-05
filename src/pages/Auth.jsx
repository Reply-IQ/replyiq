import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Spinner } from '../components/UI.jsx'

const LOGOS = {
  Google: <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
  TripAdvisor: <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="6.5" cy="14.5" r="3.5" fill="#00AF87"/><circle cx="17.5" cy="14.5" r="3.5" fill="#00AF87"/><path fill="#00AF87" d="M12 3C7 3 3 6 2 9h2.5a4 4 0 0 1 7.5 0h0a4 4 0 0 1 7.5 0H22C21 6 17 3 12 3z"/><circle cx="6.5" cy="14.5" r="1.5" fill="white"/><circle cx="17.5" cy="14.5" r="1.5" fill="white"/></svg>,
  'Booking.com': <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#003580"/><text x="4" y="17" fontSize="11" fontWeight="900" fill="white" fontFamily="Arial">B.</text></svg>,
  Instagram: <svg width="18" height="18" viewBox="0 0 24 24"><defs><radialGradient id="ig" x1="30%" y1="107%" x2="0%" y2="96%"><stop offset="0%" stopColor="#ffd676"/><stop offset="25%" stopColor="#f46f30"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></radialGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>,
  Facebook: <svg width="18" height="18" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#1877F2"/><path fill="white" d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z"/></svg>,
}

export default function Auth() {
  const [mode, setMode]       = useState('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [info, setInfo]       = useState('')

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email || !password) { setError('Please enter your email and password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError('Incorrect email or password. Please try again.')
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      if (data?.session) { setLoading(false); return }
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) { setInfo('Account created! Check your email to confirm, then sign in.'); setMode('login') }
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#141920', fontFamily:'Inter,-apple-system,sans-serif', overflowX:'hidden', position:'relative' }}>
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'70vw', height:'70vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(201,169,110,0.07) 0%, transparent 60%)' }} />
        <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(74,124,111,0.04) 0%, transparent 60%)' }} />
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.007) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.007) 1px,transparent 1px)', backgroundSize:'80px 80px' }} />
      </div>

      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        {/* Nav */}
        <div style={{ padding:'28px 60px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:'1.6rem', fontWeight:700, letterSpacing:'-1px', color:'#fff', fontFamily:'Georgia,serif', lineHeight:1 }}>Reply<span style={{ color:'#C9A96E' }}>IQ</span></div>
            <div style={{ fontSize:'9px', letterSpacing:'3px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', marginTop:5 }}>Reputation Intelligence</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(201,169,110,0.07)', border:'1px solid rgba(201,169,110,0.15)', borderRadius:20, padding:'6px 14px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#C9A96E' }} />
            <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:600 }}>Early Access · CHF 199/mo · Limited spots</span>
          </div>
        </div>

        <div style={{ flex:1, display:'flex', gap:0 }}>
          {/* Left hero */}
          <div style={{ flex:1, padding:'20px 60px 60px', display:'flex', flexDirection:'column', justifyContent:'center', minWidth:0 }}>
            <div style={{ fontFamily:'Georgia,serif', lineHeight:1.05, letterSpacing:'-2px', marginBottom:24 }}>
              <div style={{ fontSize:'clamp(3rem,5vw,5.5rem)', fontWeight:700, color:'#fff' }}>More guests.</div>
              <div style={{ fontSize:'clamp(3rem,5vw,5.5rem)', fontWeight:700, color:'#fff' }}>Higher ratings.</div>
              <div style={{ fontSize:'clamp(3rem,5vw,5.5rem)', fontWeight:700, color:'#C9A96E' }}>Zero extra work.</div>
            </div>

            <div style={{ fontSize:'17px', color:'rgba(255,255,255,0.38)', lineHeight:1.8, maxWidth:480, marginBottom:44, fontWeight:300 }}>
              Improve your rating and respond to every guest automatically — across Google, TripAdvisor, Booking.com and more. Your AI team member, available 24/7.
            </div>

            <div style={{ display:'flex', gap:40, marginBottom:44 }}>
              {[['100%','response rate'],['0.3★','avg rating lift'],['CHF 199','per month to start']].map(([v,l],i,arr) => (
                <div key={l} style={{ paddingRight:i<arr.length-1?40:0, borderRight:i<arr.length-1?'1px solid rgba(255,255,255,0.07)':'none' }}>
                  <div style={{ fontSize:'2.6rem', fontWeight:700, color:'#C9A96E', letterSpacing:'-1.5px', lineHeight:1, fontFamily:'Georgia,serif' }}>{v}</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.25)', marginTop:6 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:44 }}>
              {[
                ['#34D399','Respond to every review → rank higher on Google and TripAdvisor'],
                ['#C9A96E','Professional responses → better average rating and more bookings'],
                ['#60A5FA','Guests who feel heard → 2× more likely to return and recommend you'],
                ['#A78BFA','One inbox for all platforms → your team saves hours every single week'],
              ].map(([dot,text]) => (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:dot, flexShrink:0 }} />
                  <span style={{ fontSize:'14px', color:'rgba(255,255,255,0.42)', lineHeight:1.5 }}>{text}</span>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)', textTransform:'uppercase', letterSpacing:'2px', marginBottom:14 }}>Works with</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {Object.entries(LOGOS).map(([name, logo]) => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', background:'rgba(240,237,232,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:30, transition:'all 0.15s', cursor:'default' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}>
                    {logo}
                    <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.55)', fontWeight:500 }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right form */}
          <div style={{ width:460, background:'#1C2430', borderLeft:'1px solid #243044', padding:'48px 48px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:'1.55rem', fontWeight:700, color:'#fff', letterSpacing:'-0.5px', marginBottom:7, fontFamily:'Georgia,serif' }}>
                {mode === 'login' ? 'Welcome back' : 'Start free today'}
              </div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.28)' }}>
                {mode === 'login' ? 'Sign in to your ReplyIQ account' : '14 days free · No credit card required'}
              </div>
            </div>

            <div style={{ display:'flex', background:'rgba(240,237,232,0.04)', borderRadius:11, padding:4, marginBottom:26, border:'1px solid #243044' }}>
              {[['login','Sign In'],['signup','Create Account']].map(([m,label]) => (
                <button key={m} onClick={()=>{setMode(m);setError('');setInfo('')}}
                  style={{ flex:1, padding:'10px', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'Inter,sans-serif', fontSize:'13px', fontWeight:mode===m?600:400, background:mode===m?'rgba(201,169,110,0.1)':'transparent', color:mode===m?'#C9A96E':'rgba(255,255,255,0.28)', transition:'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[
                {label:'Email address',type:'email',val:email,set:e=>setEmail(e.target.value),ph:'gm@yourhotel.ch'},
                {label:'Password',type:'password',val:password,set:e=>setPass(e.target.value),ph:mode==='signup'?'At least 6 characters':'••••••••'},
              ].map(f=>(
                <div key={f.label}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.28)', textTransform:'uppercase', letterSpacing:'1.5px', fontWeight:600, marginBottom:8 }}>{f.label}</div>
                  <input type={f.type} value={f.val} onChange={f.set} placeholder={f.ph}
                    style={{ width:'100%', background:'rgba(240,237,232,0.04)', border:'1px solid #243044', borderRadius:10, padding:'14px 16px', color:'#fff', fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif', transition:'border-color 0.18s', boxSizing:'border-box' }}
                    onFocus={e=>e.target.style.borderColor='rgba(201,169,110,0.5)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.09)'} />
                </div>
              ))}

              {error&&<div style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', borderRadius:9, padding:'11px 14px', fontSize:'13px', color:'#d4714f' }}>{error}</div>}
              {info &&<div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:9, padding:'11px 14px', fontSize:'13px', color:'#34D399' }}>{info}</div>}

              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'15px', background:'linear-gradient(135deg,#F5C842,#D4860E)', border:'none', borderRadius:11, color:'#141920', fontSize:'15px', fontWeight:700, cursor:loading?'not-allowed':'pointer', fontFamily:'Inter,sans-serif', marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 32px rgba(201,169,110,0.22)', opacity:loading?0.7:1 }}>
                {loading?<><Spinner size={14}/>{mode==='login'?'Signing in...':'Creating account...'}</>:mode==='login'?'Sign In →':'Start Free — 14 Days →'}
              </button>
            </form>

            <div style={{ display:'flex', gap:7, marginTop:18, flexWrap:'wrap' }}>
              {['GDPR Compliant','Swiss Data','Cancel anytime'].map(b=>(
                <div key={b} style={{ padding:'4px 11px', background:'rgba(255,255,255,0.03)', border:'1px solid #243044', borderRadius:20, fontSize:'10px', color:'rgba(255,255,255,0.2)' }}>{b}</div>
              ))}
            </div>

            <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'28px 0' }} />

            {/* Simple pricing */}
            <div style={{ padding:'16px 18px', background:'rgba(201,169,110,0.04)', border:'1px solid rgba(201,169,110,0.12)', borderRadius:14, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#C9A96E', letterSpacing:'1px' }}>EARLY ACCESS PRICING</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:3 }}>Limited spots · Lock in forever</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Georgia,serif', fontSize:'1.5rem', color:'#C9A96E', lineHeight:1 }}>CHF 199<span style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>/mo</span></div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:3 }}>or CHF 1,990/yr · 2 months free</div>
                </div>
              </div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.25)', paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)', textAlign:'center' }}>
                14-day free trial · 1 booking covers your monthly cost
              </div>
            </div>

            {/* Testimonial */}
            <div style={{ padding:'18px 20px', background:'rgba(201,169,110,0.03)', border:'1px solid rgba(201,169,110,0.09)', borderRadius:14 }}>
              <div style={{ display:'flex', gap:2, marginBottom:8 }}>{[1,2,3,4,5].map(i=><span key={i} style={{ color:'#C9A96E', fontSize:'13px' }}>★</span>)}</div>
              <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.42)', lineHeight:1.8, fontStyle:'italic', marginBottom:12 }}>
                "Went from 20% to 100% response rate — without hiring anyone. Google ranking improved and bookings went up within 6 weeks."
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#F5C842,#D4860E)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'#141920', flexShrink:0 }}>MK</div>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'rgba(255,255,255,0.5)' }}>Marcus K.</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.22)', marginTop:2 }}>General Manager · 4-star Hotel, Zürich</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign:'center', marginTop:20, fontSize:'10px', color:'rgba(255,255,255,0.13)' }}>replyiq.ch · Zürich, Switzerland</div>
          </div>
        </div>

        <div style={{ padding:'20px 60px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:6 }}>
            <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.15)' }}>Trusted in</span>
            {['Zürich','Geneva','Basel','Bern','Lausanne'].map(c=><span key={c} style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', marginLeft:12 }}>{c}</span>)}
          </div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.15)' }}>© 2026 ReplyIQ · replyiq.ch</div>
        </div>
      </div>
    </div>
  )
}
