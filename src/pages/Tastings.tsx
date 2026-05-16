import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTastings } from '@/hooks/useTastings'
import { TASTING_VOUCHERS } from '@/lib/products'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'

export default function Tastings() {
  const { events, loading } = useTastings()
  const navigate = useNavigate()
  const [filterName, setFilterName] = useState('')
  const [filterOpen, setFilterOpen] = useState<'all' | 'open' | 'closed'>('all')
  const [filterPeriod, setFilterPeriod] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  const today = new Date().toISOString().slice(0, 10)

  const filtered = events.filter(e => {
    if (filterName && e.tasting_name !== filterName) return false
    if (filterOpen === 'open' && !e.is_open) return false
    if (filterOpen === 'closed' && e.is_open) return false
    if (filterPeriod === 'upcoming' && e.event_date < today) return false
    if (filterPeriod === 'past' && e.event_date >= today) return false
    return true
  })

  return (
    <div>
      <PageHeader
        title="Termine"
        action={
          <button
            onClick={() => navigate('/tastings/new')}
            className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Neuer Termin
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          className={sel}
        >
          <option value="">Alle Tastings</option>
          {TASTING_VOUCHERS.map(t => <option key={t.code} value={t.name}>{t.name}</option>)}
        </select>
        <select
          value={filterPeriod}
          onChange={e => setFilterPeriod(e.target.value as 'upcoming' | 'past' | 'all')}
          className={sel}
        >
          <option value="upcoming">Bevorstehend</option>
          <option value="past">Vergangen</option>
          <option value="all">Alle</option>
        </select>
        <select
          value={filterOpen}
          onChange={e => setFilterOpen(e.target.value as 'all' | 'open' | 'closed')}
          className={sel}
        >
          <option value="all">Offen & Geschlossen</option>
          <option value="open">Nur offen</option>
          <option value="closed">Nur geschlossen</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6">Laden...</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Keine Termine" description="Filter anpassen oder neuen Termin anlegen" />
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
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/tastings/${e.id}`)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 tabular-nums">
                      {new Date(e.event_date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      <span className="text-muted-foreground ml-2">{e.start_time.slice(0, 5)} Uhr</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{e.tasting_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
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
                        e.is_open
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-muted text-muted-foreground border-border'
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
