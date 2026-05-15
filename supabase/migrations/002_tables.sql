-- ============================================================
-- 002_tables.sql
-- Genusswerte Bonn Admin Panel — Core table definitions
-- Requires: 001_enums.sql
-- ============================================================


-- ------------------------------------------------------------
-- customers
-- Basic contact record. Created by admin when entering an order.
-- ------------------------------------------------------------
CREATE TABLE customers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT,
  phone       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- orders
-- One order per customer inquiry or purchase.
-- total_amount starts at 0 and is maintained by trigger on order_items.
-- Admin must NOT write total_amount directly — the trigger owns it.
-- ------------------------------------------------------------
CREATE TABLE orders (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID           REFERENCES customers(id) ON DELETE SET NULL,
  order_type      order_type     NOT NULL,
  status          order_status   NOT NULL DEFAULT 'inquiry',
  payment_status  payment_status NOT NULL DEFAULT 'open',
  total_amount    NUMERIC(10,2)  NOT NULL DEFAULT 0,
  -- Kept as a readable column but recalculated automatically by trigger.
  source          TEXT           NOT NULL DEFAULT 'whatsapp',
  -- Source of the inquiry: 'whatsapp' | 'formspree' | 'in_person' | 'manual'
  internal_ref    TEXT,
  -- Optional human-readable reference, e.g. "GW-2026-0042". Admin sets manually.
  notes           TEXT,
  paid_at         TIMESTAMPTZ,
  -- Set by admin when marking payment as paid. Used for monthly revenue queries.
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- order_items
-- Line items within an order.
-- total_price is a generated column: quantity * unit_price (stored).
-- Changes here trigger recalculation of orders.total_amount.
-- ------------------------------------------------------------
CREATE TABLE order_items (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type  product_type  NOT NULL,
  product_name  TEXT          NOT NULL,
  -- Canonical product name from the catalog, e.g. "Wein Tasting", "Der Deutsche Klassiker"
  variant       TEXT,
  -- Selected variant, e.g. "2 Personen", "Medium", "50 €"
  quantity      INT           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price    NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price   NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- vouchers
-- Created for tasting_voucher and value_voucher order items only.
-- Gift box order items do NOT generate a voucher row.
--
-- code is NULLABLE: it is NULL until admin explicitly generates it.
-- The UNIQUE constraint still applies — PostgreSQL allows multiple NULLs
-- in a UNIQUE column, so un-generated vouchers do not conflict.
-- ------------------------------------------------------------
CREATE TABLE vouchers (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID            NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  -- RESTRICT prevents deleting an order that has vouchers.
  order_item_id    UUID            REFERENCES order_items(id) ON DELETE SET NULL,
  code             TEXT            UNIQUE,
  -- NULL until generated. Once set, must be globally unique.
  voucher_type     product_type    NOT NULL
                   CHECK (voucher_type IN ('tasting_voucher', 'value_voucher')),
  product_name     TEXT            NOT NULL,
  -- The specific tasting name, e.g. "Wein Tasting", or "Wertgutschein"
  variant          TEXT,
  -- e.g. "2 Personen" for tasting vouchers, "50 €" for value vouchers
  persons_allowed  INT,
  -- Tasting vouchers only: max persons this voucher covers. NULL for value vouchers.
  value_amount     NUMERIC(10,2),
  -- Value vouchers only: monetary value. NULL for tasting vouchers.
  status           voucher_status  NOT NULL DEFAULT 'pending',
  valid_until      DATE,
  -- Optional, set manually by admin. No automatic expiry enforcement in MVP.
  generated_at     TIMESTAMPTZ,
  -- Timestamp when admin generated the code.
  sent_at          TIMESTAMPTZ,
  -- Timestamp when admin marked the code as sent to customer.
  redeemed_at      TIMESTAMPTZ,
  -- Timestamp when the voucher was fully redeemed/tasting completed.
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- redemption_requests
-- Recorded by admin based on customer contact (WhatsApp/email).
-- In MVP, no public form writes to this table.
-- Preferred dates use explicit columns rather than JSONB for
-- simpler form binding and filtering.
-- ------------------------------------------------------------
CREATE TABLE redemption_requests (
  id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id          UUID               NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
  -- RESTRICT prevents deleting a voucher that has redemption requests.
  customer_name       TEXT               NOT NULL,
  customer_email      TEXT,
  customer_phone      TEXT,
  requested_persons   INT                NOT NULL CHECK (requested_persons > 0),
  -- Customer's preferred date/time options (up to 3).
  -- All optional — customer may provide fewer than 3.
  preferred_date_1    DATE,
  preferred_time_1    TIME,
  preferred_date_2    DATE,
  preferred_time_2    TIME,
  preferred_date_3    DATE,
  preferred_time_3    TIME,
  message             TEXT,
  -- Free-text notes or wishes from the customer.
  status              redemption_status  NOT NULL DEFAULT 'pending',
  confirmed_date      TIMESTAMPTZ,
  -- Set by admin when confirming a specific tasting date.
  admin_notes         TEXT,
  -- Internal notes visible only to admin.
  created_at          TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ        NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- internal_notes
-- Admin-only notes attached to an order, voucher, or redemption request.
-- Replaces communication_log in MVP.
-- Exactly one of the three foreign keys should be non-null per row.
-- ------------------------------------------------------------
CREATE TABLE internal_notes (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id               UUID        REFERENCES orders(id)              ON DELETE CASCADE,
  voucher_id             UUID        REFERENCES vouchers(id)            ON DELETE CASCADE,
  redemption_request_id  UUID        REFERENCES redemption_requests(id) ON DELETE CASCADE,
  note                   TEXT        NOT NULL,
  created_by             TEXT        NOT NULL DEFAULT 'admin',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraint: at least one parent reference must be set
  CONSTRAINT internal_notes_has_parent CHECK (
    (order_id IS NOT NULL)::int +
    (voucher_id IS NOT NULL)::int +
    (redemption_request_id IS NOT NULL)::int >= 1
  )
);
