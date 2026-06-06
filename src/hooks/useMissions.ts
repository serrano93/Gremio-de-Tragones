import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Mission, UserMission } from '../types'

export function useMissions(userRank: string, profileId: string | null, isGuest: boolean) {
  const [missions, setMissions] = useState<Mission[]>([])
  const [userMissions, setUserMissions] = useState<UserMission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMissions = useCallback(async () => {
    setIsLoading(true)
    const rankValue = userRank || 'F'

    const { data } = await supabase
      .from('missions')
      .select('*, establishment:establishments(id, name)')
      .eq('is_active', true)
      .order('required_min_rank', { ascending: true })
      .order('xp_reward', { ascending: false })

    if (data) {
      // Client-side rank filtering for guest users
      const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S']
      const userRankIdx = rankOrder.indexOf(rankValue)
      const filtered = (data as Mission[]).filter((m) => {
        const reqIdx = rankOrder.indexOf(m.required_min_rank)
        return reqIdx <= userRankIdx
      })
      setMissions(filtered)
    }
    setIsLoading(false)
  }, [userRank])

  const fetchUserMissions = useCallback(async () => {
    if (!profileId || isGuest) {
      setUserMissions([])
      return
    }

    const { data } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', profileId)

    if (data) {
      setUserMissions(data as UserMission[])
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

  return { missions, userMissions, isLoading, fetchMissions, getMissionStatus }
}
