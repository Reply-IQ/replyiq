import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, getProperty, getReviews, getCompetitors } from './supabase.js'

const Ctx = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser]         = useState(undefined) // undefined = loading, null = not logged in
  const [property, setProperty] = useState(null)
  const [reviews, setReviews]   = useState([])
  const [competitors, setComp]  = useState([])
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState(null)
  const loadingRef              = useRef(false)

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Get current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProperty(null)
        setReviews([])
        setComp([])
        loadingRef.current = false
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load all data when user changes ───────────────────────────────────────
  useEffect(() => {
    if (user?.id) {
      loadAll()
    }
  }, [user?.id])

  const loadAll = useCallback(async (force = false) => {
    if (loadingRef.current && !force) return
    loadingRef.current = true
    setLoading(true)
    try {
      const { data: p, error } = await getProperty()
      if (error) {
        console.error('[loadAll] getProperty error:', error)
      }
      if (p) {
        setProperty(p)
        const [{ data: r }, { data: c }] = await Promise.all([
          getReviews(p.id),
          getCompetitors(p.id),
        ])
        if (r) setReviews(r)
        if (c) setComp(c)
      } else {
        // No property found for this user — clear everything
        setProperty(null)
        setReviews([])
        setComp([])
      }
    } catch (e) {
      console.error('[loadAll]', e)
    }
    setLoading(false)
    loadingRef.current = false
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const updateReviewInState   = useCallback((u) => setReviews(p => p.map(r => r.id === u.id ? u : r)), [])
  const updatePropertyInState = useCallback((u) => setProperty(u), [])

  // ── Invite-only model — no trial, all users get full access ───────────────
  const trialActive  = true
  const trialExpired = false
  const canUseAI     = true
  const aiUsed = 0, aiLimit = 999, aiRemaining = 999, daysLeft = 0

  async function consumeAIGeneration() {
    return { allowed: true }
  }

  return (
    <Ctx.Provider value={{
      user, property, reviews, competitors, loading,
      loadAll, showToast, updateReviewInState, updatePropertyInState,
      toast, setToast,
      consumeAIGeneration,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useApp = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}

export function useRiskScore(reviews) {
  if (!reviews?.length) return 0

  const total             = reviews.length
  const unanswered        = reviews.filter(r => !r.responded).length
  const negative          = reviews.filter(r => r.rating <= 2).length
  const unansweredNeg     = reviews.filter(r => !r.responded && r.rating <= 2).length

  // Response rate risk: 0-40 points (main driver)
  const responseRate = (total - unanswered) / total
  const responseRisk = Math.round((1 - responseRate) * 40)

  // Negative review ratio: 0-30 points
  const negativeRisk = Math.round(Math.min(negative / total, 1) * 30)

  // Unanswered critical reviews: 0-20 points (capped — a few unanswered negatives is bad, but not catastrophic)
  const criticalRisk = Math.min(unansweredNeg * 2, 20)

  // AI risk flags: 0-10 points
  const aiRisk = reviews.some(r => r.ai_risk_flag) ? 10 : 0

  return Math.min(responseRisk + negativeRisk + criticalRisk + aiRisk, 100)
}

export function useUnanswered(reviews) {
  return reviews?.filter(r => !r.responded).length ?? 0
}

// ── MOBILE DETECTION ──────────────────────────────────────────────────────────
export function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

// ── LANGUAGE CONTEXT ──────────────────────────────────────────────────────────
const SUPPORTED = ['en', 'de', 'fr']

export function useLang() {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem('replyiq_lang')
    return SUPPORTED.includes(stored) ? stored : 'en'
  })

  function setLang(l) {
    if (!SUPPORTED.includes(l)) return
    localStorage.setItem('replyiq_lang', l)
    setLangState(l)
  }

  return { lang, setLang }
}
