// /api/admin-stats.js — protected admin endpoint
// Returns all clients with usage stats for the admin dashboard
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const secret = process.env.ADMIN_SECRET
  if (secret && req.headers['x-admin-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY

  try {
    // Fetch all clinics
    const clinicsRes = await fetch(
      `${supabaseUrl}/rest/v1/clinics?select=id,name,owner_email,subscription_status,created_at,last_synced_at,platform_connections,ai_profile,user_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const clinics = await clinicsRes.json()

    // Fetch review stats per clinic (count total + responded)
    const reviewsRes = await fetch(
      `${supabaseUrl}/rest/v1/reviews?select=clinic_id,responded,ai_analysed_at`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const allReviews = await reviewsRes.json()

    // Fetch all Supabase auth users to get last_sign_in_at
    const usersRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?per_page=1000`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    const usersData = await usersRes.json()
    const userMap = {}
    ;(usersData.users || []).forEach(u => { userMap[u.id] = u })

    // Build per-clinic stats
    const reviewsByClinic = {}
    ;(Array.isArray(allReviews) ? allReviews : []).forEach(r => {
      if (!reviewsByClinic[r.clinic_id]) reviewsByClinic[r.clinic_id] = { total: 0, responded: 0, classified: 0 }
      reviewsByClinic[r.clinic_id].total++
      if (r.responded) reviewsByClinic[r.clinic_id].responded++
      if (r.ai_analysed_at) reviewsByClinic[r.clinic_id].classified++
    })

    const stats = (Array.isArray(clinics) ? clinics : []).map(c => {
      const rv       = reviewsByClinic[c.id] || { total: 0, responded: 0, classified: 0 }
      const user     = userMap[c.user_id] || {}
      const profile  = c.ai_profile || {}
      const conns    = c.platform_connections || {}
      const platforms = Object.keys(conns).filter(k => conns[k]?.identifier)

      const snippetCount  = profile.smartSnippets?.length || 0
      const hasAutoReply  = profile.autoReply5Star || false
      const responseRate  = rv.total > 0 ? Math.round((rv.responded / rv.total) * 100) : 0
      const lastLogin     = user.last_sign_in_at || null
      const daysSinceLogin = lastLogin
        ? Math.floor((Date.now() - new Date(lastLogin).getTime()) / 86400000)
        : null

      return {
        id:            c.id,
        name:          c.name || 'Unknown',
        email:         c.owner_email || user.email || '—',
        status:        c.subscription_status || 'unknown',
        createdAt:     c.created_at,
        lastLogin,
        daysSinceLogin,
        lastSync:      c.last_synced_at,
        platforms,
        reviewTotal:   rv.total,
        reviewResponded: rv.responded,
        reviewClassified: rv.classified,
        responseRate,
        snippetCount,
        hasAutoReply,
        profileBuilt:  !!profile.brandTone,
        city:          profile.city || '—',
        // Health score 0-100
        health: Math.min(100, Math.round(
          (platforms.length > 0 ? 20 : 0) +
          (rv.total > 0 ? 20 : 0) +
          (responseRate >= 80 ? 30 : responseRate >= 50 ? 15 : 0) +
          (snippetCount > 0 ? 15 : 0) +
          (daysSinceLogin !== null && daysSinceLogin <= 7 ? 15 : daysSinceLogin <= 14 ? 8 : 0)
        ))
      }
    })

    return res.status(200).json({ clients: stats, total: stats.length, asOf: new Date().toISOString() })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
