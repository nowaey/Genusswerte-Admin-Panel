import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVouchers } from '@/hooks/useVouchers'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import type { VoucherStatus } from '@/types/database'

export default function Vouchers() {
  const { vouchers, loading } = useVouchers()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<VoucherStatus | ''>('')
  const [filterType, setFilterType] = useState<'tasting_voucher' | 'value_voucher' | ''>('')

  const filtered = vouchers.filter(v => {
    if (filterStatus && v.status !== filterStatus) return false
    if (filterType && v.voucher_type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      const codeMatch = (v.code ?? '').toLowerCase().includes(q)
      const nameMatch = v.product_name.toLowerCase().includes(q)
      if (!codeMatch && !nameMatch) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader title="Gutscheine" />

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Code oder Produkt suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring w-52"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as VoucherStatus | '')}
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Alle Status</option>
          <option value="pending">Ausstehend</option>
          <option value="active">Aktiv</option>
          <option value="redemption_requested">Einlösung angefragt</option>
          <option value="date_confirmed">Termin bestätigt</option>
          <option value="redeemed">Eingelöst</option>
          <option value="expired">Abgelaufen</option>
          <option value="cancelled">Storniert</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as 'tasting_voucher' | 'value_voucher' | '')}
          className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Alle Typen</option>
          <option value="tasting_voucher">Tasting-Gutschein</option>
          <option value="value_voucher">Wertgutschein</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {loading ? (
          <p className="text-sm text-muted-foreground p-6">Laden...</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Keine Gutscheine" description="Filter anpassen" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produkt</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Variante</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gültig bis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(v => (
                <tr
                  key={v.id}
                  onClick={() => navigate(`/vouchers/${v.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {v.code ?? <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className="px-4 py-3">{v.product_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.variant ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {v.valid_until ? new Date(v.valid_until).toLocaleDateString('de-DE') : '—'}
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
