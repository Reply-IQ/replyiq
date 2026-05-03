// api/create-checkout.js
// Creates a Stripe Checkout session for monthly or annual plan
// Supports: Visa, Mastercard, TWINT, SEPA, Apple Pay, Google Pay

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { plan, clinicId, email } = req.body
  // plan: 'monthly' | 'annual'

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to Vercel.' })

  // Price IDs — set these after creating products in Stripe dashboard
  const PRICES = {
    monthly: process.env.STRIPE_PRICE_MONTHLY, // CHF 249/month
    annual:  process.env.STRIPE_PRICE_ANNUAL,  // CHF 2490/year
  }

  const priceId = PRICES[plan]
  if (!priceId) return res.status(400).json({ error: `Invalid plan: ${plan}. Configure STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL in Vercel.` })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.replyiq.ch'

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode':                         'subscription',
        'line_items[0][price]':         priceId,
        'line_items[0][quantity]':      '1',
        'customer_email':               email || '',
        'success_url':                  `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url':                   `${appUrl}/settings?payment=cancelled`,
        'metadata[clinic_id]':          clinicId,
        'metadata[plan]':               plan,
        // Payment methods — Stripe auto-enables based on currency
        // CHF → enables: card, twint, sepa
        'currency':                     'chf',
        'payment_method_types[0]':      'card',
        'payment_method_types[1]':      'twint',
        'payment_method_types[2]':      'sepa_debit',
        // Trial info in Stripe too
        'subscription_data[metadata][clinic_id]': clinicId,
        // Allow promotion codes
        'allow_promotion_codes':        'true',
        // Billing address
        'billing_address_collection':   'auto',
      }).toString(),
    })

    const session = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: session.error?.message || 'Stripe error' })

    return res.status(200).json({ url: session.url, sessionId: session.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
