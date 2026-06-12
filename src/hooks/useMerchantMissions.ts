import { useState, useEffect, useCallback, useRef } from 'react'
import { restQuery } from '../lib/supabase'
import type { Mission } from '../types'

const FETCH_TIMEOUT = 8000

export function useMerchantMissions(establishmentIds: string[]) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const fetchMissions = useCallback(async () => {
    if (!mounted.current) return
    setIsLoading(true)
    setError(null)

    if (establishmentIds.length === 0) {
      setMissions([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
      const filters: Record<string, string> = {
        is_active: 'neq.false',
        order: 'created_at.desc',
      }
      const inFilter = `in.(${establishmentIds.join(',')})`
      filters.establishment_id = inFilter

      const { data, error } = await restQuery<Mission[]>('missions', {
        select: '*',
        filters,
      })

      if (!mounted.current) return
      if (error) {
        console.error('useMerchantMissions error:', error)
        setError(error.message)
        setMissions([])
      } else {
        setMissions(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      if (mounted.current) {
        setError('Error al cargar misiones')
        setMissions([])
      }
    } finally {
      clearTimeout(timeout)
      if (mounted.current) setIsLoading(false)
    }
  }, [establishmentIds.join(',')])

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  const createMission = useCallback(
    async (mission: Omit<Mission, 'id' | 'created_at'>) => {
      const { data, error } = await restQuery<Mission>('missions', {
        method: 'POST',
        body: mission,
        prefer: 'return=representation',
      })
      if (error) throw new Error(error.message)
      if (data) {
        const created = Array.isArray(data) ? data[0] : data
        setMissions((prev) => [created, ...prev])
        return created
      }
      throw new Error('No data returned')
    },
    [],
  )

  const updateMission = useCallback(
    async (id: string, updates: Partial<Mission>) => {
      const { data, error } = await restQuery<Mission>('missions', {
        method: 'PATCH',
        body: updates,
        filters: { id: `eq.${id}` },
        prefer: 'return=representation',
      })
      if (error) throw new Error(error.message)
      if (data) {
        const updated = Array.isArray(data) ? data[0] : data
        setMissions((prev) => prev.map((m) => (m.id === id ? updated : m)))
        return updated
      }
      throw new Error('No data returned')
    },
    [],
  )

  const deleteMission = useCallback(async (id: string) => {
    const { error } = await restQuery('missions', {
      method: 'DELETE',
      filters: { id: `eq.${id}` },
    })
    if (error) throw new Error(error.message)
    setMissions((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      return updateMission(id, { is_active: isActive })
    },
    [updateMission],
  )

  return {
    missions,
    isLoading,
    error,
    refetch: fetchMissions,
    createMission,
    updateMission,
    deleteMission,
    toggleActive,
  }
}

export function useMerchantOffers(establishmentIds: string[]) {
  const [offers, setOffers] = useState<any[]>([])
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

    if (establishmentIds.length === 0) {
      setOffers([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
      const filters: Record<string, string> = {
        order: 'created_at.desc',
      }
      filters.establishment_id = `in.(${establishmentIds.join(',')})`

      const { data, error } = await restQuery<any[]>('offers', {
        select: '*',
        filters,
      })

      if (!mounted.current) return
      if (error) {
        console.error('useMerchantOffers error:', error)
        setError(error.message)
        setOffers([])
      } else {
        setOffers(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      if (mounted.current) {
        setError('Error al cargar ofertas')
        setOffers([])
      }
    } finally {
      clearTimeout(timeout)
      if (mounted.current) setIsLoading(false)
    }
  }, [establishmentIds.join(',')])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const createOffer = useCallback(async (offer: any) => {
    const { data, error } = await restQuery<any>('offers', {
      method: 'POST',
      body: offer,
      prefer: 'return=representation',
    })
    if (error) throw new Error(error.message)
    if (data) {
      const created = Array.isArray(data) ? data[0] : data
      setOffers((prev) => [created, ...prev])
      return created
    }
    throw new Error('No data returned')
  }, [])

  const updateOffer = useCallback(async (id: string, updates: any) => {
    const { data, error } = await restQuery<any>('offers', {
      method: 'PATCH',
      body: updates,
      filters: { id: `eq.${id}` },
      prefer: 'return=representation',
    })
    if (error) throw new Error(error.message)
    if (data) {
      const updated = Array.isArray(data) ? data[0] : data
      setOffers((prev) => prev.map((o) => (o.id === id ? updated : o)))
      return updated
    }
    throw new Error('No data returned')
  }, [])

  const deleteOffer = useCallback(async (id: string) => {
    const { error } = await restQuery('offers', {
      method: 'DELETE',
      filters: { id: `eq.${id}` },
    })
    if (error) throw new Error(error.message)
    setOffers((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      return updateOffer(id, { is_active: isActive })
    },
    [updateOffer],
  )

  return {
    offers,
    isLoading,
    error,
    refetch: fetchOffers,
    createOffer,
    updateOffer,
    deleteOffer,
    toggleActive,
  }
}
