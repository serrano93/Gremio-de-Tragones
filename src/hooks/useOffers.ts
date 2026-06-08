import { useState, useEffect, useCallback, useRef } from 'react'
import { restQuery } from '../lib/supabase'
import type { Offer } from '../types'

const FETCH_TIMEOUT = 8000

export function useOffers(userRank: string) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const fetchOffers = useCallback(async () => {
    if (!mounted.current) return
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
      const { data, error } = await restQuery<Offer[]>('offers', {
        select: '*, establishment:establishments(id, name)',
        filters: { is_active: 'eq.true' },
      })

      if (!mounted.current) return

      if (error) {
        console.error('useOffers error:', error)
        setError(error.message)
        setOffers([])
      } else if (data) {
        const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
        const userRankIdx = rankOrder.indexOf(userRank || 'F')
        const arr = Array.isArray(data) ? data : []
        const filtered = arr.filter((o) => {
          const reqIdx = rankOrder.indexOf(o.required_rank)
          return reqIdx <= userRankIdx
        })
        setOffers(filtered)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (mounted.current) setError('Tiempo de espera agotado')
      } else {
        if (mounted.current) setError('Error al cargar ofertas')
      }
      if (mounted.current) setOffers([])
    } finally {
      clearTimeout(timeout)
      if (mounted.current) setIsLoading(false)
    }
  }, [userRank])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  return { offers, isLoading, error, refetch: fetchOffers }
}
