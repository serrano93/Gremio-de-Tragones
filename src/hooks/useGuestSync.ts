import { useCallback } from 'react'
import { restRpc, supabaseUrlValue, supabaseAnonKeyValue, getStoredSession } from '../lib/supabase'
import { getGuestProfile, clearGuestProfile } from '../lib/storage'
import { MIGRATION_XP_THRESHOLD } from '../lib/constants'
import type { Profile } from '../types'

export function useGuestSync() {
  const migrateGuestProgress = useCallback(async (userId: string): Promise<Profile | null> => {
    const guest = await getGuestProfile()
    if (!guest) return null

    const guestXp = guest.xp >= MIGRATION_XP_THRESHOLD ? guest.xp : 0

    const { data, error } = await restRpc<{
      success: boolean
      profile_id: string
      xp: number
      rank: string
    }>('migrate_guest_progress', {
      p_auth_id: userId,
      p_guest_xp: guestXp,
    })

    if (error) {
      console.error('Migration error:', error)
      return null
    }

    if (!data?.success) return null

    await clearGuestProfile()

    const session = getStoredSession()
    const res = await fetch(
      `${supabaseUrlValue}/rest/v1/profiles?select=*&id=eq.${data.profile_id}&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKeyValue,
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKeyValue}`,
        },
      }
    )

    if (res.ok) {
      const profiles = await res.json()
      if (Array.isArray(profiles) && profiles.length > 0) {
        return profiles[0] as Profile
      }
    }
    return null
  }, [])

  return { migrateGuestProgress }
}
