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

  const loadAll = useCallback(async () => {
    if (loadingRef.current) return
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

  // ── Trial helpers ──────────────────────────────────────────────────────────
  const trialStatus  = property?.subscription_status || 'trial'
  const trialActive  = trialStatus === 'active'
  const trialExpired = trialStatus === 'expired' ||
    (trialStatus === 'trial' && property?.trial_ends_at && new Date() > new Date(property.trial_ends_at))

  const aiUsed      = property?.ai_generations_used  || 0
  const aiLimit     = property?.ai_generations_limit || 10
  const aiRemaining = Math.max(0, aiLimit - aiUsed)
  const canUseAI    = trialActive || aiRemaining > 0

  const daysLeft = property?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(property.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : 14

  async function consumeAIGeneration() {
    if (!property?.id) return { allowed: false, reason: 'No property found' }
    if (trialActive) {
      const newUsed = aiUsed + 1
      await supabase.from('clinics').update({ ai_generations_used: newUsed }).eq('id', property.id)
      setProperty(p => ({ ...p, ai_generations_used: newUsed }))
      return { allowed: true }
    }
    if (trialExpired) return { allowed: false, reason: 'Your trial has ended. Upgrade to continue.' }
    if (aiRemaining <= 0) return { allowed: false, reason: `You have used all ${aiLimit} AI generations. Upgrade to continue.` }
    const newUsed = aiUsed + 1
    await supabase.from('clinics').update({ ai_generations_used: newUsed }).eq('id', property.id)
    setProperty(p => ({ ...p, ai_generations_used: newUsed }))
    return { allowed: true, remaining: aiRemaining - 1 }
  }

  return (
    <Ctx.Provider value={{
      user, property, reviews, competitors, loading,
      loadAll, showToast, updateReviewInState, updatePropertyInState,
      toast, setToast,
      trialStatus, trialActive, trialExpired, canUseAI,
      aiUsed, aiLimit, aiRemaining, daysLeft,
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
  let s = 20
  s += Math.min(reviews.filter(r => r.rating <= 2).length * 5, 30)
  s += Math.min(reviews.filter(r => !r.responded && r.rating <= 2).length * 7, 28)
  if (reviews.some(r => r.ai_risk_flag)) s += 20
  return Math.min(s, 100)
}

export function useUnanswered(reviews) {
  return reviews?.filter(r => !r.responded).length ?? 0
}
