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

// ── PROPERTY ──────────────────────────────────────────────────────────────────
// Always returns the correct clinic for the current user.
// Uses oldest-first ordering so we always get the same (primary) clinic.
export async function getProperty() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not logged in' } }

  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)

  return { data: data?.[0] ?? null, error }
}

// Updates the current user's clinic.
// Handles duplicates by always targeting the oldest clinic by ID.
export async function updateProperty(updates) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: { message: 'Not logged in' } }

  // Find all clinics for this user (ordered oldest first)
  const { data: clinics } = await supabase
    .from('clinics')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!clinics?.length) {
    // No clinic exists — create one
    return supabase
      .from('clinics')
      .insert({ ...updates, user_id: user.id })
      .select()
      .single()
  }

  const primaryId = clinics[0].id

  // Clean up any duplicate clinics silently
  if (clinics.length > 1) {
    const extraIds = clinics.slice(1).map(c => c.id)
    await supabase.from('clinics').delete().in('id', extraIds)
  }

  // Update the primary clinic by its specific ID
  return supabase
    .from('clinics')
    .update(updates)
    .eq('id', primaryId)
    .select()
    .single()
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
export async function getReviews(propertyId) {
  return supabase
    .from('reviews')
    .select('*')
    .eq('clinic_id', propertyId)
    .order('review_date', { ascending: false })
    .range(0, 4999)
}

export async function upsertReviews(propertyId, reviews) {
  if (!reviews?.length) return { data: { count: 0 }, error: null }
  const rows = reviews.map(r => ({ ...r, clinic_id: propertyId }))
  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const { data } = await supabase
      .from('reviews')
      .upsert(rows.slice(i, i + 100), {
        onConflict: 'clinic_id,google_review_id',
        ignoreDuplicates: false,
      })
      .select()
    if (data) inserted += data.length
  }
  return { data: { count: inserted }, error: null }
}

export async function saveAiClassification(reviewId, result) {
  // field names match what classifyReview() returns in api.js
  return supabase.from('reviews').update({
    ai_sentiment:   result.ai_sentiment   || result.sentiment,
    ai_categories:  result.ai_categories  || result.categories  || [],
    ai_severity:    result.ai_severity    || result.severity,
    ai_summary:     result.ai_summary     || result.summary,
    ai_risk_flag:   result.ai_risk_flag   ?? result.riskFlag    ?? false,
    ai_risk_reason: result.ai_risk_reason || result.riskReason  || null,
    ai_action:      result.ai_action      || result.suggestedAction || null,
    ai_analysed_at: new Date().toISOString(),
  }).eq('id', reviewId).select().single()
}

export async function saveResponse(reviewId, responseText) {
  return supabase.from('reviews').update({
    response_text: responseText,
    responded:     true,
  }).eq('id', reviewId).select().single()
}

// ── COMPETITORS ───────────────────────────────────────────────────────────────
export async function getCompetitors(propertyId) {
  return supabase
    .from('competitors')
    .select('*')
    .eq('clinic_id', propertyId)
    .order('rating', { ascending: false })
}

// ── REPORTS ───────────────────────────────────────────────────────────────────
export async function saveReport(propertyId, data, riskScore) {
  // Silent — weekly_reports table may not exist yet
  try {
    return await supabase
      .from('weekly_reports')
      .insert({ clinic_id: propertyId, report_data: data, risk_score: riskScore })
      .select()
      .single()
  } catch { return { data: null, error: null } }
}

export async function saveBrief(propertyId, data) {
  return supabase
    .from('intelligence_briefs')
    .insert({ clinic_id: propertyId, brief_data: data })
    .select()
    .single()
}
