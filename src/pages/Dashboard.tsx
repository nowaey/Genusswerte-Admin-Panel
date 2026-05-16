import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { RevenueSummary, RevenueByCategory, TastingEvent, TastingBooking } from '@/types/database'
import type { OrderWithCustomer } from '@/hooks/useOrders'
import StatusBadge from '@/components/shared/StatusBadge'
import { ORDER_TYPE_LABELS } from '@/lib/products'

type UpcomingEvent = TastingEvent & {
  tasting_bookings: Pick<TastingBooking, 'persons' | 'status'>[]
  own_booked: number
  own_available: number
}

interface DashboardData {
  summary:           RevenueSummary | null
  byCategory:        RevenueByCategory | null
  activeVouchers:    number
  redeemedVouchers:  number
  openRedemptions:   number
  confirmedThisMonth:number
  newGroupRequests:  number
  recentOrders:      OrderWithCustomer[]
  upcomingEvents:    UpcomingEvent[]
}

const empty: DashboardData = {
  summary: null, byCategory: null,
  activeVouchers: 0, redeemedVouchers: 0,
  openRedemptions: 0, confirmedThisMonth: 0,
  newGroupRequests: 0, recentOrders: [], upcomingEvents: [],
}

const DE_DAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function fmtEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DE_DAY[d.getDay()]}., ${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(empty)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [
        { data: summary },
        { data: byCategory },
        { count: activeVouchers },
        { count: redeemedVouchers },
        { count: openRedemptions },
        { count: confirmedThisMonth },
        { count: newGroupRequests },
        { data: recentOrders },
        { data: rawEvents },
      ] = await Promise.all([
        supabase.from('revenue_summary').select('*').single(),
        supabase.from('revenue_by_category').select('*').single(),
        supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('status', 'redeemed'),
        supabase.from('redemption_requests').select('*', { count: 'exact', head: true }).in('status', ['pending','under_review']),
        supabase.from('redemption_requests').select('*', { count: 'exact', head: true })
          .eq('status', 'date_confirmed').gte('confirmed_date', monthStart),
        supabase.from('group_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('orders').select('*, customers(id, name, email)').order('created_at', { ascending: false }).limit(5),
        supabase.from('tasting_events')
          .select('*, tasting_bookings(persons, status)')
          .eq('is_open', true)
          .gte('event_date', today)
          .order('event_date').order('start_time')
          .limit(8),
      ])

      const upcomingEvents: UpcomingEvent[] = ((rawEvents ?? []) as any[]).map(e => {
        const own_booked = (e.tasting_bookings as { persons: number; status: string }[])
          .filter(b => b.status === 'confirmed')
          .reduce((sum, b) => sum + b.persons, 0)
        const { tasting_bookings, ...rest } = e
        return { ...rest, tasting_bookings, own_booked, own_available: e.own_quota - own_booked }
      })

      setData({
        summary:            summary as RevenueSummary | null,
        byCategory:         byCategory as RevenueByCategory | null,
        activeVouchers:     activeVouchers ?? 0,
        redeemedVouchers:   redeemedVouchers ?? 0,
        openRedemptions:    openRedemptions ?? 0,
        confirmedThisMonth: confirmedThisMonth ?? 0,
        newGroupRequests:   newGroupRequests ?? 0,
        recentOrders:       (recentOrders ?? []) as OrderWithCustomer[],
        upcomingEvents,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-sm text-muted-foreground p-2">Laden...</p>

  const s  = data.summary
  const c  = data.byCategory
  const fmt = (n: number | null | undefined) => (n ?? 0).toFixed(2).replace('.', ',') + ' €'
  const nearlyFull = data.upcomingEvents.filter(e => e.own_available <= 2).length

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* ── A. Heute wichtig ─────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
          Heute wichtig
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            label="Offene Einlösungen"
            value={data.openRedemptions}
            sub="brauchen Bearbeitung"
            to="/redemptions"
            warn={data.openRedemptions > 0}
            navigate={navigate}
          />
          <ActionCard
            label="Offene Zahlungen"
            value={s?.open_payments_count ?? 0}
            sub={s?.open_payments_count ? fmt(s.open_payments_amount) : 'keine'}
            to="/orders"
            warn={(s?.open_payments_count ?? 0) > 0}
            navigate={navigate}
          />
          <ActionCard
            label="Neue Gruppenanfragen"
            value={data.newGroupRequests}
            sub="noch nicht bearbeitet"
            to="/group-requests"
            warn={data.newGroupRequests > 0}
            navigate={navigate}
          />
          <ActionCard
            label="Fast volle Termine"
            value={nearlyFull}
            sub="≤ 2 eigene Plätze frei"
            to="/tastings"
            warn={nearlyFull > 0}
            navigate={navigate}
          />
        </div>
      </section>

      {/* ── B. Umsatz ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">
          Umsatz
        </h2>
        <div className="bg-white rounded-lg border border-border p-5">
          {/* Main month figure */}
          <div className="flex items-baseline gap-3 mb-4 pb-4 border-b border-border">
            <span className="text-3xl font-bold tabular-nums text-primary">
              {fmt(s?.revenue_this_month)}
            </span>
            <span className="text-sm text-muted-foreground">diesen Monat</span>
            <span className="ml-auto text-sm text-muted-foreground">
              Gesamt: <span className="font-medium text-foreground">{fmt(s?.total_revenue)}</span>
            </span>
          </div>
          {/* Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <RevenueCard label="Tasting-Gutscheine" value={fmt(c?.revenue_tasting_vouchers)} />
            <RevenueCard label="Wertgutscheine"     value={fmt(c?.revenue_value_vouchers)} />
            <RevenueCard label="Genussboxen"         value={fmt(c?.revenue_gift_boxes)} />
            <RevenueCard label="Ø Bestellwert"       value={fmt(s?.avg_order_value)} />
          </div>
          {/* Footer stats */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            <span>{s?.paid_orders_count ?? 0} bezahlte Bestellungen</span>
            <span>{s?.open_inquiry_count ?? 0} offene Anfragen</span>
            {(s?.cancelled_refunded_amount ?? 0) > 0 && (
              <span>Storniert/Erstattet: {fmt(s?.cancelled_refunded_amount)}</span>
            )}
          </div>
        </div>
      </section>

      {/* ── C. Nächste Termine ───────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Nächste Termine
          </h2>
          <Link to="/tastings" className="text-xs text-primary hover:underline">
            Alle Termine →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-border overflow-hidden">
          {data.upcomingEvents.length === 0 ? (
            <div className="px-6 py-5 text-sm text-muted-foreground">
              Keine bevorstehenden Termine.{' '}
              <Link to="/tastings" className="text-primary hover:underline">
                Termine generieren →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Datum</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Tasting</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Eigene Plätze</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Franchise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.upcomingEvents.map(e => {
                  const pct = e.own_quota > 0 ? (e.own_booked / e.own_quota) * 100 : 0
                  const isFull    = e.own_available <= 0
                  const isNearFull = e.own_available <= 2 && !isFull
                  return (
                    <tr
                      key={e.id}
                      onClick={() => navigate(`/tastings/${e.id}`)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 tabular-nums text-sm">
                        {fmtEventDate(e.event_date)}
                        <span className="text-muted-foreground ml-1.5">{e.start_time.slice(0, 5)}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">{e.tasting_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isFull ? 'bg-red-500' : isNearFull ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs tabular-nums ${isFull ? 'text-red-600 font-medium' : isNearFull ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                            {e.own_booked} belegt · <span className="font-semibold">{e.own_available} frei</span> · {e.own_quota} ges.
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {e.franchise_booked} / {e.franchise_quota}
                        <span className="text-muted-foreground/50 ml-1">(Ref.)</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── D. Gutscheinstatus + Letzte Bestellungen ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gutscheinstatus */}
        <div className="bg-white rounded-lg border border-border p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Gutscheinstatus
          </h2>
          <StatRow label="Aktive Gutscheine"         value={data.activeVouchers} />
          <StatRow label="Eingelöste Gutscheine"      value={data.redeemedVouchers} />
          <StatRow label="Bestätigte Tastings (Monat)" value={data.confirmedThisMonth} highlight />
        </div>

        {/* Letzte Bestellungen */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Letzte Bestellungen
            </h2>
            <Link to="/orders" className="text-xs text-primary hover:underline">Alle →</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-4">Noch keine Bestellungen.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {data.recentOrders.map(o => (
                  <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="hover:bg-muted/30 cursor-pointer">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-2.5 font-medium truncate max-w-[120px]">
                      {o.customers?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                      {ORDER_TYPE_LABELS[o.order_type]}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                      {o.total_amount.toFixed(2)} €
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={o.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActionCard({ label, value, sub, to, warn, navigate }: {
  label: string; value: number; sub: string; to: string; warn: boolean
  navigate: (path: string) => void
}) {
  return (
    <div
      onClick={() => navigate(to)}
      className={`cursor-pointer rounded-lg border p-5 transition-all hover:shadow-sm ${
        warn && value > 0
          ? 'border-amber-300 bg-amber-50 hover:bg-amber-100/70'
          : 'border-border bg-white hover:bg-muted/30'
      }`}
    >
      <p className={`text-3xl font-bold tabular-nums ${warn && value > 0 ? 'text-amber-700' : 'text-foreground'}`}>
        {value}
      </p>
      <p className="text-sm font-medium mt-1.5">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

function RevenueCard({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}
