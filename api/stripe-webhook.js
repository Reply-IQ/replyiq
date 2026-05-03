// api/stripe-webhook.js
// Stripe sends events here when payment is confirmed
// We update Supabase to grant unlimited access automatically

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const stripeKey    = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  // Get raw body for signature verification
  const payload = JSON.stringify(req.body)
  const signature = req.headers['stripe-signature']

  let event = req.body

  // Verify webhook signature if secret is configured
  if (webhookSecret && signature) {
    try {
      // Simple HMAC verification without Stripe SDK
      const crypto = await import('crypto')
      const parts = signature.split(',')
      const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1]
      const sigHash   = parts.find(p => p.startsWith('v1='))?.split('=')[1]
      const signed = `${timestamp}.${payload}`
      const expected = crypto.createHmac('sha256', webhookSecret).update(signed).digest('hex')
      if (expected !== sigHash) {
        console.error('[webhook] Invalid signature')
        return res.status(400).json({ error: 'Invalid signature' })
      }
    } catch (e) {
      console.error('[webhook] Signature check failed:', e.message)
    }
  }

  const clinicId = event.data?.object?.metadata?.clinic_id
  const plan     = event.data?.object?.metadata?.plan || 'monthly'

  console.log('[webhook] Event:', event.type, '| Clinic:', clinicId, '| Plan:', plan)

  try {
    switch (event.type) {

      case 'checkout.session.completed':
      case 'invoice.payment_succeeded': {
        if (!clinicId) break
        // Grant unlimited access
        await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_status:    'active',
            subscription_plan:      plan,
            ai_generations_limit:   999999,
            // Store Stripe customer/subscription IDs for future cancellations
            stripe_customer_id:     event.data?.object?.customer,
            stripe_subscription_id: event.data?.object?.subscription,
          })
        })
        console.log('[webhook] ✓ Clinic', clinicId, 'activated on', plan, 'plan')
        break
      }

      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        if (!clinicId) break
        // Downgrade to expired
        await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_status:  'expired',
            ai_generations_limit: 0,
          })
        })
        console.log('[webhook] Clinic', clinicId, 'subscription ended')
        break
      }
    }

    return res.status(200).json({ received: true })
  } catch (e) {
    console.error('[webhook] Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
