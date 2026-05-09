import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './lib/store.jsx'
import { Toast } from './components/UI.jsx'
import Auth from './pages/Auth.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inbox from './pages/Inbox.jsx'
import Platforms from './pages/Platforms.jsx'
import Settings from './pages/Settings.jsx'
import { ReviewsPage, RiskPage, RevenuePage, CompetitorsPage, ReportPage } from './pages/Pages.jsx'

function AppRoutes() {
  const { user, property, loading, toast, setToast } = useApp()

  // Auth still loading
  if (user === undefined) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'2rem' }}>Reply<span style={{ color:'var(--gold)' }}>IQ</span></div>
        <div style={{ width:28, height:28, border:'2px solid rgba(245,200,66,.2)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <>
        <Routes><Route path="*" element={<Auth />} /></Routes>
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  // Logged in but property still loading
  if (loading && !property) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:'2rem' }}>Reply<span style={{ color:'var(--gold)' }}>IQ</span></div>
        <div style={{ width:28, height:28, border:'2px solid rgba(245,200,66,.2)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      </div>
    )
  }

  // Determine if onboarding is complete
  // Consider onboarded if: property has a real name OR localStorage flag is set
  const hasRealName      = property?.name && property.name.trim() !== '' && property.name !== 'My Dental Clinic'
  const hasOnboardingKey = property?.id && !!localStorage.getItem(`replyiq_onboarded_${property.id}`)
  const isOnboarded      = !!(property && (hasRealName || hasOnboardingKey))

  if (!isOnboarded) {
    return (
      <>
        <Onboarding />
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      </>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/inbox"       element={<Inbox />} />
        <Route path="/reviews"     element={<ReviewsPage />} />
        <Route path="/risk"        element={<RiskPage />} />
        <Route path="/revenue"     element={<RevenuePage />} />
        <Route path="/competitors" element={<CompetitorsPage />} />
        <Route path="/report"      element={<ReportPage />} />
        <Route path="/platforms"   element={<Platforms />} />
        <Route path="/settings"    element={<Settings />} />
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
