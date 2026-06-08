import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Mission, UserMission } from '../types'

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
    const rankValue = userRank || 'F'

    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*, establishment:establishments(id, name)')
        .eq('is_active', true)
        .order('required_min_rank', { ascending: true })
        .order('xp_reward', { ascending: false })

      if (!mounted.current) return

      if (error) {
        console.error('useMissions error:', error)
        setError(error.message)
        setMissions([])
      } else if (data) {
        const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
        const userRankIdx = rankOrder.indexOf(rankValue)
        const filtered = (data as Mission[]).filter((m) => {
          const reqIdx = rankOrder.indexOf(m.required_min_rank)
          return reqIdx <= userRankIdx
        })
        setMissions(filtered)
      }
    } catch (err) {
      console.error('useMissions exception:', err)
      if (mounted.current) {
        setError('Error al cargar misiones')
        setMissions([])
      }
    } finally {
      if (mounted.current) setIsLoading(false)
    }
  }, [userRank, profileId, isGuest])

  const fetchUserMissions = useCallback(async () => {
    if (!mounted.current) return
    if (!profileId || isGuest) {
      setUserMissions([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', profileId)

      if (!mounted.current) return
      if (error) {
        console.error('useMissions user_missions error:', error)
        setUserMissions([])
      } else if (data) {
        setUserMissions(data as UserMission[])
      }
    } catch (err) {
      console.error('useMissions user_missions exception:', err)
      if (mounted.current) setUserMissions([])
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
