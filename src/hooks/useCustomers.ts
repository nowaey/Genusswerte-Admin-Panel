import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setCustomers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { customers, loading, error, reload: load }
}

export function useCustomer(id: string | undefined) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) setError(error.message)
    else setCustomer(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  return { customer, loading, error, reload: load }
}
