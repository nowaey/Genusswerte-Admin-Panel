import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { GroupRequest } from '@/types/database'

export function useGroupRequests() {
  const [requests, setRequests] = useState<GroupRequest[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('group_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests((data ?? []) as GroupRequest[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  return { requests, loading, reload: load }
}

export function useGroupRequestDetail(id: string | undefined) {
  const [request, setRequest] = useState<GroupRequest | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('group_requests')
      .select('*')
      .eq('id', id)
      .single()
    setRequest(data as GroupRequest)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])
  return { request, loading, reload: load }
}
