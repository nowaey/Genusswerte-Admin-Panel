import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { TastingEvent, TastingBooking, RedemptionRequest, Voucher } from '@/types/database'

export type TastingEventWithCapacity = TastingEvent & {
  tasting_bookings: Array<Pick<TastingBooking, 'persons' | 'status'>>
  own_booked: number
  own_available: number
}

export type TastingEventDetail = TastingEvent & {
  tasting_bookings: TastingBooking[]
  own_booked: number
  own_available: number
  linked_redemptions: Array<
    Pick<RedemptionRequest, 'id' | 'customer_name' | 'requested_persons' | 'status' | 'created_at'> & {
      vouchers: Pick<Voucher, 'code' | 'product_name'> | null
    }
  >
}

function computeCapacity(event: TastingEvent, bookings: Array<{ persons: number; status: string }>) {
  const own_booked = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + b.persons, 0)
  return { own_booked, own_available: event.own_quota - own_booked }
}

export function useTastings() {
  const [events, setEvents] = useState<TastingEventWithCapacity[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tasting_events')
      .select('*, tasting_bookings(persons, status)')
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })

    const enriched = ((data ?? []) as (TastingEvent & { tasting_bookings: Array<{ persons: number; status: string }> })[])
      .map(e => ({ ...e, ...computeCapacity(e, e.tasting_bookings) }))

    setEvents(enriched as TastingEventWithCapacity[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { events, loading, reload: load }
}

export function useTastingDetail(id: string | undefined) {
  const [event, setEvent] = useState<TastingEventDetail | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) return
    setLoading(true)

    const [{ data: eventData }, { data: redemptionsData }] = await Promise.all([
      supabase
        .from('tasting_events')
        .select('*, tasting_bookings(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('redemption_requests')
        .select('id, customer_name, requested_persons, status, created_at, vouchers(code, product_name)')
        .eq('tasting_event_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (!eventData) { setLoading(false); return }

    const typedEvent = eventData as TastingEvent & { tasting_bookings: TastingBooking[] }
    const { own_booked, own_available } = computeCapacity(typedEvent, typedEvent.tasting_bookings)

    setEvent({
      ...typedEvent,
      own_booked,
      own_available,
      linked_redemptions: (redemptionsData ?? []) as unknown as TastingEventDetail['linked_redemptions'],
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [id])
  return { event, loading, reload: load }
}
