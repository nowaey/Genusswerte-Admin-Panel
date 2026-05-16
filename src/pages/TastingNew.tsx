import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { TASTING_VOUCHERS, scheduleForTasting } from '@/lib/products'
import PageHeader from '@/components/shared/PageHeader'

export default function TastingNew() {
  const navigate = useNavigate()
  const [tastingName, setTastingName] = useState('')
  const [eventDate, setEventDate]     = useState('')
  const [startTime, setStartTime]     = useState('')
  const [ownQuota, setOwnQuota]       = useState(6)
  const [franchiseQuota, setFranchiseQuota] = useState(24)
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const schedule = tastingName ? scheduleForTasting(tastingName) : ''

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!tastingName || !eventDate || !startTime) {
      setError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }
    setSaving(true)
    const { data, error: dbErr } = await supabase
      .from('tasting_events')
      .insert({
        tasting_name: tastingName,
        event_date:   eventDate,
        start_time:   startTime,
        own_quota:    ownQuota,
        franchise_quota: franchiseQuota,
        notes:        notes || null,
      })
      .select('id')
      .single()
    setSaving(false)
    if (dbErr || !data) { setError(dbErr?.message ?? 'Fehler beim Speichern'); return }
    navigate(`/tastings/${data.id}`)
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="Neuer Termin" back />

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 space-y-4">

        <Field label="Tasting *">
          <select
            value={tastingName}
            onChange={e => setTastingName(e.target.value)}
            className={sel}
            required
          >
            <option value="">— wählen —</option>
            {TASTING_VOUCHERS.map(t => <option key={t.code} value={t.name}>{t.name}</option>)}
          </select>
          {schedule && (
            <p className="text-xs text-muted-foreground mt-1">Reguläre Slots: {schedule}</p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Datum *">
            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
              className={inp} required />
          </Field>
          <Field label="Uhrzeit *">
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className={inp} required />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Eigenes Kontingent">
            <input type="number" min={0} value={ownQuota}
              onChange={e => setOwnQuota(Math.max(0, parseInt(e.target.value) || 0))}
              className={inp} />
          </Field>
          <Field label="Franchise-Kontingent (Referenz)">
            <input type="number" min={0} value={franchiseQuota}
              onChange={e => setFranchiseQuota(Math.max(0, parseInt(e.target.value) || 0))}
              className={inp} />
          </Field>
        </div>

        <Field label="Notizen (intern)">
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inp} />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {saving ? 'Speichern...' : 'Termin anlegen'}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md text-sm border border-border hover:bg-muted transition-colors">
            Abbrechen
          </button>
        </div>
      </form>
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
const sel = inp
