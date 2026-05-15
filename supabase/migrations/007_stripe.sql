-- ============================================================
-- 007_stripe.sql
-- Genusswerte Bonn — Stripe payment tracking columns
-- Requires: 002_tables.sql
-- ============================================================
--
-- Adds two nullable columns to orders for Stripe integration:
--   stripe_session_id         — Stripe Checkout Session ID (cs_...)
--                               UNIQUE constraint enables idempotency checks
--                               in the stripe-webhook Edge Function.
--   stripe_payment_intent_id  — Stripe PaymentIntent ID (pi_...)
--                               Stored for future refund processing via Stripe API.
--
-- All existing triggers, views, RLS policies, and indexes remain unchanged.
-- ============================================================

ALTER TABLE orders
  ADD COLUMN stripe_session_id         TEXT UNIQUE,
  ADD COLUMN stripe_payment_intent_id  TEXT;
