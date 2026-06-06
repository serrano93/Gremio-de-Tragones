import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getGuestProfile, clearGuestProfile } from '../lib/storage'
import { MIGRATION_XP_THRESHOLD } from '../lib/constants'
import type { Profile } from '../types'

export function useGuestSync() {
  const migrateGuestProgress = useCallback(async (userId: string): Promise<Profile | null> => {
    const guest = await getGuestProfile()
    if (!guest) return null

    const guestXp = guest.xp >= MIGRATION_XP_THRESHOLD ? guest.xp : 0

    const { data, error } = await supabase.rpc('migrate_guest_progress', {
      p_auth_id: userId,
      p_guest_xp: guestXp,
    })

    if (error) {
      console.error('Migration error:', error)
      return null
    }

    // RPC returns {success, xp, rank, profile_id}
    const result = data as { success: boolean; profile_id: string; xp: number; rank: string }

    if (!result?.success) return null

    await clearGuestProfile()

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', result.profile_id)
      .single()

    return profile as Profile | null
  }, [])

  return { migrateGuestProgress }
}
