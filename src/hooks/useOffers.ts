import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Offer } from '../types'

export function useOffers(userRank: string) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchOffers = useCallback(async () => {
    setIsLoading(true)
    const rankValue = userRank || 'F'

    const { data } = await supabase
      .from('offers')
      .select('*, establishment:establishments(id, name)')
      .eq('is_active', true)
      .order('required_rank')
      .order('title')

    if (data) {
      const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
      const userRankIdx = rankOrder.indexOf(rankValue)
      const filtered = (data as Offer[]).filter((o) => {
        const reqIdx = rankOrder.indexOf(o.required_rank)
        return reqIdx <= userRankIdx
      })
      setOffers(filtered)
    }
    setIsLoading(false)
  }, [userRank])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  return { offers, isLoading, fetchOffers }
}
