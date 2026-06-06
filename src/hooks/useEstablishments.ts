import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Establishment } from '../types'

export function useEstablishments(userId: string | null, role: string) {
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchEstablishments = useCallback(async () => {
    setIsLoading(true)

    let query = supabase.from('establishments').select('*')

    if (role === 'admin') {
      // Admin sees all
    } else if (role === 'merchant' && userId) {
      query = query.eq('owner_id', userId)
    } else {
      query = query.eq('is_active', true)
    }

    const { data } = await query.order('name')
    if (data) setEstablishments(data as Establishment[])
    setIsLoading(false)
  }, [userId, role])

  useEffect(() => {
    fetchEstablishments()
  }, [fetchEstablishments])

  const createEstablishment = useCallback(
    async (est: Omit<Establishment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('establishments').insert(est).select().single()
      if (error) throw error
      setEstablishments((prev) => [...prev, data as Establishment])
      return data as Establishment
    },
    [],
  )

  const updateEstablishment = useCallback(
    async (id: string, updates: Partial<Establishment>) => {
      const { data, error } = await supabase.from('establishments').update(updates).eq('id', id).select().single()
      if (error) throw error
      setEstablishments((prev) => prev.map((e) => (e.id === id ? (data as Establishment) : e)))
      return data as Establishment
    },
    [],
  )

  return { establishments, isLoading, fetchEstablishments, createEstablishment, updateEstablishment }
}
