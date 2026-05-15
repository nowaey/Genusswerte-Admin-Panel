-- ============================================================
-- 006_rls.sql
-- Genusswerte Bonn Admin Panel — Row Level Security policies
-- Requires: 002_tables.sql
-- ============================================================
--
-- Security model:
--   - All tables are locked to authenticated users only.
--   - "Authenticated" = admin users created in Supabase Auth.
--   - No anon (public) policies exist in MVP.
--   - The public website has no direct database access in MVP.
--   - Voucher validation is admin-side only in MVP.
--
-- V2 note:
--   When adding a public redemption form, use a SECURITY DEFINER
--   Postgres function (RPC) — never add SELECT on vouchers to anon.
-- ============================================================


-- Enable RLS on every table
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes      ENABLE ROW LEVEL SECURITY;


-- Authenticated admin: full access to all tables
-- One policy per table; covers SELECT, INSERT, UPDATE, DELETE.

CREATE POLICY "admin_all" ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_all" ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_all" ON order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_all" ON vouchers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_all" ON redemption_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_all" ON internal_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- No anon policies.
-- Supabase will reject any unauthenticated request with 403 / empty result.
