import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, AuthState } from '../types'
import { getOrCreateGuestProfile, clearGuestProfile } from '../lib/storage'

const FETCH_PROFILE_TIMEOUT = 8000
const GET_SESSION_TIMEOUT = 10000

async function fetchProfileWithTimeout(authId: string): Promise<Profile | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_PROFILE_TIMEOUT)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_id', authId)
      .single()

    clearTimeout(timeout)

    if (error) {
      console.error('fetchProfile error:', error)
      return null
    }
    return data as Profile
  } catch (err) {
    clearTimeout(timeout)
    if ((err as Error).name === 'AbortError') {
      console.error('fetchProfile timeout')
    } else {
      console.error('fetchProfile exception:', err)
    }
    return null
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isGuest: true,
  })

  const initStarted = useRef(false)
  const authListenerRef = useRef<{ data: { subscription: { unsubscribe: () => void } } } | null>(null)

  const setGuestMode = useCallback(() => {
    getOrCreateGuestProfile()
      .then((guest) => {
        setState({
          user: {
            id: guest.guestId,
            auth_id: null,
            email: null,
            full_name: 'Aventurero Invitado',
            role: 'adventurer',
            xp: guest.xp,
            gold: 0,
            rank: 'F',
            avatar_url: null,
            created_at: guest.createdAt,
          },
          session: null,
          isLoading: false,
          isGuest: true,
        })
      })
      .catch((err) => {
        console.error('setGuestMode error:', err)
        setState({
          user: {
            id: 'fallback-guest',
            auth_id: null,
            email: null,
            full_name: 'Aventurero Invitado',
            role: 'adventurer',
            xp: 0,
            gold: 0,
            rank: 'F',
            avatar_url: null,
            created_at: new Date().toISOString(),
          },
          session: null,
          isLoading: false,
          isGuest: true,
        })
      })
  }, [])

  const setUserFromSession = useCallback(async (session: import('@supabase/supabase-js').Session): Promise<boolean> => {
    try {
      const profile = await fetchProfileWithTimeout(session.user.id)
      if (profile) {
        setState({
          user: profile,
          session,
          isLoading: false,
          isGuest: false,
        })
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

    const init = async () => {
      try {
        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), GET_SESSION_TIMEOUT)),
        ])

        if (error) {
          console.error('getSession error:', error)
          setGuestMode()
          return
        }

        if (data.session) {
          const success = await setUserFromSession(data.session)
          if (success) return
          try {
            await supabase.auth.signOut()
          } catch {
            // ignore signout errors
          }
        }
      } catch (err) {
        console.error('Auth init exception:', err)
      }

      setGuestMode()
    }

    init().catch((err) => {
      console.error('Auth init uncaught error:', err)
      setGuestMode()
    })

    authListenerRef.current = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.id)

      if (event === 'SIGNED_IN' && session) {
        const success = await setUserFromSession(session)
        if (!success) {
          console.error('Signed in but no profile found')
          await supabase.auth.signOut()
        }
      }

      if (event === 'SIGNED_OUT') {
        await clearGuestProfile()
        setGuestMode()
      }
    })

    return () => {
      authListenerRef.current?.data.subscription.unsubscribe()
    }
  }, [setUserFromSession, setGuestMode])

  const refreshProfile = useCallback(async () => {
    const currentUser = state.user
    if (currentUser && !state.isGuest && currentUser.auth_id) {
      const profile = await fetchProfileWithTimeout(currentUser.auth_id)
      if (profile) {
        setState((prev) => ({ ...prev, user: profile }))
      }
    }
  }, [state.user, state.isGuest])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { ...state, refreshProfile, signOut }
}