// Edge Function: create-checkout-session
//
// Creates a Stripe Checkout Session for a tasting or value voucher.
// Called by the Admin Panel test page (/stripe-test) and later by the public website.
//
// Deploy: supabase functions deploy create-checkout-session
// Auth:   JWT required (admin session). Switch to --no-verify-jwt when public website is ready.

import Stripe from 'npm:stripe'
import { calculatePriceEuros } from '../_shared/voucher-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      product_name,
      variant,
      voucher_type,
      customer_email,
      customer_name,
      success_url,
      cancel_url,
    } = await req.json()

    // Validation
    if (!['tasting_voucher', 'value_voucher'].includes(voucher_type)) {
      return json({ error: 'Invalid voucher_type' }, 400)
    }
    if (!customer_email) {
      return json({ error: 'customer_email is required' }, 400)
    }
    if (!success_url || !cancel_url) {
      return json({ error: 'success_url and cancel_url are required' }, 400)
    }

    const priceEuros = calculatePriceEuros(product_name, variant, voucher_type)
    if (priceEuros <= 0) {
      return json({ error: 'Invalid product or variant — price must be > 0' }, 400)
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-11-20.acacia',
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: priceEuros * 100, // Stripe expects cents
            product_data: {
              name: `${product_name} – ${variant}`,
              description: 'Gutschein · Genusswerte Bonn',
            },
          },
          quantity: 1,
        },
      ],
      customer_email: customer_email,
      metadata: {
        product_name,
        variant,
        voucher_type,
        customer_name: customer_name ?? '',
        customer_email, // duplicated into metadata so webhook can access it reliably
      },
      success_url,
      cancel_url,
    })

    return json({ url: session.url })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
