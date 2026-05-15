import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { RedemptionRequest, Voucher } from '@/types/database'

export type RedemptionWithVoucher = RedemptionRequest & {
  vouchers: Pick<Voucher, 'id' | 'code' | 'product_name' | 'variant' | 'persons_allowed'> | null
}

export function useRedemptions() {
  const [redemptions, setRedemptions] = useState<RedemptionWithVoucher[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('redemption_requests')
      .select('*, vouchers(id, code, product_name, variant, persons_allowed)')
      .order('status')
      .order('created_at', { ascending: false })
    setRedemptions((data ?? []) as RedemptionWithVoucher[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { redemptions, loading, reload: load }
}

export function useRedemptionDetail(id: string | undefined) {
  const [redemption, setRedemption] = useState<RedemptionWithVoucher | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('redemption_requests')
      .select('*, vouchers(id, code, product_name, variant, persons_allowed)')
      .eq('id', id)
      .single()
    setRedemption(data as unknown as RedemptionWithVoucher)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])
  return { redemption, loading, reload: load }
}
