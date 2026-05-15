import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRedemptionDetail } from '@/hooks/useRedemptions'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import InternalNotes from '@/components/shared/InternalNotes'
import { scheduleForTasting } from '@/lib/products'
import type { RedemptionStatus } from '@/types/database'

export default function RedemptionDetail() {
  const { id } = useParams<{ id: string }>()
  const { redemption, loading, reload } = useRedemptionDetail(id)
  const [confirmedDate, setConfirmedDate] = useState('')
  const [confirmedTime, setConfirmedTime] = useState('')
  const [showConfirmForm, setShowConfirmForm] = useState(false)
  const [saving, setSaving] = useState(false)

  if (loading) return <p className="text-sm text-muted-foreground p-6">Laden...</p>
  if (!redemption) return <p className="text-sm text-destructive p-6">Einlösungsanfrage nicht gefunden.</p>

  const v = redemption.vouchers

  async function setStatus(status: RedemptionStatus, extra?: Record<string, unknown>) {
    setSaving(true)
    await supabase.from('redemption_requests').update({ status, ...extra }).eq('id', redemption!.id)
    if (status === 'date_confirmed' && v) {
      await supabase.from('vouchers').update({ status: 'date_confirmed' }).eq('id', v.id)
    }
    setSaving(false)
    reload()
  }

  async function confirmDate() {
    if (!confirmedDate) return
    const dt = confirmedTime ? `${confirmedDate}T${confirmedTime}:00` : `${confirmedDate}T00:00:00`
    await setStatus('date_confirmed', { confirmed_date: dt })
    setShowConfirmForm(false)
  }

  const schedule = v ? scheduleForTasting(v.product_name) : ''

  // WhatsApp helper
  function buildWhatsApp() {
    const phone = (redemption!.customer_phone ?? '').replace(/[^0-9]/g, '')
    if (!phone) return null
    const dateStr = redemption!.confirmed_date
      ? new Date(redemption!.confirmed_date).toLocaleString('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' Uhr'
      : '(Termin)'
    const msg = `Hallo ${redemption!.customer_name},\n\nwir freuen uns, deinen Termin für das ${v?.product_name ?? 'Tasting'} (${redemption!.requested_persons} Person(en)) zu bestätigen:\n\n📅 ${dateStr}\n📍 Genusswerte Bonn, Clemens-August-Str. 52, 53115 Bonn\n\nDein Gutschein-Code: ${v?.code ?? '—'}\n\nBis dann!\nDein Genusswerte-Team`
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  // Email helper
  function buildEmail() {
    const dateStr = redemption!.confirmed_date
      ? new Date(redemption!.confirmed_date).toLocaleString('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) + ' Uhr'
      : '(Termin noch offen)'
    return {
      subject: `Terminbestätigung: ${v?.product_name ?? 'Tasting'} – Genusswerte Bonn`,
      body: `Hallo ${redemption!.customer_name},\n\nhiermit bestätigen wir deinen Termin:\n\nTasting: ${v?.product_name ?? '—'}\nVariante: ${v?.variant ?? '—'}\nPersonen: ${redemption!.requested_persons}\nTermin: ${dateStr}\nOrt: Genusswerte Bonn, Clemens-August-Str. 52, 53115 Bonn\nDein Gutschein-Code: ${v?.code ?? '—'}\n\nBei Fragen melde dich gerne jederzeit.\n\nHerzliche Grüße\nDein Genusswerte-Team`,
    }
  }

  const waLink = buildWhatsApp()
  const email = buildEmail()

  const preferredDates = [
    redemption.preferred_date_1 && { date: redemption.preferred_date_1, time: redemption.preferred_time_1 },
    redemption.preferred_date_2 && { date: redemption.preferred_date_2, time: redemption.preferred_time_2 },
    redemption.preferred_date_3 && { date: redemption.preferred_date_3, time: redemption.preferred_time_3 },
  ].filter(Boolean) as { date: string; time: string | null }[]

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={`Einlösung: ${v?.product_name ?? '—'}`}
        subtitle={`${redemption.customer_name} · ${redemption.requested_persons} Person(en)`}
        back
      />

      {/* Status + voucher */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={redemption.status} />
          {v && (
            <Link to={`/vouchers/${v.id}`} className="font-mono text-xs text-primary hover:underline">
              {v.code ?? 'Gutschein'}
            </Link>
          )}
        </div>

        {redemption.confirmed_date && (
          <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            Bestätigter Termin: {new Date(redemption.confirmed_date).toLocaleString('de-DE', {
              weekday:'long', day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
            })} Uhr
          </p>
        )}

        {/* Status actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['pending','under_review'].includes(redemption.status) && (
            <button
              onClick={() => setShowConfirmForm(v => !v)}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Termin bestätigen
            </button>
          )}
          {redemption.status === 'pending' && (
            <ActionBtn onClick={() => setStatus('under_review')}>In Prüfung setzen</ActionBtn>
          )}
          {['pending','under_review'].includes(redemption.status) && (
            <ActionBtn onClick={() => setStatus('alternative_proposed')}>Alternative vorschlagen</ActionBtn>
          )}
          {redemption.status === 'date_confirmed' && (
            <ActionBtn onClick={() => setStatus('completed')}>Als erledigt markieren</ActionBtn>
          )}
          {!['completed','rejected'].includes(redemption.status) && (
            <ActionBtn onClick={() => setStatus('rejected')} variant="danger">Ablehnen</ActionBtn>
          )}
        </div>

        {/* Confirm date form */}
        {showConfirmForm && (
          <div className="mt-4 p-4 bg-muted/40 rounded-md space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Bestätigten Termin eingeben</p>
            <div className="flex gap-3">
              <input type="date" value={confirmedDate} onChange={e => setConfirmedDate(e.target.value)}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="time" value={confirmedTime} onChange={e => setConfirmedTime(e.target.value)}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={confirmDate} disabled={!confirmedDate || saving}
                className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                Bestätigen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer + preferred dates */}
      <div className="bg-white rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-sm font-medium">Kundendaten & Wunschtermine</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <InfoRow label="Name">{redemption.customer_name}</InfoRow>
          <InfoRow label="Personen">{redemption.requested_persons}</InfoRow>
          {redemption.customer_email && <InfoRow label="E-Mail">{redemption.customer_email}</InfoRow>}
          {redemption.customer_phone && <InfoRow label="Telefon">{redemption.customer_phone}</InfoRow>}
        </dl>

        {preferredDates.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Wunschtermine</p>
            <ol className="space-y-1">
              {preferredDates.map((d, i) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{new Date(d.date).toLocaleDateString('de-DE', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' })}</span>
                  {d.time && <span className="text-muted-foreground">{d.time} Uhr</span>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {redemption.message && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Nachricht</p>
            <p className="text-sm bg-muted/40 rounded px-3 py-2">{redemption.message}</p>
          </div>
        )}
      </div>

      {/* Tasting schedule reference */}
      {schedule && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-medium text-amber-800 mb-1">Interner Terminplan — {v?.product_name}</p>
          <p className="text-sm text-amber-700">{schedule}</p>
          <p className="text-xs text-amber-600 mt-1">Nur zur internen Orientierung. Admin entscheidet manuell.</p>
        </div>
      )}

      {/* Communication */}
      <div className="bg-white rounded-lg border border-border p-6 space-y-3">
        <h2 className="text-sm font-medium">Kommunikation vorbereiten</h2>
        <div className="flex gap-2 flex-wrap">
          {waLink && (
            <a href={waLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
              WhatsApp öffnen
            </a>
          )}
          {!waLink && <p className="text-xs text-muted-foreground">Keine Telefonnummer hinterlegt für WhatsApp.</p>}
        </div>

        <details className="mt-2">
          <summary className="text-sm cursor-pointer text-primary hover:underline">E-Mail-Text anzeigen</summary>
          <div className="mt-3 bg-muted/40 rounded-md p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Betreff</p>
            <p className="text-sm font-medium">{email.subject}</p>
            <p className="text-xs font-medium text-muted-foreground mt-3">Text (kopieren)</p>
            <pre className="text-sm whitespace-pre-wrap font-sans">{email.body}</pre>
            <button
              onClick={() => navigator.clipboard.writeText(email.body)}
              className="mt-2 px-3 py-1.5 border border-border rounded-md text-xs hover:bg-muted transition-colors"
            >
              Text kopieren
            </button>
          </div>
        </details>
      </div>

      <InternalNotes redemptionRequestId={id} />
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-sm">{children}</dd>
    </div>
  )
}

function ActionBtn({ onClick, children, variant = 'default' }: {
  onClick: () => void; children: React.ReactNode; variant?: 'default' | 'danger'
}) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
      variant === 'danger' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-border hover:bg-muted'
    }`}>{children}</button>
  )
}
