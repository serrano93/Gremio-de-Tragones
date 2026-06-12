import { useState, useEffect, useCallback, useRef } from 'react'
import { restQuery } from '../lib/supabase'
import type { Mission, UserMission } from '../types'

const FETCH_TIMEOUT = 8000

export function useMissions(userRank: string, profileId: string | null, isGuest: boolean) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [userMissions, setUserMissions] = useState<UserMission[]>([])
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
    if (isGuest || !profileId) {
      setMissions([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
      const { data, error } = await restQuery<Mission[] & { establishment?: { name: string } | { name: string }[] }>('missions', {
        select: '*, establishment:establishments(id, name)',
        filters: { is_active: 'eq.true' },
      })

      if (!mounted.current) return

      if (error) {
        console.error('useMissions error:', error)
        setError(error.message)
        setMissions([])
      } else if (data) {
        const arr = Array.isArray(data) ? data : []
        setMissions(arr)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('useMissions: fetch timeout')
        if (mounted.current) setError('Tiempo de espera agotado')
      } else {
        console.error('useMissions exception:', err)
        if (mounted.current) setError('Error al cargar misiones')
      }
      if (mounted.current) setMissions([])
    } finally {
      clearTimeout(timeout)
      if (mounted.current) setIsLoading(false)
    }
  }, [userRank, profileId, isGuest])

  const fetchUserMissions = useCallback(async () => {
    if (!mounted.current) return
    if (!profileId || isGuest) {
      setUserMissions([])
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
      const { data, error } = await restQuery<UserMission[]>('user_missions', {
        filters: { user_id: `eq.${profileId}` },
      })

      if (!mounted.current) return
      if (error) {
        console.error('useMissions user_missions error:', error)
        setUserMissions([])
      } else if (data) {
        setUserMissions(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      if (mounted.current) setUserMissions([])
    } finally {
      clearTimeout(timeout)
    }
  }, [profileId, isGuest])

  useEffect(() => {
    fetchMissions()
    fetchUserMissions()
  }, [fetchMissions, fetchUserMissions])

  const getMissionStatus = useCallback(
    (missionId: string): string | null => {
      const um = userMissions.find((m) => m.mission_id === missionId)
      return um?.status ?? null
    },
    [userMissions],
  )

  return { missions, userMissions, isLoading, error, refetch: fetchMissions, getMissionStatus }
}
