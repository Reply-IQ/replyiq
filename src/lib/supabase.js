import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || ''
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(URL, KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
})

// ── AUTH ──────────────────────────────────────────────────────────────────────
export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password })
}
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}
export async function signOut() {
  return supabase.auth.signOut()
}

// ── PROPERTY (replaces "clinic") ──────────────────────────────────────────────
export async function getProperty() {
  return supabase.from('clinics').select('*').maybeSingle()
}

export async function updateProperty(updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not logged in' } }
  return supabase.from('clinics').update(updates).eq('user_id', user.id).select().single()
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
export async function getReviews(propertyId) {
  return supabase.from('reviews').select('*').eq('clinic_id', propertyId).order('review_date', { ascending: false })
}

export async function upsertReviews(propertyId, reviews) {
  // Delete all existing reviews for this property then insert fresh
  await supabase.from('reviews').delete().eq('clinic_id', propertyId)
  const rows = reviews.map(r => ({ ...r, clinic_id: propertyId }))
  let inserted = 0
  for (let i = 0; i < rows.length; i += 50) {
    const { data } = await supabase.from('reviews').insert(rows.slice(i, i + 50)).select()
    if (data) inserted += data.length
  }
  return { data: { count: inserted }, error: null }
}

export async function saveAiClassification(reviewId, result) {
  return supabase.from('reviews').update({
    ai_sentiment:  result.sentiment,
    ai_categories: result.categories,
    ai_severity:   result.severity,
    ai_summary:    result.summary,
    ai_risk_flag:  result.riskFlag,
    ai_risk_reason: result.riskReason,
    ai_action:     result.suggestedAction,
    ai_analysed_at: new Date().toISOString(),
  }).eq('id', reviewId).select().single()
}

export async function saveResponse(reviewId, responseText) {
  return supabase.from('reviews').update({
    response_text: responseText,
    responded: true,
  }).eq('id', reviewId).select().single()
}

// ── COMPETITORS ───────────────────────────────────────────────────────────────
export async function getCompetitors(propertyId) {
  return supabase.from('competitors').select('*').eq('clinic_id', propertyId).order('rating', { ascending: false })
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
export async function saveReport(propertyId, data, riskScore) {
  return supabase.from('weekly_reports').insert({ clinic_id: propertyId, report_data: data, risk_score: riskScore }).select().single()
}
export async function saveBrief(propertyId, data) {
  return supabase.from('intelligence_briefs').insert({ clinic_id: propertyId, brief_data: data }).select().single()
}
