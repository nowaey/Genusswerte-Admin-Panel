import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order, OrderItem, Voucher } from '@/types/database'

export type OrderWithCustomer = Order & {
  customers: { id: string; name: string; email: string | null } | null
}

export type OrderDetail = Order & {
  customers: { id: string; name: string; email: string | null; phone: string | null } | null
  order_items: OrderItem[]
  vouchers: Voucher[]
}

export function useOrders() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(id, name, email)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setOrders((data ?? []) as OrderWithCustomer[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { orders, loading, error, reload: load }
}

export function useOrderDetail(id: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(id, name, email, phone), order_items(*), vouchers(*)')
      .eq('id', id)
      .single()
    if (error) setError(error.message)
    else setOrder(data as OrderDetail)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  return { order, loading, error, reload: load }
}
