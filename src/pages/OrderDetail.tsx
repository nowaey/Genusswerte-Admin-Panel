import { useParams, useNavigate, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrderDetail } from '@/hooks/useOrders'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import InternalNotes from '@/components/shared/InternalNotes'
import { ORDER_TYPE_LABELS, SOURCE_LABELS } from '@/lib/products'
import type { OrderStatus } from '@/types/database'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { order, loading, reload } = useOrderDetail(id)

  if (loading) return <p className="text-sm text-muted-foreground p-6">Laden...</p>
  if (!order) return <p className="text-sm text-destructive p-6">Bestellung nicht gefunden.</p>

  async function markAsPaid() {
    await supabase.from('orders').update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      status: 'paid',
    }).eq('id', order!.id)
    reload()
  }

  async function setStatus(status: OrderStatus) {
    await supabase.from('orders').update({ status }).eq('id', order!.id)
    reload()
  }

  async function setPaymentStatus(payment_status: 'cancelled' | 'refunded') {
    await supabase.from('orders').update({ payment_status, status: payment_status }).eq('id', order!.id)
    reload()
  }

  const hasPendingVouchers = order.vouchers.some(v => v.status === 'pending')

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={order.internal_ref ?? `Bestellung ${order.id.slice(0, 8)}`}
        subtitle={`${ORDER_TYPE_LABELS[order.order_type]} · ${order.customers?.name ?? 'Kein Kunde'}`}
        back
        action={
          <button
            onClick={() => navigate(`/orders/${id}/edit`)}
            className="flex items-center gap-2 border border-border px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Bearbeiten
          </button>
        }
      />

      {/* Info grid */}
      <div className="bg-white rounded-lg border border-border p-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <InfoRow label="Kunde">
            {order.customers
              ? <Link to={`/customers/${order.customers.id}`} className="text-primary hover:underline">{order.customers.name}</Link>
              : '—'}
          </InfoRow>
          <InfoRow label="Quelle">{SOURCE_LABELS[order.source] ?? order.source}</InfoRow>
          <InfoRow label="Erstellt">{new Date(order.created_at).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })}</InfoRow>
          <InfoRow label="Bezahlt am">{order.paid_at ? new Date(order.paid_at).toLocaleDateString('de-DE') : '—'}</InfoRow>
          {order.notes && <InfoRow label="Notizen" className="col-span-2">{order.notes}</InfoRow>}
        </dl>
      </div>

      {/* Payment & Status */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-sm font-medium mb-4">Zahlung & Status</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Zahlung:</span>
            <StatusBadge status={order.payment_status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Primary action — the single most important next step */}
        <div className="mt-4 space-y-3">
          {order.payment_status === 'open' && (
            <ActionButton onClick={markAsPaid} variant="primary" fullWidth>
              Als bezahlt markieren
            </ActionButton>
          )}
          {order.status === 'paid' && !['tasting_voucher','value_voucher'].includes(order.order_type) && order.payment_status === 'paid' && (
            <ActionButton onClick={() => setStatus('in_preparation')} variant="primary" fullWidth>
              In Vorbereitung setzen
            </ActionButton>
          )}
          {order.status === 'in_preparation' && (
            <ActionButton onClick={() => setStatus('ready')} variant="primary" fullWidth>
              Als bereit markieren
            </ActionButton>
          )}
          {order.status === 'ready' && (
            <ActionButton onClick={() => setStatus('completed')} variant="primary" fullWidth>
              Abschließen
            </ActionButton>
          )}

          {/* Secondary workflow actions */}
          <div className="flex flex-wrap gap-2">
            {order.status === 'inquiry' && (
              <ActionButton onClick={() => setStatus('payment_open')}>Zahlung abwarten</ActionButton>
            )}
            {order.status === 'paid' && order.payment_status === 'paid' && (
              <ActionButton onClick={() => setStatus('completed')}>Direkt abschließen</ActionButton>
            )}
          </div>

          {/* Danger zone */}
          {!['cancelled','refunded','completed'].includes(order.status) && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
              <ActionButton onClick={() => setPaymentStatus('cancelled')} variant="danger">Stornieren</ActionButton>
              {order.payment_status === 'paid' && (
                <ActionButton onClick={() => setPaymentStatus('refunded')} variant="danger">Erstatten</ActionButton>
              )}
            </div>
          )}
        </div>

        {hasPendingVouchers && order.payment_status !== 'paid' && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Gutschein-Code kann erst nach Zahlungseingang generiert werden.
          </p>
        )}
      </div>

      {/* Order items */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium">Artikel</h2>
          <span className="text-sm font-semibold tabular-nums">{order.total_amount.toFixed(2)} €</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Produkt</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Variante</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Menge</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Einzelpreis</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Gesamt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.order_items.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3">{item.product_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.variant ?? '—'}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{item.unit_price.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{item.total_price.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vouchers */}
      {order.vouchers.length > 0 && (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium">Gutscheine ({order.vouchers.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Produkt</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Variante</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.vouchers.map(v => (
                <tr
                  key={v.id}
                  onClick={() => navigate(`/vouchers/${v.id}`)}
                  className="hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {v.code ?? <span className="text-muted-foreground italic">noch nicht generiert</span>}
                  </td>
                  <td className="px-4 py-3">{v.product_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.variant ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Internal notes */}
      <InternalNotes orderId={order.id} />
    </div>
  )
}

function InfoRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function ActionButton({ onClick, children, variant = 'default', fullWidth }: {
  onClick: () => void
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'danger'
  fullWidth?: boolean
}) {
  const styles = {
    default: 'border border-border hover:bg-muted text-foreground',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    danger:  'border border-red-200 text-red-600 hover:bg-red-50',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-md text-sm font-medium transition-colors ${
        fullWidth ? 'w-full py-2.5 px-4' : 'px-3 py-1.5'
      } ${styles[variant]}`}
    >
      {children}
    </button>
  )
}
