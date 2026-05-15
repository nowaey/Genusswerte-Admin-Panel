-- ============================================================
-- 004_indexes.sql
-- Genusswerte Bonn Admin Panel — Performance indexes
-- Requires: 002_tables.sql
-- ============================================================


-- orders: most dashboard and list queries filter or sort by these
CREATE INDEX idx_orders_payment_status  ON orders(payment_status);
CREATE INDEX idx_orders_status          ON orders(status);
CREATE INDEX idx_orders_paid_at         ON orders(paid_at);
CREATE INDEX idx_orders_customer_id     ON orders(customer_id);
CREATE INDEX idx_orders_created_at      ON orders(created_at DESC);

-- order_items: always queried by parent order
CREATE INDEX idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX idx_order_items_product_type ON order_items(product_type);
-- product_type index supports the revenue_by_category view efficiently

-- vouchers: code lookup is the most frequent read path
CREATE INDEX idx_vouchers_code          ON vouchers(code) WHERE code IS NOT NULL;
-- Partial index: only index rows that have a code (skips un-generated vouchers)
CREATE INDEX idx_vouchers_status        ON vouchers(status);
CREATE INDEX idx_vouchers_order_id      ON vouchers(order_id);
CREATE INDEX idx_vouchers_order_item_id ON vouchers(order_item_id);

-- redemption_requests: primary access patterns
CREATE INDEX idx_redemption_voucher_id  ON redemption_requests(voucher_id);
CREATE INDEX idx_redemption_status      ON redemption_requests(status);
CREATE INDEX idx_redemption_created_at  ON redemption_requests(created_at DESC);

-- internal_notes: always accessed by parent entity
CREATE INDEX idx_notes_order_id              ON internal_notes(order_id)              WHERE order_id IS NOT NULL;
CREATE INDEX idx_notes_voucher_id            ON internal_notes(voucher_id)            WHERE voucher_id IS NOT NULL;
CREATE INDEX idx_notes_redemption_request_id ON internal_notes(redemption_request_id) WHERE redemption_request_id IS NOT NULL;

-- customers: search by name / email
CREATE INDEX idx_customers_name  ON customers(name);
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
