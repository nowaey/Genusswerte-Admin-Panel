import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/shared/PageHeader'
import type { Voucher } from '@/types/database'

export default function RedemptionNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const prefillVoucherId = params.get('voucherId') ?? ''

  const [voucherSearch, setVoucherSearch] = useState('')
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [requestedPersons, setRequestedPersons] = useState(1)
  const [date1, setDate1] = useState(''); const [time1, setTime1] = useState('')
  const [date2, setDate2] = useState(''); const [time2, setTime2] = useState('')
  const [date3, setDate3] = useState(''); const [time3, setTime3] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill if coming from voucher detail
  useEffect(() => {
    if (!prefillVoucherId) return
    supabase.from('vouchers').select('*').eq('id', prefillVoucherId).single()
      .then(({ data }) => { if (data) setVoucher(data) })
  }, [prefillVoucherId])

  async function lookUpVoucher() {
    const code = voucherSearch.trim().toUpperCase()
    if (!code) return
    setLookingUp(true)
    setVoucherError(null)
    const { data } = await supabase
      .from('vouchers')
      .select('*, orders(payment_status)')
      .eq('code', code)
      .single()
    setLookingUp(false)
    if (!data) { setVoucherError('Gutschein-Code nicht gefunden.'); return }
    const order = (data as any).orders
    if (order?.payment_status !== 'paid') { setVoucherError('Gutschein noch nicht aktiviert.'); return }
    if (!['active','redemption_requested'].includes(data.status)) {
      setVoucherError(`Gutschein hat Status "${data.status}" und kann nicht eingelöst werden.`); return
    }
    setVoucher(data)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!voucher) { setError('Gutschein-Code eingeben und prüfen.'); return }
    if (voucher.persons_allowed && requestedPersons > voucher.persons_allowed) {
      setError(`Gutschein gilt für max. ${voucher.persons_allowed} Person(en).`); return
    }
    setSaving(true)
    const { data, error: err } = await supabase.from('redemption_requests').insert({
      voucher_id:        voucher.id,
      customer_name:     customerName,
      customer_email:    customerEmail || null,
      customer_phone:    customerPhone || null,
      requested_persons: requestedPersons,
      preferred_date_1:  date1 || null, preferred_time_1: time1 || null,
      preferred_date_2:  date2 || null, preferred_time_2: time2 || null,
      preferred_date_3:  date3 || null, preferred_time_3: time3 || null,
      message:           message || null,
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    // Update voucher status
    await supabase.from('vouchers').update({ status: 'redemption_requested' }).eq('id', voucher.id)
    setSaving(false)
    navigate(`/redemptions/${data.id}`)
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Einlösungsanfrage erfassen" back />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher lookup */}
        <div className="bg-white rounded-lg border border-border p-6 space-y-3">
          <h2 className="text-sm font-medium">Gutschein</h2>
          {voucher ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-4 py-3">
              <div>
                <p className="font-mono text-sm font-bold">{voucher.code}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {voucher.product_name}{voucher.variant ? ` · ${voucher.variant}` : ''}
                  {voucher.persons_allowed ? ` · max. ${voucher.persons_allowed} P.` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setVoucher(null)} className="text-xs text-muted-foreground hover:text-foreground">Ändern</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={voucherSearch}
                onChange={e => setVoucherSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), lookUpVoucher())}
                placeholder="GW-WT-XXXXXXXX"
                className="flex-1 border border-input rounded-md px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={lookUpVoucher}
                disabled={lookingUp}
                className="px-3 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors"
              >
                {lookingUp ? '...' : 'Prüfen'}
              </button>
            </div>
          )}
          {voucherError && <p className="text-xs text-destructive">{voucherError}</p>}
        </div>

        {/* Customer */}
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-sm font-medium">Kundendaten</h2>
          <Field label="Name *">
            <input required value={customerName} onChange={e => setCustomerName(e.target.value)} className={inp} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="E-Mail">
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className={inp} />
            </Field>
            <Field label="Telefon">
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={inp} />
            </Field>
          </div>
          <Field label="Anzahl Personen *">
            <input
              type="number" min={1} max={voucher?.persons_allowed ?? 99} required
              value={requestedPersons}
              onChange={e => setRequestedPersons(parseInt(e.target.value) || 1)}
              className={inp}
            />
            {voucher?.persons_allowed && (
              <p className="text-xs text-muted-foreground mt-1">Max. {voucher.persons_allowed} laut Gutschein</p>
            )}
          </Field>
        </div>

        {/* Preferred dates */}
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-sm font-medium">Wunschtermine (bis zu 3)</h2>
          {[
            { label: '1. Wunsch', date: date1, time: time1, setDate: setDate1, setTime: setTime1 },
            { label: '2. Wunsch', date: date2, time: time2, setDate: setDate2, setTime: setTime2 },
            { label: '3. Wunsch', date: date3, time: time3, setDate: setDate3, setTime: setTime3 },
          ].map(({ label, date, time, setDate, setTime }) => (
            <div key={label} className="grid grid-cols-2 gap-3">
              <Field label={label}>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inp} />
              </Field>
              <Field label="Uhrzeit">
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inp} />
              </Field>
            </div>
          ))}
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg border border-border p-6">
          <Field label="Nachricht des Kunden">
            <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} className={inp} />
          </Field>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichern...' : 'Anfrage speichern'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-md text-sm border border-border hover:bg-muted transition-colors">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'
