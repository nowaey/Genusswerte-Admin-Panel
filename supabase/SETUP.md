# Supabase Setup — Genusswerte Admin Panel

## 1. Create a new Supabase project

1. Go to https://supabase.com and log in
2. Click **New project**
3. Name: `genusswerte-admin` (or similar)
4. Database password: generate a strong one and save it
5. Region: `eu-central-1` (Frankfurt) — closest to Bonn
6. Wait for provisioning (~1–2 min)

---

## 2. Run the migrations (in order)

Open **SQL Editor** in the Supabase dashboard (left sidebar).

Run each file below in a **separate query tab**, in the exact order listed:

| Order | File | What it creates |
|---|---|---|
| 1 | `migrations/001_enums.sql` | PostgreSQL enum types |
| 2 | `migrations/002_tables.sql` | All 6 tables |
| 3 | `migrations/003_triggers.sql` | `recalculate_order_total` + `set_updated_at` triggers |
| 4 | `migrations/004_indexes.sql` | Performance indexes |
| 5 | `migrations/005_views.sql` | `revenue_summary` + `revenue_by_category` views |
| 6 | `migrations/006_rls.sql` | Row Level Security policies |

For each file: open it, copy the full content, paste into the SQL editor, click **Run**.

---

## 3. Create the admin user

1. In Supabase dashboard → **Authentication** → **Users** → **Add user**
2. Enter the admin email and a strong password
3. Confirm the user

This is the account used to log into the admin panel.

---

## 4. Verify the setup

Run these quick checks in the SQL editor:

```sql
-- Should show all 6 tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should show all enum types
SELECT typname FROM pg_type
WHERE typtype = 'e'
ORDER BY typname;

-- Should show both views
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public';

-- Should show 2 triggers on order_items, 1 each on orders and redemption_requests
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Test the revenue_summary view (should return one row of zeros)
SELECT * FROM revenue_summary;

-- Test the revenue_by_category view (should return one row of zeros)
SELECT * FROM revenue_by_category;
```

---

## 5. Get your API keys

Go to **Settings** → **API** in the Supabase dashboard.

You need two values for the React app:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

The `anon` key is safe to include in the frontend.
The `service_role` key must NEVER go into the frontend — keep it server-side only.

Save these for Step 2 (React project scaffold).

---

## 6. Schema summary

```
customers
  └── orders (many, via customer_id)
        └── order_items (many, via order_id)
        └── vouchers (many, via order_id — tasting/value only, never gift_box)
              └── redemption_requests (many, via voucher_id)

orders           → internal_notes (via order_id)
vouchers         → internal_notes (via voucher_id)
redemption_requests → internal_notes (via redemption_request_id)
```

Key design decisions:
- `orders.total_amount` is maintained by a DB trigger — never write it from the app
- `vouchers.code` is NULL until admin generates it — UNIQUE but nullable
- `redemption_requests` uses explicit date/time columns (preferred_date_1/time_1 etc.), not JSONB
- `valid_until` on vouchers is optional, set manually by admin — no automatic expiry logic
- Revenue is counted only from orders with `payment_status = 'paid'`
- Category revenue (tasting/value/gift_box) is calculated from `order_items.product_type`, not `orders.order_type`
- No public/anon database access in MVP — admin panel only
