export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { platform, identifier, clinicId } = req.body
  if (!platform || !identifier || !clinicId) {
    return res.status(400).json({ error: 'platform, identifier and clinicId required' })
  }

  const outscraperKey = process.env.OUTSCRAPER_API_KEY
  const supabaseUrl   = process.env.VITE_SUPABASE_URL
  const serviceKey    = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!outscraperKey) return res.status(500).json({ error: 'OUTSCRAPER_API_KEY not configured' })

  try {
    // Format query based on platform
    let url
    if (platform === 'tripadvisor') {
      // Validate URL format
      if (!identifier.includes('tripadvisor.')) {
        return res.status(400).json({ error: 'Invalid TripAdvisor URL. Must be a full URL like: https://www.tripadvisor.com/Hotel_Review-g188113-d123456-...' })
      }
      // Clean URL — remove query params and language suffixes
      const cleanUrl = identifier.split('?')[0].split('#')[0]
      console.log('[fetch-reviews] TripAdvisor import — URL:', cleanUrl)
      url = `https://api.app.outscraper.com/tripadvisor-reviews?query=${encodeURIComponent(cleanUrl)}&reviewsLimit=200&async=true`
    } else if (platform === 'holidaycheck') {
      if (!identifier.includes('holidaycheck.')) {
        return res.status(400).json({ error: 'Invalid HolidayCheck URL. Must be a full URL like: https://www.holidaycheck.de/h/hotel-name/...' })
      }
      const cleanUrl = identifier.split('?')[0].split('#')[0]
      console.log('[fetch-reviews] HolidayCheck import — URL:', cleanUrl)
      url = `https://api.app.outscraper.com/holidaycheck-reviews?query=${encodeURIComponent(cleanUrl)}&reviewsLimit=200&async=true`
    } else if (platform === 'booking') {
      if (!identifier.includes('booking.com')) {
        return res.status(400).json({ error: 'Invalid Booking.com URL. Must be a full URL like: https://www.booking.com/hotel/ch/...' })
      }
      const cleanUrl = identifier.split('?')[0].split('#')[0]
      console.log('[fetch-reviews] Booking.com import — URL:', cleanUrl)
      url = `https://api.app.outscraper.com/booking-reviews?query=${encodeURIComponent(cleanUrl)}&reviewsLimit=200&async=true`
    } else {
      // Google — Place IDs need Google Maps URL format
      const query = (identifier.startsWith('ChIJ') || identifier.startsWith('Ei'))
        ? `https://www.google.com/maps/place/?q=place_id:${identifier}`
        : identifier
      console.log('[fetch-reviews] Google import — query:', query)
      url = `https://api.app.outscraper.com/maps/reviews-v3?query=${encodeURIComponent(query)}&reviewsLimit=500&language=en&async=true&reviewsSort=newest`
    }
    const r   = await fetch(url, { headers: { 'X-API-KEY': outscraperKey } })

    console.log('[fetch-reviews] Outscraper HTTP status:', r.status)
    const rawText = await r.text()
    console.log('[fetch-reviews] Outscraper response:', rawText.slice(0, 500))

    let data
    try { data = JSON.parse(rawText) } catch { data = { raw: rawText } }

    const jobId = data?.id
    if (!jobId) {
      console.error('[fetch-reviews] No jobId — HTTP', r.status, '— Response:', JSON.stringify(data).slice(0, 300))
      const reason = data?.message || data?.error || data?.detail || 'Unknown error'
      let friendlyError = 'Could not start the import.'
      if (r.status === 401 || r.status === 403) friendlyError = 'Outscraper API key is invalid or has no credits. Check app.outscraper.com/billing'
      else if (r.status === 422) friendlyError = 'The URL you entered was not recognised by Outscraper. Make sure it is the full property page URL.'
      else if (r.status === 404) friendlyError = 'Property not found on this platform. Check the URL is correct and the property exists.'
      else if (reason) friendlyError = reason
      return res.status(500).json({ error: friendlyError, detail: reason, httpStatus: r.status })
    }

    console.log('[fetch-reviews] Job started:', jobId)
    // Frontend saves pending_review_job and platform_connections using authenticated session
    return res.status(200).json({ jobId, status: 'pending' })

  } catch (e) {
    console.error('[fetch-reviews] Exception:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
