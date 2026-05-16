import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useGroupRequests } from '@/hooks/useGroupRequests'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import type { GroupRequestStatus } from '@/types/database'

export default function GroupRequests() {
  const { requests, loading } = useGroupRequests()
  const navigate = useNavigate()
  const [filterStatus, setFilterStatus] = useState<GroupRequestStatus | ''>('')

  const filtered = requests.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      <PageHeader title="Gruppenanfragen" subtitle="Anfragen ab 7 Personen" />

      <div className="flex gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as GroupRequestStatus | '')}
          className={sel}
        >
          <option value="">Alle Status</option>
          <option value="new">Neu</option>
          <option value="reviewing">In Prüfung</option>
          <option value="offer_sent">Angebot gesendet</option>
          <option value="confirmed">Bestätigt</option>
          <option value="rejected">Abgelehnt</option>
          <option value="completed">Abgeschlossen</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6">Laden...</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Keine Gruppenanfragen" description="Filter anpassen" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Eingegangen</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tasting</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kunde</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Personen</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/group-requests/${r.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {new Date(r.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3">{r.tasting_name}</td>
                  <td className="px-4 py-3 font-medium">{r.customer_name}</td>
                  <td className="px-4 py-3">{r.persons}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const sel = 'border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'
