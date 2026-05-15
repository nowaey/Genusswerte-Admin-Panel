import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Voucher, RedemptionRequest } from '@/types/database'

export type VoucherWithOrder = Voucher & {
  orders: { id: string; payment_status: string; internal_ref: string | null } | null
}

export type VoucherDetail = Voucher & {
  orders: { id: string; payment_status: string; internal_ref: string | null } | null
  redemption_requests: RedemptionRequest[]
}

export function useVouchers() {
  const [vouchers, setVouchers] = useState<VoucherWithOrder[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('vouchers')
      .select('*, orders(id, payment_status, internal_ref)')
      .order('created_at', { ascending: false })
    setVouchers((data ?? []) as VoucherWithOrder[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { vouchers, loading, reload: load }
}

export function useVoucherDetail(id: string | undefined) {
  const [voucher, setVoucher] = useState<VoucherDetail | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('vouchers')
      .select('*, orders(id, payment_status, internal_ref), redemption_requests(*)')
      .eq('id', id)
      .single()
    setVoucher(data as unknown as VoucherDetail)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])
  return { voucher, loading, reload: load }
}
