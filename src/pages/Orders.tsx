import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useOrders } from '@/hooks/useOrders'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { ORDER_TYPE_LABELS } from '@/lib/products'
import type { PaymentStatus, OrderType } from '@/types/database'

export default function Orders() {
  const { orders, loading } = useOrders()
  const navigate = useNavigate()
  const [filterPayment, setFilterPayment] = useState<PaymentStatus | ''>('')
  const [filterType, setFilterType] = useState<OrderType | ''>('')
  const [search, setSearch] = useState('')

  const filtered = orders.filter(o => {
    if (filterPayment && o.payment_status !== filterPayment) return false
    if (filterType && o.order_type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = o.customers?.name.toLowerCase().includes(q)
      const refMatch = (o.internal_ref ?? '').toLowerCase().includes(q)
      if (!nameMatch && !refMatch) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title="Bestellungen"
        action={
          <button
            onClick={() => navigate('/orders/new')}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Neue Bestellung
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Kunde oder Ref suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring w-52"
        />
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value as PaymentStatus | '')}
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Alle Zahlungen</option>
          <option value="open">Offen</option>
          <option value="paid">Bezahlt</option>
          <option value="cancelled">Storniert</option>
          <option value="refunded">Erstattet</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as OrderType | '')}
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Alle Typen</option>
          <option value="tasting_voucher">Tasting-Gutschein</option>
          <option value="value_voucher">Wertgutschein</option>
          <option value="gift_box">Genussbox</option>
          <option value="mixed">Gemischt</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6">Laden...</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Keine Bestellungen" description="Filter anpassen oder neue Bestellung anlegen" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ref</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kunde</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Typ</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Betrag</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zahlung</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(o => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {o.internal_ref ?? o.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 font-medium">{o.customers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ORDER_TYPE_LABELS[o.order_type]}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{o.total_amount.toFixed(2)} €</td>
                  <td className="px-4 py-3"><StatusBadge status={o.payment_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
