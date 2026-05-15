// Edge Function: stripe-webhook
//
// Handles Stripe webhook events after a successful payment.
// Verifies the Stripe signature, creates the order, generates the voucher code,
// and sends the confirmation email via Resend.
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Auth:   No JWT — Stripe calls this directly. Signature verification is the auth mechanism.
//
// Handles: checkout.session.completed (card payments)
// Deferred: checkout.session.async_payment_succeeded — needed if SEPA/Klarna are activated later.

import Stripe from 'npm:stripe'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  generateVoucherCode,
  calculatePriceEuros,
  personsFromVariant,
  valueFromVariant,
} from '../_shared/voucher-utils.ts'

Deno.serve(async (req) => {
  // Read raw body before any parsing — required for Stripe signature verification.
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-11-20.acacia',
  })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Stripe signature verification failed:', message)
    return new Response(`Webhook signature error: ${message}`, { status: 400 })
  }

  // Only process checkout.session.completed in V2 (card payments only).
  // checkout.session.async_payment_succeeded will be required if delayed payment
  // methods (SEPA Debit, Klarna, etc.) are enabled in the Stripe Dashboard later.
  if (event.type !== 'checkout.session.completed') {
    return ok()
  }

  const session = event.data.object as Stripe.Checkout.Session

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service_role bypasses RLS — never expose to frontend
  )

  try {
    // ── Idempotency check ────────────────────────────────────────────────────
    // Stripe can deliver webhooks more than once. UNIQUE on stripe_session_id
    // prevents duplicate orders, but we short-circuit here for efficiency.
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .maybeSingle()

    if (existingOrder) {
      console.log('Webhook already processed for session:', session.id)
      return ok()
    }

    // ── Extract metadata ─────────────────────────────────────────────────────
    const {
      product_name,
      variant,
      voucher_type,
      customer_name,
      customer_email,
    } = session.metadata as {
      product_name:   string
      variant:        string
      voucher_type:   string
      customer_name:  string
      customer_email: string
    }

    const priceEuros = calculatePriceEuros(product_name, variant, voucher_type)

    // ── 1. Customer upsert by email ──────────────────────────────────────────
    let customerId: string | null = null
    if (customer_email) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customer_email)
        .maybeSingle()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: created, error: customerErr } = await supabase
          .from('customers')
          .insert({ name: customer_name || 'Unbekannt', email: customer_email })
          .select('id')
          .single()
        if (customerErr) throw customerErr
        customerId = created.id
      }
    }

    // ── 2. Create order ──────────────────────────────────────────────────────
    // total_amount is NOT set here — the trigger trg_recalculate_order_total
    // on order_items will compute it automatically after step 3.
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id:               customerId,
        order_type:                voucher_type,
        status:                    'paid',
        payment_status:            'paid',
        source:                    'stripe',
        stripe_session_id:         session.id,
        stripe_payment_intent_id:  session.payment_intent as string,
        paid_at:                   new Date().toISOString(),
      })
      .select('id')
      .single()
    if (orderErr) throw orderErr

    // ── 3. Create order item (trigger recalculates orders.total_amount) ──────
    const { data: orderItem, error: itemErr } = await supabase
      .from('order_items')
      .insert({
        order_id:     order.id,
        product_type: voucher_type,
        product_name,
        variant,
        quantity:     1,
        unit_price:   priceEuros,
      })
      .select('id')
      .single()
    if (itemErr) throw itemErr

    // ── 4. Generate voucher code and create voucher ──────────────────────────
    // Stripe flow skips the admin pending→active step — voucher is active immediately.
    const personsAllowed = voucher_type === 'tasting_voucher' ? personsFromVariant(variant) : null
    const valueAmount    = voucher_type === 'value_voucher'   ? valueFromVariant(variant)   : null
    let voucherCode: string | null = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateVoucherCode(product_name)
      const { error: voucherErr } = await supabase.from('vouchers').insert({
        order_id:      order.id,
        order_item_id: orderItem.id,
        code,
        voucher_type,
        product_name,
        variant,
        persons_allowed: personsAllowed,
        value_amount:    valueAmount,
        status:          'active',
        generated_at:    new Date().toISOString(),
      })

      if (!voucherErr) { voucherCode = code; break }
      if (voucherErr.code !== '23505') throw voucherErr // only retry on UNIQUE conflict
    }

    if (!voucherCode) throw new Error('Failed to generate unique voucher code after 5 attempts')

    // ── 5. Send confirmation email via Resend ────────────────────────────────
    // Non-blocking: email failure logs the error but does NOT abort the webhook.
    // The order + voucher are already in the DB — admin can resend manually via
    // the voucher detail page in the Admin Panel.
    try {
      const resendKey = Deno.env.get('RESEND_API_KEY')!
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')!
      const greeting  = customer_name ? `Liebe/r ${customer_name},` : 'Hallo,'

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    fromEmail,
          to:      customer_email,
          subject: `Ihr Gutschein für ${product_name} – Genusswerte Bonn`,
          html:    buildEmailHtml({ greeting, productName: product_name, variant, code: voucherCode }),
        }),
      })

      if (!emailRes.ok) {
        const errText = await emailRes.text()
        console.error('Resend API error:', emailRes.status, errText)
      }
    } catch (emailErr) {
      console.error('Resend send failed (non-fatal):', emailErr)
      // No throw — Stripe must receive 200 OK or it will retry and create a duplicate.
    }

    return ok()
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Return 500 so Stripe retries — but only for errors BEFORE the order was committed.
    // After order creation succeeds, all errors in steps 2–5 throw before reaching here
    // only if the order insert itself failed (safe to retry since idempotency check runs first).
    return new Response(JSON.stringify({ error: 'Processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

function ok(): Response {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function buildEmailHtml({
  greeting,
  productName,
  variant,
  code,
}: {
  greeting:    string
  productName: string
  variant:     string
  code:        string
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihr Gutschein – Genusswerte Bonn</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">

  <p style="font-size: 20px; font-weight: 600; margin: 0 0 4px 0;">Genusswerte Bonn</p>
  <p style="color: #666; margin: 0 0 40px 0; font-size: 14px;">Ihre Bestellung ist bestätigt</p>

  <p style="margin: 0 0 8px 0;">${greeting}</p>
  <p style="margin: 0 0 24px 0;">vielen Dank für Ihre Bestellung. Hier ist Ihr Gutschein-Code:</p>

  <div style="background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 8px; padding: 28px 24px; text-align: center; margin: 0 0 32px 0;">
    <p style="font-size: 12px; color: #888; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.08em;">Gutschein-Code</p>
    <p style="font-family: 'Courier New', Courier, monospace; font-size: 30px; font-weight: 700; letter-spacing: 0.18em; margin: 0 0 12px 0; color: #1a1a1a;">${code}</p>
    <p style="font-size: 14px; color: #555; margin: 0;">${productName} &middot; ${variant}</p>
  </div>

  <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Gutschein einlösen</h2>
  <p style="margin: 0 0 12px 0; line-height: 1.6;">
    Senden Sie uns Ihren Code sowie Ihre Wunschtermine zu &mdash; wir bestätigen Ihren Termin nach Verfügbarkeit.
  </p>
  <p style="margin: 0 0 40px 0; line-height: 1.8;">
    E-Mail: <a href="mailto:hallo@genusswerte-bonn.com" style="color: #1a1a1a;">hallo@genusswerte-bonn.com</a><br>
    WhatsApp: auf unserer Website
  </p>

  <p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 24px; margin: 0; line-height: 1.6;">
    Genusswerte Bonn &middot; Poppelsdorfer Allee &middot; 53115 Bonn
  </p>

</body>
</html>`
}
