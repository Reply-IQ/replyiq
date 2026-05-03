// api/check-usage.js
// Called before every AI generation to check trial limits
// Returns: { allowed: true/false, used: n, limit: n, status: 'trial'|'active'|'expired' }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { clinicId } = req.body
  if (!clinicId) return res.status(400).json({ error: 'clinicId required' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  try {
    // Get current usage
    const r = await fetch(
      `${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}&select=ai_generations_used,ai_generations_limit,subscription_status,trial_ends_at,owner_email`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    )
    const data = await r.json()
    const clinic = data?.[0]
    if (!clinic) return res.status(404).json({ error: 'Clinic not found' })

    const used   = clinic.ai_generations_used || 0
    const limit  = clinic.ai_generations_limit || 10
    const status = clinic.subscription_status || 'trial'
    const trialEnd = clinic.trial_ends_at ? new Date(clinic.trial_ends_at) : null
    const now = new Date()

    // Check if trial has expired by time
    let effectiveStatus = status
    if (status === 'trial' && trialEnd && now > trialEnd) {
      effectiveStatus = 'expired'
    }

    // Active subscribers always allowed
    if (effectiveStatus === 'active') {
      // Increment usage counter (for analytics)
      await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_generations_used: used + 1 })
      })
      return res.status(200).json({ allowed: true, used: used + 1, limit, status: 'active' })
    }

    // Trial expired
    if (effectiveStatus === 'expired') {
      return res.status(200).json({ allowed: false, used, limit, status: 'expired', reason: 'Trial period has ended. Upgrade to continue.' })
    }

    // Trial — check generation limit
    if (used >= limit) {
      return res.status(200).json({ allowed: false, used, limit, status: 'trial', reason: `You have used all ${limit} AI generations in your free trial. Upgrade to continue.` })
    }

    // Allowed — increment counter
    await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
      method: 'PATCH',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_generations_used: used + 1 })
    })

    return res.status(200).json({
      allowed: true,
      used: used + 1,
      limit,
      status: 'trial',
      remaining: limit - used - 1,
    })
  } catch (e) {
    // Fail open — don't block users if check fails
    return res.status(200).json({ allowed: true, used: 0, limit: 10, status: 'active', error: e.message })
  }
}
