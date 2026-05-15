-- ============================================================
-- 003_triggers.sql
-- Genusswerte Bonn Admin Panel — Database triggers
-- Requires: 002_tables.sql
-- ============================================================


-- ------------------------------------------------------------
-- recalculate_order_total
--
-- Keeps orders.total_amount in sync with the sum of
-- order_items.total_price for the same order.
--
-- Fires AFTER any INSERT, UPDATE, or DELETE on order_items.
-- This means the application never writes total_amount directly —
-- it is always derived from the actual line items.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalculate_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_order_id UUID;
BEGIN
  -- On DELETE use OLD row; on INSERT or UPDATE use NEW row.
  IF TG_OP = 'DELETE' THEN
    affected_order_id := OLD.order_id;
  ELSE
    affected_order_id := NEW.order_id;
  END IF;

  UPDATE orders
  SET
    total_amount = COALESCE(
      (SELECT SUM(total_price) FROM order_items WHERE order_id = affected_order_id),
      0
    ),
    updated_at = now()
  WHERE id = affected_order_id;

  -- AFTER trigger: return value is ignored for row-level triggers on tables,
  -- but we must return something. NULL is correct for AFTER triggers.
  RETURN NULL;
END;
$$;


CREATE TRIGGER trg_recalculate_order_total
AFTER INSERT OR UPDATE OR DELETE
ON order_items
FOR EACH ROW
EXECUTE FUNCTION recalculate_order_total();


-- ------------------------------------------------------------
-- set_updated_at
--
-- Automatically updates the updated_at column on orders and
-- redemption_requests whenever a row is changed directly
-- (not via the order_items trigger, which already sets updated_at).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE
ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


CREATE TRIGGER trg_redemption_requests_updated_at
BEFORE UPDATE
ON redemption_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
