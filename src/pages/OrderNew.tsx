import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCustomers } from '@/hooks/useCustomers'
import { useOrderDetail } from '@/hooks/useOrders'
import PageHeader from '@/components/shared/PageHeader'
import {
  productNamesForType, variantsForType,
  personsFromVariant, valueFromVariant,
  ORDER_TYPE_LABELS,
} from '@/lib/products'
import type { ProductType, OrderType } from '@/types/database'

interface FormItem {
  _key: string
  product_type: ProductType
  product_name: string
  variant: string
  quantity: number
  unit_price: number
}

function newItem(): FormItem {
  return { _key: crypto.randomUUID(), product_type: 'tasting_voucher', product_name: '', variant: '', quantity: 1, unit_price: 0 }
}

export default function OrderNew() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { customers } = useCustomers()
  const { order } = useOrderDetail(id)

  const [customerId, setCustomerId] = useState('')
  const [orderType, setOrderType] = useState<OrderType>('tasting_voucher')
  const [source, setSource] = useState('whatsapp')
  const [internalRef, setInternalRef] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<FormItem[]>([newItem()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate form when editing
  useEffect(() => {
    if (!order) return
    setCustomerId(order.customer_id ?? '')
    setOrderType(order.order_type)
    setSource(order.source)
    setInternalRef(order.internal_ref ?? '')
    setNotes(order.notes ?? '')
    if (order.order_items.length > 0) {
      setItems(order.order_items.map(i => ({
        _key: i.id,
        product_type: i.product_type,
        product_name: i.product_name,
        variant: i.variant ?? '',
        quantity: i.quantity,
        unit_price: i.unit_price,
      })))
    }
  }, [order])

  const displayTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  function updateItem(key: string, patch: Partial<FormItem>) {
    setItems(prev => prev.map(i => {
      if (i._key !== key) return i
      const updated = { ...i, ...patch }
      // Reset dependent fields when type changes
      if (patch.product_type) {
        updated.product_name = ''
        updated.variant = ''
      }
      if (patch.product_name) updated.variant = ''
      return updated
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (items.some(i => !i.product_name)) { setError('Alle Artikel brauchen einen Produktnamen.'); return }
    setSaving(true)

    if (isEdit && id) {
      // Update order fields
      await supabase.from('orders').update({
        customer_id:  customerId || null,
        order_type:   orderType,
        source,
        internal_ref: internalRef || null,
        notes:        notes || null,
      }).eq('id', id)

      // Replace order items (trigger recalculates total_amount)
      await supabase.from('order_items').delete().eq('order_id', id)
      if (items.length > 0) {
        await supabase.from('order_items').insert(
          items.map(i => ({
            order_id: id,
            product_type: i.product_type,
            product_name: i.product_name,
            variant: i.variant || null,
            quantity: i.quantity,
            unit_price: i.unit_price,
          }))
        )
      }
      setSaving(false)
      navigate(`/orders/${id}`)
    } else {
      // Create order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id:  customerId || null,
          order_type:   orderType,
          source,
          internal_ref: internalRef || null,
          notes:        notes || null,
        })
        .select()
        .single()

      if (orderErr || !orderData) { setError(orderErr?.message ?? 'Fehler'); setSaving(false); return }

      // Insert order items
      const { data: insertedItems } = await supabase
        .from('order_items')
        .insert(items.map(i => ({
          order_id: orderData.id,
          product_type: i.product_type,
          product_name: i.product_name,
          variant: i.variant || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })))
        .select()

      // Auto-create voucher rows for tasting and value items
      const voucherItems = (insertedItems ?? []).filter(
        i => i.product_type === 'tasting_voucher' || i.product_type === 'value_voucher'
      )
      if (voucherItems.length > 0) {
        await supabase.from('vouchers').insert(
          voucherItems.map(i => ({
            order_id:        orderData.id,
            order_item_id:   i.id,
            voucher_type:    i.product_type,
            product_name:    i.product_name,
            variant:         i.variant,
            persons_allowed: i.product_type === 'tasting_voucher' ? personsFromVariant(i.variant ?? '') : null,
            value_amount:    i.product_type === 'value_voucher'   ? valueFromVariant(i.variant ?? '')   : null,
            status:          'pending',
          }))
        )
      }

      setSaving(false)
      navigate(`/orders/${orderData.id}`)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title={isEdit ? 'Bestellung bearbeiten' : 'Neue Bestellung'} back />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-sm font-medium">Bestelldetails</h2>

          <Field label="Kunde">
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className={sel}
            >
              <option value="">— Kein Kunde zugeordnet —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Bestelltyp">
              <select value={orderType} onChange={e => setOrderType(e.target.value as OrderType)} className={sel}>
                {Object.entries(ORDER_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Quelle">
              <select value={source} onChange={e => setSource(e.target.value)} className={sel}>
                <option value="whatsapp">WhatsApp</option>
                <option value="formspree">Formspree</option>
                <option value="in_person">Vor Ort</option>
                <option value="manual">Manuell</option>
              </select>
            </Field>
          </div>

          <Field label="Interne Referenz (optional)">
            <input value={internalRef} onChange={e => setInternalRef(e.target.value)} placeholder="z.B. GW-2026-0001" className={inp} />
          </Field>

          <Field label="Notizen (intern)">
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inp} />
          </Field>
        </div>

        {/* Order items */}
        <div className="bg-white rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">Artikel</h2>
            <button
              type="button"
              onClick={() => setItems(p => [...p, newItem()])}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Artikel hinzufügen
            </button>
          </div>

          <div className="space-y-4">
            {items.map(item => (
              <div key={item._key} className="border border-border rounded-md p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Typ">
                    <select
                      value={item.product_type}
                      onChange={e => updateItem(item._key, { product_type: e.target.value as ProductType })}
                      className={sel}
                    >
                      <option value="tasting_voucher">Tasting-Gutschein</option>
                      <option value="value_voucher">Wertgutschein</option>
                      <option value="gift_box">Genussbox</option>
                    </select>
                  </Field>

                  <Field label="Produkt">
                    <select
                      value={item.product_name}
                      onChange={e => updateItem(item._key, { product_name: e.target.value })}
                      className={sel}
                    >
                      <option value="">— wählen —</option>
                      {productNamesForType(item.product_type).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>

                  <Field label="Variante">
                    <select
                      value={item.variant}
                      onChange={e => updateItem(item._key, { variant: e.target.value })}
                      className={sel}
                    >
                      <option value="">— wählen —</option>
                      {variantsForType(item.product_type).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  <Field label="Menge">
                    <input
                      type="number" min={1}
                      value={item.quantity}
                      onChange={e => updateItem(item._key, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className={inp}
                    />
                  </Field>
                  <Field label="Einzelpreis (€)">
                    <input
                      type="number" min={0} step="0.01"
                      value={item.unit_price}
                      onChange={e => updateItem(item._key, { unit_price: parseFloat(e.target.value) || 0 })}
                      className={inp}
                    />
                  </Field>
                  <div className="flex items-end gap-2 pb-0.5">
                    <span className="text-sm font-medium tabular-nums">
                      {(item.quantity * item.unit_price).toFixed(2)} €
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(p => p.filter(i => i._key !== item._key))}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-border">
            <span className="text-sm font-semibold">Gesamt: {displayTotal.toFixed(2)} €</span>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichern...' : isEdit ? 'Änderungen speichern' : 'Bestellung anlegen'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-md text-sm border border-border hover:bg-muted transition-colors"
          >
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
const sel = inp
