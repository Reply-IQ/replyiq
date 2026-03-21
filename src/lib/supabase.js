import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabase = createClient(url, key)

// ── AUTH ──────────────────────────────────────────────────────────────────
export async function doSignUp(email, password) {
  return supabase.auth.signUp({ email, password })
}
export async function doSignIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}
export async function doSignOut() {
  return supabase.auth.signOut()
}

// ── CLINIC ────────────────────────────────────────────────────────────────
export async function getClinic() {
  return supabase.from('clinics').select('*').maybeSingle()
}

export async function updateClinic(updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not logged in' } }
  return supabase
    .from('clinics')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()
}

// ── REVIEWS ───────────────────────────────────────────────────────────────
export async function getReviews(clinicId) {
  return supabase
    .from('reviews')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('review_date', { ascending: false })
}

export async function upsertReviews(clinicId, reviews) {
  // Insert reviews from Google, skip duplicates by google_review_id
  const rows = reviews.map(r => ({ ...r, clinic_id: clinicId }))
  return supabase
    .from('reviews')
    .upsert(rows, { onConflict: 'google_review_id', ignoreDuplicates: true })
    .select()
}

export async function saveAiClassification(reviewId, result) {
  return supabase
    .from('reviews')
    .update({
      ai_sentiment: result.sentiment,
      ai_categories: result.categories,
      ai_severity: result.severity,
      ai_summary: result.summary,
      ai_risk_flag: result.riskFlag,
      ai_risk_reason: result.riskReason,
      ai_action: result.suggestedAction,
      ai_analysed_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select()
    .single()
}

export async function saveResponse(reviewId, responseText) {
  return supabase
    .from('reviews')
    .update({ response_text: responseText, responded: true })
    .eq('id', reviewId)
    .select()
    .single()
}

// ── COMPETITORS ───────────────────────────────────────────────────────────
export async function getCompetitors(clinicId) {
  return supabase
    .from('competitors')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('rating', { ascending: false })
}

// ── REPORTS ───────────────────────────────────────────────────────────────
export async function saveReport(clinicId, reportData, riskScore) {
  return supabase
    .from('weekly_reports')
    .insert({ clinic_id: clinicId, report_data: reportData, risk_score: riskScore })
    .select()
    .single()
}

export async function saveBrief(clinicId, briefData) {
  return supabase
    .from('intelligence_briefs')
    .insert({ clinic_id: clinicId, brief_data: briefData })
    .select()
    .single()
}

// Alias for backward compatibility
export const signOut = doSignOut
export const signIn = doSignIn
export const signUp = doSignUp
