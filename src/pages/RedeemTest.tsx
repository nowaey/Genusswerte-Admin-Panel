// Customer-facing voucher redemption simulation (admin test page).
// Simulates the flow a customer will go through on the public website.
// Uses admin auth context — no RPCs or anon policies needed for testing.
// Later: extract booking logic into SECURITY DEFINER RPCs for the public website.

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import type { Voucher, TastingEvent } from '@/types/database'

type Step = 'code' | 'events' | 'form' | 'success'

type EventWithAvailability = TastingEvent & {
  own_booked: number
  own_available: number
}

type BookingResult = {
  eventDate: string
  startTime: string
  tastingName: string
  code: string
}

const DE_DAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DE_DAY[d.getDay()]}., ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

export default function RedeemTest() {
  const [step, setStep]             = useState<Step>('code')
  const [codeInput, setCodeInput]   = useState('')
  const [codeError, setCodeError]   = useState<string | null>(null)
  const [checking, setChecking]     = useState(false)

  const [voucher, setVoucher]               = useState<Voucher | null>(null)
  const [events, setEvents]                 = useState<EventWithAvailability[]>([])
  const [selectedEvent, setSelectedEvent]   = useState<EventWithAvailability | null>(null)

  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [phone, setPhone]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [result, setResult] = useState<BookingResult | null>(null)

  async function checkCode() {
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    setChecking(true)
    setCodeError(null)

    const { data: v } = await supabase
      .from('vouchers')
      .select('*, orders(payment_status)')
      .eq('code', code)
      .single()

    setChecking(false)

    if (!v) { setCodeError('Gutschein-Code nicht gefunden.'); return }
    if ((v as any).orders?.payment_status !== 'paid') { setCodeError('Gutschein noch nicht aktiviert.'); return }
    if (v.status !== 'active') { setCodeError(`Dieser Gutschein kann nicht eingelöst werden (Status: ${v.status}).`); return }
    if (v.voucher_type !== 'tasting_voucher') { setCodeError('Dieser Gutschein ist kein Tasting-Gutschein.'); return }

    // Load available events for this tasting type
    const today = new Date().toISOString().slice(0, 10)
    const { data: rawEvents } = await supabase
      .from('tasting_events')
      .select('*, tasting_bookings(persons, status)')
      .eq('tasting_name', v.product_name)
      .eq('is_open', true)
      .gte('event_date', today)
      .order('event_date')
      .order('start_time')

    const enriched: EventWithAvailability[] = ((rawEvents ?? []) as any[]).map(e => {
      const own_booked = (e.tasting_bookings as { persons: number; status: string }[])
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.persons, 0)
      const { tasting_bookings: _, ...rest } = e
      return { ...rest, own_booked, own_available: e.own_quota - own_booked }
    }).filter(e => e.own_available >= (v.persons_allowed ?? 1))

    setVoucher(v)
    setEvents(enriched)
    setStep('events')
  }

  function selectEvent(ev: EventWithAvailability) {
    setSelectedEvent(ev)
    setStep('form')
  }

  async function submitBooking() {
    if (!voucher || !selectedEvent || !name) return
    setSubmitting(true)
    setSubmitError(null)

    const persons = voucher.persons_allowed ?? 1

    // Re-check capacity (client-side guard — public flow will use atomic RPC)
    const { data: fresh } = await supabase
      .from('tasting_events')
      .select('*, tasting_bookings(persons, status)')
      .eq('id', selectedEvent.id)
      .single()

    const booked = ((fresh as any)?.tasting_bookings ?? [])
      .filter((b: { status: string }) => b.status === 'confirmed')
      .reduce((s: number, b: { persons: number }) => s + b.persons, 0)
    const available = (fresh as any)?.own_quota - booked

    if (available < persons) {
      setSubmitError(`Leider sind nur noch ${available} Plätze frei. Bitte wähle einen anderen Termin.`)
      setSubmitting(false)
      return
    }

    // 1. Create tasting_booking
    const { data: booking, error: bErr } = await supabase
      .from('tasting_bookings')
      .insert({
        tasting_event_id: selectedEvent.id,
        voucher_id:       voucher.id,
        booking_type:     'voucher_redemption',
        customer_name:    name,
        customer_email:   email || null,
        customer_phone:   phone || null,
        persons,
        status:           'confirmed',
      })
      .select('id')
      .single()

    if (bErr || !booking) { setSubmitError(bErr?.message ?? 'Buchung fehlgeschlagen.'); setSubmitting(false); return }

    // 2. Create redemption_request (linked to booking)
    const { data: redemption, error: rErr } = await supabase
      .from('redemption_requests')
      .insert({
        voucher_id:         voucher.id,
        customer_name:      name,
        customer_email:     email || null,
        customer_phone:     phone || null,
        requested_persons:  persons,
        status:             'date_confirmed',
        confirmed_date:     `${selectedEvent.event_date}T${selectedEvent.start_time}`,
        tasting_event_id:   selectedEvent.id,
        tasting_booking_id: booking.id,
      })
      .select('id')
      .single()

    if (rErr || !redemption) { setSubmitError(rErr?.message ?? 'Anfrage fehlgeschlagen.'); setSubmitting(false); return }

    // 3. Link booking → redemption_request + update voucher
    await Promise.all([
      supabase.from('tasting_bookings')
        .update({ redemption_request_id: redemption.id })
        .eq('id', booking.id),
      supabase.from('vouchers')
        .update({ status: 'date_confirmed' })
        .eq('id', voucher.id),
    ])

    setResult({
      eventDate:   selectedEvent.event_date,
      startTime:   selectedEvent.start_time,
      tastingName: selectedEvent.tasting_name,
      code:        voucher.code ?? '',
    })
    setSubmitting(false)
    setStep('success')
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Gutschein einlösen"
        subtitle="Kunden-Simulation (Admin-Test)"
        back
      />

      {/* Step 1: Code */}
      {step === 'code' && (
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <p className="text-sm text-muted-foreground">Gutschein-Code eingeben um verfügbare Termine zu sehen.</p>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkCode()}
              placeholder="GW-WT-XXXXXXXX"
              className="flex-1 border border-input rounded-md px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={checkCode}
              disabled={checking || !codeInput.trim()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {checking ? '...' : 'Prüfen'}
            </button>
          </div>
          {codeError && <p className="text-sm text-destructive">{codeError}</p>}
        </div>
      )}

      {/* Step 2: Event selection */}
      {step === 'events' && voucher && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-green-800">{voucher.product_name}</p>
            <p className="text-xs text-green-700 mt-0.5">
              {voucher.variant} · {voucher.persons_allowed} Person(en)
            </p>
          </div>

          <h2 className="text-sm font-medium">Verfügbare Termine wählen</h2>

          {events.length === 0 ? (
            <div className="bg-white rounded-lg border border-border p-6 text-sm text-muted-foreground">
              Derzeit keine freien Termine verfügbar. Bitte später erneut versuchen.
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(e => (
                <button
                  key={e.id}
                  onClick={() => selectEvent(e)}
                  className="w-full bg-white rounded-lg border border-border px-4 py-4 text-left hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">
                        {fmtDate(e.event_date)} · {e.start_time.slice(0, 5)} Uhr
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.own_available} Platz{e.own_available !== 1 ? 'e' : ''} verfügbar
                      </p>
                    </div>
                    <span className="text-primary text-sm">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => { setStep('code'); setVoucher(null); setEvents([]) }}
            className="text-xs text-muted-foreground hover:underline">
            ← Anderen Code eingeben
          </button>
        </div>
      )}

      {/* Step 3: Contact form */}
      {step === 'form' && voucher && selectedEvent && (
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
            <p className="text-sm font-medium">{selectedEvent.tasting_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmtDate(selectedEvent.event_date)} · {selectedEvent.start_time.slice(0, 5)} Uhr
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-sm font-medium">Ihre Kontaktdaten</h2>

            <Field label="Name *">
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Max Mustermann" className={inp} />
            </Field>
            <Field label="E-Mail">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="max@beispiel.de" className={inp} />
            </Field>
            <Field label="Telefon">
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+49 …" className={inp} />
            </Field>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}

            <button
              onClick={submitBooking}
              disabled={submitting || !name}
              className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Buchung wird bestätigt...' : 'Termin verbindlich buchen'}
            </button>
          </div>

          <button onClick={() => setStep('events')}
            className="text-xs text-muted-foreground hover:underline">
            ← Anderen Termin wählen
          </button>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 'success' && result && (
        <div className="bg-white rounded-lg border border-green-200 p-6 space-y-4">
          <div className="text-center">
            <div className="text-3xl mb-3">✓</div>
            <h2 className="text-base font-semibold">Buchung bestätigt!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {result.tastingName}<br />
              {fmtDate(result.eventDate)} · {result.startTime.slice(0, 5)} Uhr
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-3">Code: {result.code}</p>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Eine Bestätigungs-E-Mail wird nach Website-Integration automatisch versendet.
          </p>
          <button
            onClick={() => { setStep('code'); setCodeInput(''); setVoucher(null); setSelectedEvent(null); setName(''); setEmail(''); setPhone(''); setResult(null) }}
            className="w-full border border-border px-4 py-2 rounded-md text-sm hover:bg-muted transition-colors"
          >
            Weiteren Gutschein einlösen
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'
