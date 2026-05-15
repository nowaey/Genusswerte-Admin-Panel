-- ============================================================
-- 005_views.sql
-- Genusswerte Bonn Admin Panel — Dashboard views
-- Requires: 002_tables.sql, 003_triggers.sql
-- ============================================================


-- ------------------------------------------------------------
-- revenue_summary
--
-- Order-level aggregates used by the dashboard.
-- Revenue = only orders with payment_status = 'paid'.
-- Cancelled and refunded orders are excluded from revenue totals.
-- Open inquiries (payment_status = 'open') are never counted as revenue.
-- ------------------------------------------------------------
CREATE VIEW revenue_summary AS
SELECT
  -- Total confirmed revenue (all time)
  COALESCE(
    SUM(total_amount) FILTER (WHERE payment_status = 'paid'),
    0
  ) AS total_revenue,

  -- Revenue in the current calendar month (based on paid_at timestamp)
  COALESCE(
    SUM(total_amount) FILTER (
      WHERE payment_status = 'paid'
        AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', now())
    ),
    0
  ) AS revenue_this_month,

  -- Open/unpaid order value (not revenue — informational only)
  COALESCE(
    SUM(total_amount) FILTER (WHERE payment_status = 'open'),
    0
  ) AS open_payments_amount,

  COUNT(*) FILTER (WHERE payment_status = 'open')
    AS open_payments_count,

  -- Cancelled + refunded total (informational, excluded from revenue)
  COALESCE(
    SUM(total_amount) FILTER (WHERE payment_status IN ('cancelled', 'refunded')),
    0
  ) AS cancelled_refunded_amount,

  -- Average order value across paid orders only
  ROUND(
    AVG(total_amount) FILTER (WHERE payment_status = 'paid'),
    2
  ) AS avg_order_value,

  -- Paid order count
  COUNT(*) FILTER (WHERE payment_status = 'paid')
    AS paid_orders_count,

  -- Open inquiry count (status = inquiry, no payment yet)
  COUNT(*) FILTER (WHERE status = 'inquiry')
    AS open_inquiry_count

FROM orders;


-- ------------------------------------------------------------
-- revenue_by_category
--
-- Category breakdown of paid revenue, calculated from
-- order_items.product_type — NOT from orders.order_type.
--
-- This correctly splits revenue for mixed orders:
-- e.g. an order containing a tasting voucher + a gift box
-- contributes to both revenue_tasting_vouchers and revenue_gift_boxes.
-- ------------------------------------------------------------
CREATE VIEW revenue_by_category AS
SELECT
  COALESCE(
    SUM(oi.total_price) FILTER (WHERE oi.product_type = 'tasting_voucher'),
    0
  ) AS revenue_tasting_vouchers,

  COALESCE(
    SUM(oi.total_price) FILTER (WHERE oi.product_type = 'value_voucher'),
    0
  ) AS revenue_value_vouchers,

  COALESCE(
    SUM(oi.total_price) FILTER (WHERE oi.product_type = 'gift_box'),
    0
  ) AS revenue_gift_boxes

FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.payment_status = 'paid';
