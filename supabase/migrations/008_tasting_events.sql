-- ============================================================
-- 008_tasting_events.sql
-- Genusswerte Bonn — Tasting event management & capacity tracking
-- Requires: 001_enums.sql, 002_tables.sql, 003_triggers.sql, 006_rls.sql
-- ============================================================


-- ── New enums ─────────────────────────────────────────────────────────────────

CREATE TYPE booking_type AS ENUM (
  'voucher_redemption',  -- Einlösung eines Gutscheins (verknüpft mit voucher + redemption_request)
  'in_store'             -- Ladenverkauf / direkte Admin-Buchung aus eigenem Kontingent
);

CREATE TYPE booking_status AS ENUM (
  'confirmed',  -- Platz ist blockiert
  'cancelled'   -- Buchung storniert, Platz wieder frei
);

CREATE TYPE group_request_status AS ENUM (
  'new',        -- Neu eingegangen
  'reviewing',  -- In Prüfung
  'offer_sent', -- Angebot/Terminvorschlag gesendet
  'confirmed',  -- Termin bestätigt
  'rejected',   -- Abgelehnt
  'completed'   -- Abgeschlossen
);


-- ── tasting_events ────────────────────────────────────────────────────────────
-- Terminkalender. Jede Zeile = ein konkretes Tasting-Event.
-- tasting_name muss einem Wert aus dem Produktkatalog (TASTING_VOUCHERS) entsprechen.
-- Termine mit Buchungen können nicht gelöscht werden (RESTRICT via tasting_bookings FK).
-- Zum Sperren: is_open = false setzen.

CREATE TABLE tasting_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_name     TEXT        NOT NULL,
  event_date       DATE        NOT NULL,
  start_time       TIME        NOT NULL,
  own_quota        INT         NOT NULL DEFAULT 6 CHECK (own_quota >= 0),
  -- Eigenes Kontingent (Standard: 6). Admin kann manuell anpassen.
  franchise_quota  INT         NOT NULL DEFAULT 24,
  -- Franchise-Gesamtkontingent als Referenz (nie automatisch berechnet).
  franchise_booked INT         NOT NULL DEFAULT 0 CHECK (franchise_booked >= 0),
  -- Manuell eingetragen: wie viele Franchise-Plätze aktuell belegt sind.
  -- Abgeleitet (nicht gespeichert): franchise_available = franchise_quota - franchise_booked.
  is_open          BOOLEAN     NOT NULL DEFAULT true,
  -- false = keine neuen Buchungen möglich, Termin ist geschlossen.
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tasting_name, event_date, start_time)
);

CREATE TRIGGER trg_tasting_events_updated_at
BEFORE UPDATE ON tasting_events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── tasting_bookings ──────────────────────────────────────────────────────────
-- Kapazitäts-Tracker. Jede Zeile = belegte Plätze aus eigenem Kontingent.
-- Formel: own_available = own_quota - SUM(persons) WHERE status = 'confirmed'
-- ON DELETE RESTRICT auf tasting_event_id verhindert Löschen von Terminen mit Buchungen.

CREATE TABLE tasting_bookings (
  id                     UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_event_id       UUID           NOT NULL REFERENCES tasting_events(id) ON DELETE RESTRICT,
  voucher_id             UUID           REFERENCES vouchers(id) ON DELETE RESTRICT,
  -- NULL für in_store-Buchungen (kein Gutschein vorhanden).
  redemption_request_id  UUID           REFERENCES redemption_requests(id) ON DELETE SET NULL,
  -- Verknüpfung zum bestehenden Redemption-Workflow.
  booking_type           booking_type   NOT NULL,
  customer_name          TEXT           NOT NULL,
  customer_email         TEXT,
  customer_phone         TEXT,
  persons                INT            NOT NULL CHECK (persons > 0),
  status                 booking_status NOT NULL DEFAULT 'confirmed',
  notes                  TEXT,
  created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tasting_bookings_updated_at
BEFORE UPDATE ON tasting_bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── group_requests ────────────────────────────────────────────────────────────
-- Anfragen für Gruppen ab 7 Personen. Kein automatischer Buchungsfluss.
-- Wird manuell vom Admin geprüft und bearbeitet.

CREATE TABLE group_requests (
  id             UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_name   TEXT                 NOT NULL,
  customer_name  TEXT                 NOT NULL,
  customer_email TEXT                 NOT NULL,
  customer_phone TEXT,
  persons        INT                  NOT NULL CHECK (persons >= 7),
  desired_period TEXT,
  -- Freitext z.B. "April/Mai", "Sa nachmittags", "Ende Juni".
  occasion       TEXT,
  -- Freitext z.B. "Geburtstag", "Firmen-Event".
  message        TEXT,
  status         group_request_status NOT NULL DEFAULT 'new',
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ          NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_group_requests_updated_at
BEFORE UPDATE ON group_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── Extend redemption_requests ────────────────────────────────────────────────
-- Zwei neue nullable FK-Spalten — bestehende Einträge bleiben unberührt.
-- ON DELETE SET NULL: Termin/Buchung kann gelöscht werden ohne die Anfrage zu verlieren.

ALTER TABLE redemption_requests
  ADD COLUMN tasting_event_id   UUID REFERENCES tasting_events(id)   ON DELETE SET NULL,
  ADD COLUMN tasting_booking_id UUID REFERENCES tasting_bookings(id) ON DELETE SET NULL;


-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Nur authenticated (Admin). Keine anon-Policies — kommen erst mit öffentlichem Flow.

ALTER TABLE tasting_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasting_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_requests   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON tasting_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all" ON tasting_bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin_all" ON group_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
