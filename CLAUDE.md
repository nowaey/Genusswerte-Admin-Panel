# CLAUDE.md — Genusswerte Bonn Admin Panel

## Was ist dieses Projekt

Internes Admin Panel für Genusswerte Bonn — eine Premium-Feinkost-Boutique in Bonn-Poppelsdorf.

Das Panel verwaltet:
- Tasting-Gutschein-Bestellungen und Einlösungen
- Wertgutschein-Bestellungen
- Genussbox-Bestellungen
- Kundenstammdaten
- Umsatz-Dashboard

Das Admin Panel ist eine separate App vom öffentlichen Auftritt der Website.

---

## Aktueller Stand

**MVP: vollständig gebaut und funktionsfähig.**

Fertige Seiten:
- `/login` — Supabase Auth (E-Mail + Passwort)
- `/` — Dashboard mit KPI-Karten
- `/orders` + `/orders/new` + `/orders/:id` + `/orders/:id/edit`
- `/vouchers` + `/vouchers/:id`
- `/redemptions` + `/redemptions/new` + `/redemptions/:id`
- `/customers` + `/customers/:id`

Nächste Phase: V2 — Öffentliche Website-Integration (Stripe, Resend, PDF-Ticket).

---

## Tech Stack

| Layer | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (CSS-Variablen, shadcn-kompatibel) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Routing | React Router v6 |
| Icons | lucide-react |
| Hosting Admin Panel | Vercel oder Netlify |
| Hosting Website | all-inkl.com (FTP, statisches HTML/CSS/JS) |
| Zahlung (V2) | Stripe (Checkout + Webhooks) |
| E-Mail (V2) | Resend (transactional email API) |

### Dev-Befehle

```bash
npm run dev      # Vite Dev-Server starten
npm run build    # Production Build
npm run preview  # Production Build lokal testen
```

Supabase-Projekt: `https://dwreeykpjptfncjijjmg.supabase.co`

---

## Kritische Geschäftsregel — Tasting-Buchungen

Es gibt ein separates Buchungssystem des nationalen Franchise-Partners.

**Daher gilt:**
- Kunden dürfen KEINEN Tasting-Termin direkt buchen oder sofort reservieren
- Kein Live-Verfügbarkeitskalender für Kunden
- Kein automatisches Terminbestätigungssystem

**Korrekter Ablauf:**
1. Kunde kauft Gutschein
2. Admin bestätigt Zahlung
3. Admin generiert Gutschein-Code
4. Kunde gibt Code ein + wünscht Termine
5. Admin prüft manuell und bestätigt Termin
6. Kunde erhält Bestätigung (V2: automatisch per E-Mail)

**Verbotene Formulierungen in öffentlichen Texten:**
- "Jetzt buchen", "Sofort buchen", "Platz sichern", "verbindlich buchen"

**Erlaubte Formulierungen:**
- "Gutschein einlösen", "Wunschtermin anfragen", "Termin nach Verfügbarkeit"

---

## Datenbankschema (produktiv)

### Enums
- `order_type`: `tasting_voucher | value_voucher | gift_box | mixed`
- `order_status`: `inquiry | payment_open | paid | in_preparation | ready | completed | cancelled | refunded`
- `payment_status`: `open | paid | cancelled | refunded`
- `product_type`: `tasting_voucher | value_voucher | gift_box`
- `voucher_status`: `pending | active | redemption_requested | date_confirmed | redeemed | expired | cancelled`
- `redemption_status`: `pending | under_review | date_confirmed | alternative_proposed | completed | rejected`

### Tabellen

**customers**: `id, name, email, phone, notes, created_at`

**orders**: `id, customer_id, order_type, status, payment_status, total_amount, source, internal_ref, notes, paid_at, created_at, updated_at`
- `total_amount` wird automatisch per Trigger aus `order_items` berechnet — niemals direkt schreiben

**order_items**: `id, order_id, product_type, product_name, variant, quantity, unit_price, total_price (generated), created_at`

**vouchers**: `id, order_id, order_item_id, code (nullable!), voucher_type, product_name, variant, persons_allowed, value_amount, status, valid_until, generated_at, sent_at, redeemed_at, created_at`
- `code` ist NULL bis zur Generierung durch Admin
- UNIQUE-Constraint auf `code` — DB erzwingt Einzigartigkeit
- Nur für `tasting_voucher` und `value_voucher` — niemals für `gift_box`

**redemption_requests**: `id, voucher_id, customer_name, customer_email, customer_phone, requested_persons, preferred_date_1/time_1, preferred_date_2/time_2, preferred_date_3/time_3, message, status, confirmed_date, admin_notes, created_at, updated_at`
- Explizite Datumsfelder (kein JSONB)

**internal_notes**: `id, order_id, voucher_id, redemption_request_id, note, created_by, created_at`
- Mindestens eine der drei FK-Spalten muss gesetzt sein (CHECK-Constraint)

### Views
- `revenue_summary` — Umsatz-Aggregationen auf Order-Ebene
- `revenue_by_category` — Umsatz nach `order_items.product_type` (korrekt für Mixed-Orders)

### Trigger
- `trg_recalculate_order_total` — aktualisiert `orders.total_amount` bei jeder Änderung an `order_items`
- `trg_orders_updated_at` / `trg_redemption_requests_updated_at` — setzt `updated_at` automatisch

---

## Umsatz-Logik

**Umsatz zählt NUR wenn `payment_status = 'paid'`.**

- Offene Anfragen: kein Umsatz
- Storniert/Erstattet: ausgeschlossen
- Kategorie-Umsatz kommt aus `order_items.product_type`, nicht `orders.order_type` — damit Mixed-Orders korrekt aufgeteilt werden

---

## Produktkatalog (hard-coded in `src/lib/products.ts`)

### Tasting-Gutscheine
| Name | Typcode | Interner Slot |
|---|---|---|
| Wein Tasting | WT | Do 19:00 · Fr 20:00 · Sa 20:00 |
| Afterwork Wein Tasting | AW | Mi 18:00 |
| Gin Tasting | GT | 3. Sa 20:00 |
| Champagner & Popcorn | CP | Sa 12:00 |
| Trüffel & Champagner | TC | 3. Sa 20:00 ⚠️ |
| Craft Beer Tasting | CB | 1. Sa 20:00 |
| Wagyu-Burger & Champagner | WB | 2. Sa 20:00 |
| Apéro & Antipasti | AA | Fr 17:00 · Sa 16:00 |

Varianten: `1 Person | 2 Personen | 4 Personen`

⚠️ **Gin Tasting und Trüffel & Champagner teilen absichtlich den gleichen Slot (3. Sa 20:00). Das ist kein Fehler. Admin entscheidet manuell.**

### Wertgutscheine
Varianten: `25 € | 50 € | 100 €` — Name: `Wertgutschein` (Typcode: VV)

### Genussboxen
`Der Deutsche Klassiker | Bella Italia Box | Aperitivo Box | Bonn Probierbox | Date Night Box | Feierabend Box`
Varianten: `Klein | Medium | Groß`

---

## Gutschein-Code-Format

```
GW-[TYPCODE]-[8 zufällige Zeichen]
Beispiel: GW-WT-A4F2K9BX
```

Zeichensatz: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (ohne 0, O, I, 1, L)

- Nur generierbar wenn `orders.payment_status = 'paid'`
- MVP: Generierung im Admin Panel (client-side, `crypto.getRandomValues()`)
- V2: Generierung in Supabase Postgres-Funktion oder Edge Function (atomares Insert + Uniqueness-Check)

---

## Sicherheit

- Supabase Auth (E-Mail + Passwort) — nur für Admin-Nutzer
- RLS auf allen Tabellen — nur `authenticated` hat Zugriff
- **Keine `anon`-Policies in MVP** — keine öffentlichen DB-Zugriffe
- `service_role`-Key niemals im Frontend
- Volle Voucher-Records niemals an anonyme User

**V2 — Öffentliche Voucher-Validierung:**
Nur via `SECURITY DEFINER` Postgres-RPC-Funktion.
Gibt zurück: `{ valid, voucher_type, product_name, persons_allowed, variant }` — keine IDs, keine Kundendaten, keine internen Felder.

---

## V2 Plan — Website-Integration

**Ziel:** Öffentliche Website → Bestellungen/Einlösungen fließen automatisch ins Admin Panel.

### Neue Infrastruktur
- **Stripe** — Online-Zahlung (Checkout Redirect), Webhooks für automatische Zahlungsbestätigung
- **Resend** — Transaktionale E-Mails (Gutschein-Code, Terminbestätigung, PDF-Ticket)
- **Domain-E-Mail** — z.B. `hallo@genusswerte-bonn.de` bei all-inkl.com einrichten
- **Supabase Edge Functions** — Stripe-Webhook-Handler, E-Mail-Versand

### Tasting-Gutschein-Flow (V2)
```
Kunde kauft → Stripe Checkout → Webhook → Zahlung bestätigt
  → Gutschein-Code auto-generiert → E-Mail mit Code

Kunde löst ein → Code eingeben (RPC-Validierung)
  → Kalender mit vordefinierten Slots → Wunschtermine
  → redemption_request in Supabase

Admin bestätigt Termin → E-Mail auto-versendet (Resend)
  → PDF-Ticket als Anhang
```

### Genussbox-Flow (V2)
```
Kunde wählt Box + Variante
  → Abholung (kein Ort nötig) ODER Versand (vollständige Adresse)
  → Bestellung erscheint im Admin Panel
```

### Website-Formular-Integration
Website bleibt **Vanilla HTML/CSS/JS** auf all-inkl.com.
Supabase-Integration via `fetch()` REST API — kein Build-Tool nötig.
Anon-INSERT-Policies nur mit strikten `WITH CHECK`-Bedingungen.

### V2 Baureihenfolge
1. Domain-E-Mail anlegen (all-inkl.com)
2. Resend-Konto + DNS (SPF/DKIM)
3. Stripe-Konto (Test-Modus)
4. Edge Function: Stripe-Webhook → Zahlung bestätigen
5. Edge Function: Gutschein-Code-E-Mail senden
6. Supabase RPC: Öffentliche Voucher-Validierung
7. Anon-Policies: `redemption_requests` INSERT, Gift-Box-Orders INSERT
8. Öffentliche HTML-Seite: Gutschein einlösen (Code + Slot-Kalender + Datumsauswahl)
9. Öffentliche HTML-Seite: Genussbox bestellen
10. Edge Function: Bestätigungs-E-Mail + PDF-Ticket
11. Stripe Checkout-Integration auf Website

---

## Dateistruktur

```
src/
  components/
    layout/       AppLayout, Sidebar, ProtectedRoute
    shared/       PageHeader, StatusBadge, EmptyState, InternalNotes
  contexts/       AuthContext
  hooks/          useAuth, useOrders, useVouchers, useRedemptions, useCustomers
  lib/            supabase.ts, products.ts, utils.ts, whatsapp.ts, emailTemplates.ts
  pages/          Dashboard, Orders, OrderDetail, OrderNew,
                  Vouchers, VoucherDetail,
                  Redemptions, RedemptionNew, RedemptionDetail,
                  Customers, CustomerDetail, Login
  types/          database.ts
supabase/
  migrations/     001_enums.sql bis 006_rls.sql
```

---

## Coding-Regeln

- Supabase-Queries gehören in `hooks/` — nie direkt in Komponenten
- `total_amount` in Orders niemals direkt schreiben — Trigger übernimmt das
- Produktnamen und Varianten kommen aus `src/lib/products.ts` — nicht inline hard-coden
- V2-Features (Stripe, Resend, Edge Functions, PDF) nicht bauen bis explizit freigegeben
- UI-Sprache: Deutsch
- Keine unnötigen Abhängigkeiten hinzufügen
