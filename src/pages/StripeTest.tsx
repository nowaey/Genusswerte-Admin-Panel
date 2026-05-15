import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import {
  TASTING_VOUCHERS,
  TASTING_VARIANTS,
  TASTING_PRICES,
  VALUE_VOUCHER_NAME,
  VALUE_VOUCHER_VARIANTS,
} from '@/lib/products'
import PageHeader from '@/components/shared/PageHeader'

type VoucherType = 'tasting_voucher' | 'value_voucher'

export default function StripeTest() {
  const [searchParams] = useSearchParams()
  const isSuccess   = searchParams.get('success')   === 'true'
  const isCancelled = searchParams.get('cancelled') === 'true'

  const [voucherType, setVoucherType]     = useState<VoucherType>('tasting_voucher')
  const [productName, setProductName]     = useState('')
  const [variant, setVariant]             = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName]   = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  const productNames = voucherType === 'tasting_voucher'
    ? TASTING_VOUCHERS.map((t) => t.name)
    : [VALUE_VOUCHER_NAME]

  const variants = voucherType === 'tasting_voucher'
    ? [...TASTING_VARIANTS]
    : [...VALUE_VOUCHER_VARIANTS]

  function handleTypeChange(type: VoucherType) {
    setVoucherType(type)
    setProductName('')
    setVariant('')
  }

  function calcPrice(): string {
    if (!productName || !variant) return '—'
    if (voucherType === 'value_voucher') return `${parseInt(variant)} €`
    const base    = TASTING_PRICES[productName]
    const persons = parseInt(variant)
    if (!base || !persons) return '—'
    return `${base * persons} €`
  }

  async function handleCheckout() {
    setError(null)
    setLoading(true)
    try {
      const origin = window.location.origin
      const { data, error: fnErr } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            product_name:   productName,
            variant,
            voucher_type:   voucherType,
            customer_email: customerEmail,
            customer_name:  customerName || null,
            success_url: `${origin}/stripe-test?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${origin}/stripe-test?cancelled=true`,
          },
        },
      )

      if (fnErr) throw new Error(fnErr.message)
      if (!data?.url) throw new Error('Keine Checkout-URL erhalten.')

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setLoading(false)
    }
  }

  const canSubmit = Boolean(productName && variant && customerEmail) && !loading

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Stripe Test"
        subtitle="Checkout-Session erstellen (nur Admin-intern)"
        back
      />

      {isSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          Zahlung erfolgreich. Der Webhook verarbeitet die Bestellung im Hintergrund —
          bitte in <a href="/orders" className="underline font-medium">/orders</a> prüfen.
        </div>
      )}

      {isCancelled && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          Checkout abgebrochen.
        </div>
      )}

      <div className="bg-white rounded-lg border border-border p-6 space-y-4">

        <Field label="Gutschein-Typ">
          <select
            value={voucherType}
            onChange={(e) => handleTypeChange(e.target.value as VoucherType)}
            className={sel}
          >
            <option value="tasting_voucher">Tasting-Gutschein</option>
            <option value="value_voucher">Wertgutschein</option>
          </select>
        </Field>

        <Field label="Produkt">
          <select
            value={productName}
            onChange={(e) => { setProductName(e.target.value); setVariant('') }}
            className={sel}
          >
            <option value="">— wählen —</option>
            {productNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>

        <Field label="Variante">
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            className={sel}
            disabled={!productName}
          >
            <option value="">— wählen —</option>
            {variants.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>

        {productName && variant && (
          <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
            Gesamtpreis: <span className="font-semibold tabular-nums">{calcPrice()}</span>
          </div>
        )}

        <Field label={<>Kunden-E-Mail <span className="text-destructive">*</span></>}>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="kunde@beispiel.de"
            className={inp}
          />
        </Field>

        <Field label="Kundenname (optional)">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Max Mustermann"
            className={inp}
          />
        </Field>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={handleCheckout}
          disabled={!canSubmit}
          className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Erstelle Checkout…' : 'Zur Kasse'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Stripe Test-Modus · Testkarte: 4242 4242 4242 4242 · beliebiges Datum/CVC
      </p>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'
const sel = inp
