import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useVoucherDetail } from '@/hooks/useVouchers'
import { generateVoucherCode } from '@/lib/products'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import InternalNotes from '@/components/shared/InternalNotes'
import type { VoucherStatus } from '@/types/database'

export default function VoucherDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { voucher, loading, reload } = useVoucherDetail(id)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [validUntil, setValidUntil] = useState('')

  if (loading) return <p className="text-sm text-muted-foreground p-6">Laden...</p>
  if (!voucher) return <p className="text-sm text-destructive p-6">Gutschein nicht gefunden.</p>

  const isPaid = voucher.orders?.payment_status === 'paid'
  const canGenerate = voucher.status === 'pending' && isPaid && !voucher.code

  async function generateCode() {
    setGenerating(true)
    setGenError(null)
    let attempts = 0
    while (attempts < 5) {
      const code = generateVoucherCode(voucher!.product_name)
      const { error } = await supabase.from('vouchers').update({
        code,
        status: 'active',
        generated_at: new Date().toISOString(),
        ...(validUntil ? { valid_until: validUntil } : {}),
      }).eq('id', voucher!.id)

      if (!error) { reload(); setGenerating(false); return }
      // UNIQUE constraint violation → retry with a new code
      if (error.code === '23505') { attempts++; continue }
      setGenError(error.message)
      break
    }
    setGenerating(false)
  }

  async function setStatus(status: VoucherStatus) {
    const patch: Record<string, unknown> = { status }
    if (status === 'redeemed') patch.redeemed_at = new Date().toISOString()
    if (status === 'active')   patch.sent_at = new Date().toISOString()
    await supabase.from('vouchers').update(patch).eq('id', voucher!.id)
    reload()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={voucher.code ?? 'Gutschein (Code ausstehend)'}
        subtitle={`${voucher.product_name}${voucher.variant ? ` · ${voucher.variant}` : ''}`}
        back
      />

      {/* Code card */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Gutschein-Code</p>
            {voucher.code
              ? <p className="font-mono text-2xl font-bold tracking-widest text-foreground">{voucher.code}</p>
              : <p className="text-sm text-muted-foreground italic">Noch kein Code generiert</p>
            }
          </div>
          <StatusBadge status={voucher.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mt-4">
          {voucher.persons_allowed && (
            <InfoRow label="Personen">{voucher.persons_allowed}</InfoRow>
          )}
          {voucher.value_amount && (
            <InfoRow label="Wert">{voucher.value_amount.toFixed(2)} €</InfoRow>
          )}
          <InfoRow label="Gültig bis">
            {voucher.valid_until ? new Date(voucher.valid_until).toLocaleDateString('de-DE') : '—'}
          </InfoRow>
          {voucher.generated_at && (
            <InfoRow label="Generiert am">
              {new Date(voucher.generated_at).toLocaleDateString('de-DE')}
            </InfoRow>
          )}
          {voucher.sent_at && (
            <InfoRow label="Versendet am">
              {new Date(voucher.sent_at).toLocaleDateString('de-DE')}
            </InfoRow>
          )}
        </dl>

        {/* Verknüpfte Bestellung */}
        {voucher.orders && (
          <p className="text-sm mt-4">
            <span className="text-muted-foreground">Bestellung: </span>
            <Link to={`/orders/${voucher.orders.id}`} className="text-primary hover:underline">
              {voucher.orders.internal_ref ?? voucher.orders.id.slice(0, 8)}
            </Link>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-sm font-medium mb-4">Aktionen</h2>

        {canGenerate && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Gültig bis (optional)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={generateCode}
                disabled={generating}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {generating ? 'Generiere...' : 'Code generieren'}
              </button>
            </div>
            {genError && <p className="text-xs text-destructive">{genError}</p>}
          </div>
        )}

        {!isPaid && voucher.status === 'pending' && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
            Zahlung noch nicht bestätigt — Code kann erst danach generiert werden.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {voucher.status === 'active' && (
            <ActionBtn onClick={() => setStatus('active')}>Als versendet markieren</ActionBtn>
          )}
          {['active','redemption_requested','date_confirmed'].includes(voucher.status) && (
            <ActionBtn onClick={() => setStatus('redeemed')}>Als eingelöst markieren</ActionBtn>
          )}
          {['pending','active'].includes(voucher.status) && (
            <ActionBtn onClick={() => setStatus('expired')} variant="danger">Als abgelaufen markieren</ActionBtn>
          )}
          {voucher.status !== 'cancelled' && !['redeemed','expired'].includes(voucher.status) && (
            <ActionBtn onClick={() => setStatus('cancelled')} variant="danger">Stornieren</ActionBtn>
          )}
          {voucher.status === 'active' && (
            <button
              onClick={() => navigate(`/redemptions/new?voucherId=${id}`)}
              className="px-3 py-1.5 rounded-md text-sm border border-border hover:bg-muted transition-colors"
            >
              Einlösungsanfrage erfassen
            </button>
          )}
        </div>
      </div>

      {/* Redemption requests */}
      {voucher.redemption_requests.length > 0 && (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium">Einlösungsanfragen</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Kunde</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Personen</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {voucher.redemption_requests.map(r => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/redemptions/${r.id}`)}
                  className="hover:bg-muted/30 cursor-pointer"
                >
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
        </div>
      )}

      <InternalNotes voucherId={id} />
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

function ActionBtn({ onClick, children, variant = 'default' }: {
  onClick: () => void; children: React.ReactNode; variant?: 'default' | 'danger'
}) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
      variant === 'danger'
        ? 'border-red-200 text-red-600 hover:bg-red-50'
        : 'border-border hover:bg-muted'
    }`}>{children}</button>
  )
}
