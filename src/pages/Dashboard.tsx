import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { RevenueSummary, RevenueByCategory, OrderWithCustomer } from '@/hooks/useOrders'
import StatusBadge from '@/components/shared/StatusBadge'
import { ORDER_TYPE_LABELS } from '@/lib/products'

interface DashboardData {
  summary: RevenueSummary | null
  byCategory: RevenueByCategory | null
  activeVouchers: number
  redeemedVouchers: number
  openRedemptions: number
  confirmedThisMonth: number
  openGiftBoxes: number
  recentOrders: OrderWithCustomer[]
}

const empty: DashboardData = {
  summary: null, byCategory: null,
  activeVouchers: 0, redeemedVouchers: 0,
  openRedemptions: 0, confirmedThisMonth: 0, openGiftBoxes: 0,
  recentOrders: [],
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(empty)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const [
        { data: summary },
        { data: byCategory },
        { count: activeVouchers },
        { count: redeemedVouchers },
        { count: openRedemptions },
        { count: confirmedThisMonth },
        { count: openGiftBoxes },
        { data: recentOrders },
      ] = await Promise.all([
        supabase.from('revenue_summary').select('*').single(),
        supabase.from('revenue_by_category').select('*').single(),
        supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('status', 'redeemed'),
        supabase.from('redemption_requests').select('*', { count: 'exact', head: true }).in('status', ['pending','under_review']),
        supabase.from('redemption_requests').select('*', { count: 'exact', head: true })
          .eq('status', 'date_confirmed')
          .gte('confirmed_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .in('order_type', ['gift_box','mixed'])
          .not('status', 'in', '("completed","cancelled","refunded")'),
        supabase.from('orders').select('*, customers(id, name, email)').order('created_at', { ascending: false }).limit(10),
      ])

      setData({
        summary: summary as RevenueSummary | null,
        byCategory: byCategory as RevenueByCategory | null,
        activeVouchers: activeVouchers ?? 0,
        redeemedVouchers: redeemedVouchers ?? 0,
        openRedemptions: openRedemptions ?? 0,
        confirmedThisMonth: confirmedThisMonth ?? 0,
        openGiftBoxes: openGiftBoxes ?? 0,
        recentOrders: (recentOrders ?? []) as OrderWithCustomer[],
      })
      setLoading(false)
    }
    load()
  }, [])

  const s = data.summary
  const c = data.byCategory
  const fmt = (n: number | null | undefined) => (n ?? 0).toFixed(2).replace('.', ',') + ' €'
  const num = (n: number | null | undefined) => (n ?? 0).toString()

  if (loading) return <p className="text-sm text-muted-foreground">Laden...</p>

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Dashboard</h1>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Umsatz gesamt"       value={fmt(s?.total_revenue)}         highlight />
        <KpiCard label="Umsatz diesen Monat" value={fmt(s?.revenue_this_month)} />
        <KpiCard label="Tasting-Gutscheine"  value={fmt(c?.revenue_tasting_vouchers)} />
        <KpiCard label="Wertgutscheine"      value={fmt(c?.revenue_value_vouchers)} />
        <KpiCard label="Genussboxen"         value={fmt(c?.revenue_gift_boxes)} />
        <KpiCard label="Ø Bestellwert"       value={fmt(s?.avg_order_value)} />
        <KpiCard label="Offene Zahlungen"    value={`${num(s?.open_payments_count)} · ${fmt(s?.open_payments_amount)}`} warn={!!s?.open_payments_count} />
        <KpiCard label="Storniert/Erstattet" value={fmt(s?.cancelled_refunded_amount)} muted />
      </div>

      {/* Operations KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Aktive Gutscheine"       value={num(data.activeVouchers)} />
        <KpiCard label="Eingelöste Gutscheine"   value={num(data.redeemedVouchers)} />
        <KpiCard label="Offene Einlösungen"      value={num(data.openRedemptions)} warn={data.openRedemptions > 0} onClick={() => navigate('/redemptions')} />
        <KpiCard label="Bestätigte Tastings (Monat)" value={num(data.confirmedThisMonth)} />
        <KpiCard label="Offene Genussboxen"      value={num(data.openGiftBoxes)} warn={data.openGiftBoxes > 0} onClick={() => navigate('/orders')} />
        <KpiCard label="Bezahlte Bestellungen"   value={num(s?.paid_orders_count)} />
        <KpiCard label="Offene Anfragen"         value={num(s?.open_inquiry_count)} />
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium">Letzte Bestellungen</h2>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6">Noch keine Bestellungen.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Datum</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kunde</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Typ</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Betrag</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Zahlung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.recentOrders.map(o => (
                <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="hover:bg-muted/30 cursor-pointer">
                  <td className="px-4 py-2.5 text-muted-foreground">{new Date(o.created_at).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-2.5 font-medium">{o.customers?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{ORDER_TYPE_LABELS[o.order_type]}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{o.total_amount.toFixed(2)} €</td>
                  <td className="px-4 py-2.5"><StatusBadge status={o.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, highlight, warn, muted, onClick }: {
  label: string; value: string
  highlight?: boolean; warn?: boolean; muted?: boolean; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 ${onClick ? 'cursor-pointer hover:bg-muted/30 transition-colors' : ''} ${
        highlight ? 'border-primary/30' : warn ? 'border-amber-300' : 'border-border'
      }`}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${
        highlight ? 'text-primary' : warn ? 'text-amber-600' : muted ? 'text-muted-foreground' : 'text-foreground'
      }`}>{value}</p>
    </div>
  )
}
