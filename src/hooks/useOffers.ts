import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Offer } from '../types'

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
    const rankValue = userRank || 'F'

    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, establishment:establishments(id, name)')
        .eq('is_active', true)
        .order('required_rank', { ascending: true })
        .order('title', { ascending: true })

      if (!mounted.current) return

      if (error) {
        console.error('useOffers error:', error)
        setError(error.message)
        setOffers([])
      } else if (data) {
        const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
        const userRankIdx = rankOrder.indexOf(rankValue)
        const filtered = (data as Offer[]).filter((o) => {
          const reqIdx = rankOrder.indexOf(o.required_rank)
          return reqIdx <= userRankIdx
        })
        setOffers(filtered)
      }
    } catch (err) {
      console.error('useOffers exception:', err)
      if (mounted.current) {
        setError('Error al cargar ofertas')
        setOffers([])
      }
    } finally {
      if (mounted.current) setIsLoading(false)
    }
  }, [userRank])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  return { offers, isLoading, error, refetch: fetchOffers }
}
