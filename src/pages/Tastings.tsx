import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTastings } from '@/hooks/useTastings'
import { TASTING_VOUCHERS } from '@/lib/products'
import { generateEvents, countByTasting, SCHEDULE_RULES } from '@/lib/schedule'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'

type Period = 3 | 6 | 12

export default function Tastings() {
  const { events, loading, reload } = useTastings()
  const navigate = useNavigate()
  const [filterName, setFilterName]   = useState('')
  const [filterOpen, setFilterOpen]   = useState<'all' | 'open' | 'closed'>('all')
  const [filterPeriod, setFilterPeriod] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  // Generation state
  const [showGen, setShowGen]         = useState(false)
  const [genMonths, setGenMonths]     = useState<Period>(3)
  const [generating, setGenerating]   = useState(false)
  const [genResult, setGenResult]     = useState<{ inserted: number; skipped: number } | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const filtered = events.filter(e => {
    if (filterName && e.tasting_name !== filterName) return false
    if (filterOpen === 'open' && !e.is_open) return false
    if (filterOpen === 'closed' && e.is_open) return false
    if (filterPeriod === 'upcoming' && e.event_date < today) return false
    if (filterPeriod === 'past' && e.event_date >= today) return false
    return true
  })

  // Preview: compute events to be generated
  const preview = generateEvents(genMonths)
  const previewCounts = countByTasting(preview)

  async function runGeneration() {
    setGenerating(true)
    setGenResult(null)

    // Upsert with ignoreDuplicates — UNIQUE(tasting_name, event_date, start_time)
    const { data, error } = await supabase
      .from('tasting_events')
      .upsert(preview, { onConflict: 'tasting_name,event_date,start_time', ignoreDuplicates: true })
      .select('id')

    setGenerating(false)
    if (error) { alert(`Fehler: ${error.message}`); return }

    const inserted = data?.length ?? 0
    const skipped  = preview.length - inserted
    setGenResult({ inserted, skipped })
    reload()
  }

  return (
    <div>
      <PageHeader
        title="Termine"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => { setShowGen(v => !v); setGenResult(null) }}
              className="border border-border px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              Termine generieren
            </button>
            <button
              onClick={() => navigate('/tastings/new')}
              className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              + Einzelner Termin
            </button>
          </div>
        }
      />

      {/* Generation panel */}
      {showGen && (
        <div className="bg-white rounded-lg border border-border p-6 mb-4 space-y-4">
          <h2 className="text-sm font-medium">Termine automatisch generieren</h2>
          <p className="text-xs text-muted-foreground">
            Erstellt Termine nach festem Regelplan. Bereits vorhandene Termine werden übersprungen.
          </p>

          <div className="flex gap-2">
            {([3, 6, 12] as Period[]).map(m => (
              <button
                key={m}
                onClick={() => { setGenMonths(m); setGenResult(null) }}
                className={`px-4 py-2 rounded-md text-sm border transition-colors ${
                  genMonths === m
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {m} Monate
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="bg-muted/40 rounded-md p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Vorschau — {preview.length} Termine werden angelegt (oder übersprungen wenn bereits vorhanden)
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              {SCHEDULE_RULES.map(r => (
                <div key={r.tastingName} className="flex justify-between">
                  <span className="text-muted-foreground truncate mr-2">{r.tastingName}</span>
                  <span className="tabular-nums font-medium">{previewCounts[r.tastingName] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          {genResult && (
            <div className="text-sm bg-green-50 border border-green-200 text-green-800 rounded px-4 py-3">
              {genResult.inserted} Termine angelegt
              {genResult.skipped > 0 && ` · ${genResult.skipped} bereits vorhanden (übersprungen)`}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={runGeneration}
              disabled={generating}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generiere...' : `${preview.length} Termine generieren`}
            </button>
            <button
              onClick={() => setShowGen(false)}
              className="px-4 py-2 rounded-md text-sm border border-border hover:bg-muted transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filterName} onChange={e => setFilterName(e.target.value)} className={sel}>
          <option value="">Alle Tastings</option>
          {TASTING_VOUCHERS.map(t => <option key={t.code} value={t.name}>{t.name}</option>)}
        </select>
        <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value as 'upcoming' | 'past' | 'all')} className={sel}>
          <option value="upcoming">Bevorstehend</option>
          <option value="past">Vergangen</option>
          <option value="all">Alle</option>
        </select>
        <select value={filterOpen} onChange={e => setFilterOpen(e.target.value as 'all' | 'open' | 'closed')} className={sel}>
          <option value="all">Offen & Geschlossen</option>
          <option value="open">Nur offen</option>
          <option value="closed">Nur geschlossen</option>
        </select>
      </div>

      {/* Events table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6">Laden...</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Keine Termine" description="Filter anpassen oder Termine generieren" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tasting</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Eigene Plätze</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Franchise</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(e => {
                const pct = e.own_quota > 0 ? (e.own_booked / e.own_quota) * 100 : 0
                const barColor = pct >= 100 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'
                return (
                  <tr key={e.id} onClick={() => navigate(`/tastings/${e.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 tabular-nums">
                      {new Date(e.event_date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <span className="text-muted-foreground ml-2">{e.start_time.slice(0, 5)} Uhr</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{e.tasting_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={e.own_available <= 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                          {e.own_available} / {e.own_quota} frei
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {e.franchise_booked} / {e.franchise_quota}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${
                        e.is_open ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {e.is_open ? 'Offen' : 'Geschlossen'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const sel = 'border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'
