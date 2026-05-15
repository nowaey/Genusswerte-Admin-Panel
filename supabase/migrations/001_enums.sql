-- ============================================================
-- 001_enums.sql
-- Genusswerte Bonn Admin Panel — PostgreSQL enum types
-- Run this first, before any table definitions.
-- ============================================================

-- Order classification (the type of thing being ordered)
CREATE TYPE order_type AS ENUM (
  'tasting_voucher',  -- one or more tasting vouchers
  'value_voucher',    -- one or more value/gift vouchers (Wertgutschein)
  'gift_box',         -- one or more Genussboxen
  'mixed'             -- order contains multiple product types
);

-- Lifecycle status of an order
CREATE TYPE order_status AS ENUM (
  'inquiry',          -- arrived via WhatsApp/Formspree, not yet actioned
  'payment_open',     -- admin confirmed order, awaiting bank transfer
  'paid',             -- payment manually confirmed by admin
  'in_preparation',   -- gift boxes only: being assembled
  'ready',            -- gift boxes only: ready for pickup or shipping
  'completed',        -- fully fulfilled
  'cancelled',        -- cancelled before payment or fulfilment
  'refunded'          -- payment was refunded
);

-- Payment status (separate from order lifecycle for clean revenue queries)
CREATE TYPE payment_status AS ENUM (
  'open',       -- awaiting payment
  'paid',       -- payment confirmed
  'cancelled',  -- order cancelled, no payment taken or reversed
  'refunded'    -- payment was returned to customer
);

-- Product category of a single order line item
CREATE TYPE product_type AS ENUM (
  'tasting_voucher',  -- a specific tasting experience voucher
  'value_voucher',    -- a monetary Wertgutschein (25/50/100 €)
  'gift_box'          -- a Genussbox product
);

-- Voucher lifecycle (tasting_voucher and value_voucher only — gift boxes have no voucher)
CREATE TYPE voucher_status AS ENUM (
  'pending',               -- order not yet paid; code not yet generated
  'active',                -- paid, code generated, ready for customer to redeem
  'redemption_requested',  -- admin has recorded a redemption request from customer
  'date_confirmed',        -- admin has confirmed a specific tasting date
  'redeemed',              -- tasting completed; voucher fully used
  'expired',               -- manually marked expired by admin
  'cancelled'              -- order was cancelled or refunded
);

-- Lifecycle of a redemption request
CREATE TYPE redemption_status AS ENUM (
  'pending',              -- just received, not yet reviewed
  'under_review',         -- admin is reviewing preferred dates
  'date_confirmed',       -- admin confirmed a date
  'alternative_proposed', -- admin proposed a different date
  'completed',            -- tasting took place
  'rejected'              -- request rejected (e.g. voucher invalid, no availability)
);
