import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useRedemptions } from '@/hooks/useRedemptions'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'

export default function Redemptions() {
  const { redemptions, loading } = useRedemptions()
  const navigate = useNavigate()

  return (
    <div>
      <PageHeader
        title="Einlösungsanfragen"
        action={
          <button
            onClick={() => navigate('/redemptions/new')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Anfrage erfassen
          </button>
        }
      />

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6">Laden...</p>
        ) : redemptions.length === 0 ? (
          <EmptyState title="Keine Einlösungsanfragen" description="Anfragen werden hier angezeigt sobald Kunden Termine anfragen" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gutschein</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tasting</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kunde</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Personen</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {redemptions.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/redemptions/${r.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs">{r.vouchers?.code ?? '—'}</td>
                  <td className="px-4 py-3">{r.vouchers?.product_name ?? '—'}</td>
                  <td className="px-4 py-3">{r.customer_name}</td>
                  <td className="px-4 py-3">{r.requested_persons}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
