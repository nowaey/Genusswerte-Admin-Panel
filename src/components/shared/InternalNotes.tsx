import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { InternalNote } from '@/types/database'

interface Props {
  orderId?: string
  voucherId?: string
  redemptionRequestId?: string
}

export default function InternalNotes({ orderId, voucherId, redemptionRequestId }: Props) {
  const [notes, setNotes] = useState<InternalNote[]>([])
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    let query = supabase.from('internal_notes').select('*').order('created_at', { ascending: true })
    if (orderId)              query = query.eq('order_id', orderId)
    if (voucherId)            query = query.eq('voucher_id', voucherId)
    if (redemptionRequestId)  query = query.eq('redemption_request_id', redemptionRequestId)
    const { data } = await query
    setNotes(data ?? [])
  }

  useEffect(() => { load() }, [orderId, voucherId, redemptionRequestId])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    await supabase.from('internal_notes').insert({
      note: text.trim(),
      order_id:              orderId ?? null,
      voucher_id:            voucherId ?? null,
      redemption_request_id: redemptionRequestId ?? null,
    })
    setText('')
    setSaving(false)
    load()
  }

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <h2 className="text-sm font-medium mb-4">Interne Notizen</h2>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">Noch keine Notizen.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {notes.map(n => (
            <li key={n.id} className="text-sm bg-muted/40 rounded-md px-3 py-2">
              <p>{n.note}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Notiz hinzufügen..."
          className="flex-1 border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Hinzufügen
        </button>
      </form>
    </div>
  )
}
