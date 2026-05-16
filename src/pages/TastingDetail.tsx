import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTastingDetail } from '@/hooks/useTastings'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'

export default function TastingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { event, loading, reload } = useTastingDetail(id)

  // Inline-Edit state
  const [editQuota, setEditQuota]             = useState<number | null>(null)
  const [editFranchiseBooked, setEditFranchiseBooked] = useState<number | null>(null)
  const [savingMeta, setSavingMeta]           = useState(false)

  // In-store booking form
  const [showInStore, setShowInStore]         = useState(false)
  const [inStoreName, setInStoreName]         = useState('')
  const [inStorePersons, setInStorePersons]   = useState(1)
  const [inStoreNotes, setInStoreNotes]       = useState('')
  const [savingBooking, setSavingBooking]     = useState(false)
  const [bookingError, setBookingError]       = useState<string | null>(null)

  if (loading) return <p className="text-sm text-muted-foreground p-6">Laden...</p>
  if (!event)  return <p className="text-sm text-destructive p-6">Termin nicht gefunden.</p>

  const canDelete = event.tasting_bookings.length === 0

  async function toggleOpen() {
    await supabase.from('tasting_events').update({ is_open: !event!.is_open }).eq('id', event!.id)
    reload()
  }

  async function saveQuota() {
    setSavingMeta(true)
    const patch: Record<string, number> = {}
    if (editQuota !== null)           patch.own_quota = editQuota
    if (editFranchiseBooked !== null) patch.franchise_booked = editFranchiseBooked
    await supabase.from('tasting_events').update(patch).eq('id', event!.id)
    setEditQuota(null)
    setEditFranchiseBooked(null)
    setSavingMeta(false)
    reload()
  }

  async function cancelBooking(bookingId: string) {
    await supabase.from('tasting_bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    reload()
  }

  async function addInStoreBooking() {
    setBookingError(null)
    if (!inStoreName) { setBookingError('Kundenname erforderlich'); return }
    if (inStorePersons > event!.own_available) {
      setBookingError(`Nur ${event!.own_available} Platz/Plätze verfügbar`)
      return
    }
    setSavingBooking(true)
    const { error } = await supabase.from('tasting_bookings').insert({
      tasting_event_id: event!.id,
      booking_type:     'in_store',
      customer_name:    inStoreName,
      persons:          inStorePersons,
      notes:            inStoreNotes || null,
    })
    setSavingBooking(false)
    if (error) { setBookingError(error.message); return }
    setShowInStore(false)
    setInStoreName('')
    setInStorePersons(1)
    setInStoreNotes('')
    reload()
  }

  async function deleteEvent() {
    if (!canDelete) return
    if (!window.confirm('Termin wirklich löschen?')) return
    await supabase.from('tasting_events').delete().eq('id', event!.id)
    navigate('/tastings')
  }

  const ownPct = event.own_quota > 0 ? (event.own_booked / event.own_quota) * 100 : 0
  const franchiseAvailable = event.franchise_quota - event.franchise_booked

  const isEditing = editQuota !== null || editFranchiseBooked !== null

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={event.tasting_name}
        subtitle={`${new Date(event.event_date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · ${event.start_time.slice(0, 5)} Uhr`}
        back
        action={
          <div className="flex gap-2">
            <button
              onClick={toggleOpen}
              className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                event.is_open
                  ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                  : 'border-green-200 text-green-700 hover:bg-green-50'
              }`}
            >
              {event.is_open ? 'Schließen' : 'Öffnen'}
            </button>
            {canDelete && (
              <button onClick={deleteEvent}
                className="px-3 py-2 rounded-md text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                Löschen
              </button>
            )}
          </div>
        }
      />

      {/* Kapazitäts-Übersicht */}
      <div className="bg-white rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Kapazität</h2>
          {!isEditing && (
            <button
              onClick={() => { setEditQuota(event.own_quota); setEditFranchiseBooked(event.franchise_booked) }}
              className="text-xs text-primary hover:underline"
            >
              Bearbeiten
            </button>
          )}
        </div>

        {/* Eigenes Kontingent */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Eigene Plätze</span>
            <span className={`font-medium ${event.own_available <= 0 ? 'text-red-600' : 'text-foreground'}`}>
              {event.own_booked} belegt · <span className={event.own_available <= 0 ? 'text-red-600' : 'text-green-700'}>{event.own_available} frei</span>
              {' '}/ {editQuota !== null
                ? <input type="number" min={0} value={editQuota}
                    onChange={e => setEditQuota(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 border border-input rounded px-1 text-sm" />
                : event.own_quota}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${ownPct >= 100 ? 'bg-red-500' : ownPct >= 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(ownPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Franchise-Referenz */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Franchise (Referenz)</span>
            <span className="text-muted-foreground">
              {editFranchiseBooked !== null
                ? <input type="number" min={0} value={editFranchiseBooked}
                    onChange={e => setEditFranchiseBooked(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 border border-input rounded px-1 text-sm" />
                : event.franchise_booked} belegt · {franchiseAvailable} frei / {event.franchise_quota}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Nicht synchronisiert — manuell eingetragen</p>
        </div>

        {isEditing && (
          <div className="flex gap-2">
            <button onClick={saveQuota} disabled={savingMeta}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {savingMeta ? 'Speichern...' : 'Speichern'}
            </button>
            <button onClick={() => { setEditQuota(null); setEditFranchiseBooked(null) }}
              className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors">
              Abbrechen
            </button>
          </div>
        )}

        {event.notes && (
          <p className="text-sm text-muted-foreground bg-muted/40 rounded px-3 py-2">{event.notes}</p>
        )}
      </div>

      {/* Buchungen */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium">Buchungen ({event.tasting_bookings.length})</h2>
          <button
            onClick={() => setShowInStore(v => !v)}
            disabled={!event.is_open || event.own_available <= 0}
            className="text-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline"
          >
            + Ladenverkauf erfassen
          </button>
        </div>

        {showInStore && (
          <div className="px-6 py-4 bg-muted/30 border-b border-border space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Ladenverkauf — eigenes Kontingent</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Kundenname *</label>
                <input type="text" value={inStoreName} onChange={e => setInStoreName(e.target.value)}
                  placeholder="Max Mustermann" className={inp} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Personen (max. {event.own_available})</label>
                <input type="number" min={1} max={event.own_available} value={inStorePersons}
                  onChange={e => setInStorePersons(Math.max(1, parseInt(e.target.value) || 1))}
                  className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Notiz</label>
              <input type="text" value={inStoreNotes} onChange={e => setInStoreNotes(e.target.value)}
                placeholder="z.B. bar bezahlt" className={inp} />
            </div>
            {bookingError && <p className="text-xs text-destructive">{bookingError}</p>}
            <div className="flex gap-2">
              <button onClick={addInStoreBooking} disabled={savingBooking}
                className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {savingBooking ? 'Speichern...' : 'Buchung hinzufügen'}
              </button>
              <button onClick={() => setShowInStore(false)}
                className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {event.tasting_bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">Noch keine Buchungen.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Typ</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kunde</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Personen</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {event.tasting_bookings.map(b => (
                <tr key={b.id}>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.booking_type === 'voucher_redemption' ? 'Gutschein' : 'Ladenverkauf'}
                  </td>
                  <td className="px-4 py-3 font-medium">{b.customer_name}</td>
                  <td className="px-4 py-3">{b.persons}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => cancelBooking(b.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Stornieren
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Verknüpfte Einlösungsanfragen */}
      {event.linked_redemptions.length > 0 && (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium">Einlösungsanfragen ({event.linked_redemptions.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kunde</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Personen</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {event.linked_redemptions.map(r => (
                <tr key={r.id}
                  onClick={() => navigate(`/redemptions/${r.id}`)}
                  className="hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                  <td className="px-4 py-3">{r.requested_persons}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const inp = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'
