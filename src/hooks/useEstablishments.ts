import { useState, useEffect, useCallback, useRef } from 'react'
import { restQuery } from '../lib/supabase'
import type { Establishment } from '../types'

const FETCH_TIMEOUT = 8000

export function useEstablishments(userId: string | null, role: string) {
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const fetchEstablishments = useCallback(async () => {
    if (!mounted.current) return
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
      const filters: Record<string, string> = {}
      if (role === 'merchant' && userId) {
        filters.owner_id = `eq.${userId}`
      } else if (role !== 'admin') {
        filters.is_active = 'eq.true'
      }

      const { data, error } = await restQuery<Establishment[]>('establishments', {
        select: '*',
        filters,
      })

      if (!mounted.current) return

      if (error) {
        console.error('useEstablishments error:', error)
        setError(error.message)
        setEstablishments([])
      } else if (data) {
        setEstablishments(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      if (mounted.current) {
        setError('Error al cargar establecimientos')
        setEstablishments([])
      }
    } finally {
      clearTimeout(timeout)
      if (mounted.current) setIsLoading(false)
    }
  }, [userId, role])

  useEffect(() => {
    fetchEstablishments()
  }, [fetchEstablishments])

  const createEstablishment = useCallback(
    async (est: Omit<Establishment, 'id' | 'created_at'>) => {
      const { data, error } = await restQuery<Establishment>('establishments', {
        method: 'POST',
        body: est,
        prefer: 'return=representation',
      })
      if (error) throw new Error(error.message)
      if (data) {
        setEstablishments((prev) => [...prev, data])
        return data
      }
      throw new Error('No data returned')
    },
    [],
  )

  const updateEstablishment = useCallback(
    async (id: string, updates: Partial<Establishment>) => {
      const { data, error } = await restQuery<Establishment>('establishments', {
        method: 'PATCH',
        body: updates,
        filters: { id: `eq.${id}` },
        prefer: 'return=representation',
      })
      if (error) throw new Error(error.message)
      if (data) {
        setEstablishments((prev) => prev.map((e) => (e.id === id ? data : e)))
        return data
      }
      throw new Error('No data returned')
    },
    [],
  )

  return { establishments, isLoading, error, refetch: fetchEstablishments, createEstablishment, updateEstablishment }
}
