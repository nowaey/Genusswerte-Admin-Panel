import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useCustomer } from '@/hooks/useCustomers'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Order, CustomerUpdate } from '@/types/database'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const { customer, loading, reload } = useCustomer(isNew ? undefined : id)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setEmail(customer.email ?? '')
      setPhone(customer.phone ?? '')
      setNotes(customer.notes ?? '')
    }
  }, [customer])

  useEffect(() => {
    if (!id || isNew) return
    supabase
      .from('orders')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setOrders(data ?? []))
  }, [id, isNew])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (isNew) {
      const { data, error } = await supabase
        .from('customers')
        .insert({ name, email: email || null, phone: phone || null, notes: notes || null })
        .select()
        .single()
      setSaving(false)
      if (!error && data) navigate(`/customers/${data.id}`, { replace: true })
    } else {
      const update: CustomerUpdate = { name, email: email || null, phone: phone || null, notes: notes || null }
      await supabase.from('customers').update(update).eq('id', id!)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      reload()
    }
  }

  if (!isNew && loading) return <p className="text-sm text-muted-foreground p-6">Laden...</p>

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={isNew ? 'Neuer Kunde' : (customer?.name ?? '...')}
        back
      />

      <div className="bg-white rounded-lg border border-border p-6 mb-6">
        <h2 className="text-sm font-medium text-foreground mb-4">Kontaktdaten</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Name *">
            <input required value={name} onChange={e => setName(e.target.value)} className={input} />
          </Field>
          <Field label="E-Mail">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={input} />
          </Field>
          <Field label="Telefon">
            <input value={phone} onChange={e => setPhone(e.target.value)} className={input} />
          </Field>
          <Field label="Notizen (intern)">
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={input} />
          </Field>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern...' : isNew ? 'Kunde anlegen' : 'Speichern'}
            </button>
            {saved && <span className="text-sm text-green-600">Gespeichert</span>}
          </div>
        </form>
      </div>

      {!isNew && orders.length > 0 && (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-medium">Bestellungen ({orders.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ref</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Typ</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Betrag</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map(o => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="hover:bg-muted/30 cursor-pointer"
                >
                  <td className="px-4 py-3 text-muted-foreground">{o.internal_ref ?? o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{orderTypeLabel(o.order_type)}</td>
                  <td className="px-4 py-3">{o.total_amount.toFixed(2)} €</td>
                  <td className="px-4 py-3"><StatusBadge status={o.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}

const input = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring'

function orderTypeLabel(type: string) {
  const map: Record<string, string> = {
    tasting_voucher: 'Tasting-Gutschein',
    value_voucher:   'Wertgutschein',
    gift_box:        'Genussbox',
    mixed:           'Gemischt',
  }
  return map[type] ?? type
}
