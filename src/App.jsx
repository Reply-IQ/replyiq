import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './lib/store.jsx'
import { LangProvider } from './lib/lang.jsx'
import { Toast } from './components/UI.jsx'
import Auth from './pages/Auth.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Reviews from './pages/Reviews.jsx'
import { RiskPage, RevenuePage, Competitors, Respond, Report, Settings } from './pages/OtherPages.jsx'

function AppRoutes() {
  const { session, authLoading, needsOnboarding, toast, setToast, dataLoading } = useApp()

  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'1.8rem', color:'var(--mint)' }}>ReplyIQ</div>
        <div style={{ display:'inline-block', width:28, height:28, border:'3px solid rgba(2,195,154,0.2)', borderTopColor:'var(--mint)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
      </div>
    )
  }

  if (!session) {
    return (
      <>
        <Routes><Route path="*" element={<Auth />}/></Routes>
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)}/>}
      </>
    )
  }

  if (needsOnboarding) {
    return (
      <>
        <Onboarding/>
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)}/>}
      </>
    )
  }

  return (
    <>
      {dataLoading && (
        <div style={{ position:'fixed', top:0, left:0, right:0, height:3, background:'var(--navy)', zIndex:9998 }}>
          <div style={{ height:'100%', background:'var(--mint)', width:'60%', animation:'slideIn 1.5s ease' }}/>
        </div>
      )}
      <Routes>
        <Route path="/"            element={<Dashboard />}/>
        <Route path="/reviews"     element={<Reviews />}/>
        <Route path="/risk"        element={<RiskPage />}/>
        <Route path="/revenue"     element={<RevenuePage />}/>
        <Route path="/competitors" element={<Competitors />}/>
        <Route path="/respond"     element={<Respond />}/>
        <Route path="/report"      element={<Report />}/>
        <Route path="/settings"    element={<Settings />}/>
        <Route path="*"            element={<Navigate to="/" replace />}/>
      </Routes>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)}/>}
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </LangProvider>
  )
}
