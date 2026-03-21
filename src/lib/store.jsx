import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, getClinic, getReviews, getCompetitors } from './supabase.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession]                 = useState(null)
  const [authLoading, setAuthLoading]         = useState(true)
  const [clinic, setClinic]                   = useState(null)
  const [reviews, setReviews]                 = useState([])
  const [competitors, setCompetitors]         = useState([])
  const [dataLoading, setDataLoading]         = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [toast, setToast]                     = useState(null)
  const loadedForUser                         = useRef(null)

  useEffect(() => {
    // Get session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setAuthLoading(false)
      if (s?.user?.id) triggerLoad(s.user.id)
    })

    // Only respond to SIGNED_IN and SIGNED_OUT — ignore everything else
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('[Auth]', event, s?.user?.email)
      if (event === 'SIGNED_IN' && s?.user?.id) {
        setSession(s)
        triggerLoad(s.user.id)
      }
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setClinic(null)
        setReviews([])
        setCompetitors([])
        setNeedsOnboarding(false)
        loadedForUser.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  function triggerLoad(userId) {
    if (loadedForUser.current === userId) return // already loaded for this user
    loadedForUser.current = userId
    loadData()
  }

  async function loadData() {
    setDataLoading(true)
    try {
      const { data: c } = await getClinic()
      if (c) {
        setClinic(c)
        // Check onboarding: show if name is still default AND never onboarded
        const key = `replyiq_onboarded_${c.id}`
        const done = localStorage.getItem(key)
        setNeedsOnboarding(!done && c.name === 'Zahnarztpraxis Zürich')

        const [{ data: r }, { data: comp }] = await Promise.all([
          getReviews(c.id),
          getCompetitors(c.id),
        ])
        if (r)    setReviews(r)
        if (comp) setCompetitors(comp)
      }
    } catch (e) {
      console.error('[loadData]', e)
    }
    setDataLoading(false)
  }

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const updateReviewInState = useCallback((u) => {
    setReviews(p => p.map(r => r.id === u.id ? u : r))
  }, [])

  const updateClinicInState = useCallback((u) => {
    setClinic(u)
    // Mark onboarding complete — navigate handles the redirect, no reload needed
    if (u?.id) localStorage.setItem(`replyiq_onboarded_${u.id}`, '1')
    setNeedsOnboarding(false)
  }, [])

  return (
    <AppContext.Provider value={{
      session, authLoading, clinic, reviews, competitors,
      dataLoading, loadAll: loadData, needsOnboarding,
      updateReviewInState, updateClinicInState,
      toast, showToast, setToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const c = useContext(AppContext)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}

export function useRiskScore(reviews) {
  if (!reviews?.length) return 68
  let s = 30
  s += Math.min(reviews.filter(r => r.rating <= 2).length * 6, 30)
  s += Math.min(reviews.filter(r => !r.responded && r.rating <= 2).length * 8, 24)
  if (reviews.some(r => r.ai_risk_flag)) s += 20
  return Math.min(s, 100)
}

export function useUnansweredCount(reviews) {
  return reviews?.filter(r => !r.responded && r.rating <= 2).length ?? 0
}
