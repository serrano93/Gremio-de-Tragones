import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, AuthState } from '../types'
import { getOrCreateGuestProfile, clearGuestProfile } from '../lib/storage'

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isGuest: true,
  })

  const initStarted = useRef(false)

  const fetchProfile = useCallback(async (authId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_id', authId)
        .single()

      if (error) {
        console.error('fetchProfile error:', error)
        return null
      }
      return data as Profile
    } catch (err) {
      console.error('fetchProfile exception:', err)
      return null
    }
  }, [])

  const setUserFromSession = useCallback(async (session: import('@supabase/supabase-js').Session) => {
    const profile = await fetchProfile(session.user.id)
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
  }, [fetchProfile])

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

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

    let authListener: ReturnType<typeof supabase.auth.onAuthStateChange> | null = null

    const init = async () => {
      try {
        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 10000)),
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
          setGuestMode()
          return
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

    authListener = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.id)

      if (event === 'SIGNED_IN' && session) {
        const success = await setUserFromSession(session)
        if (!success) {
          console.error('Signed in but no profile found, falling back to guest')
          await supabase.auth.signOut()
        }
      }

      if (event === 'SIGNED_OUT') {
        await clearGuestProfile()
        setGuestMode()
      }
    })

    return () => {
      authListener?.data.subscription.unsubscribe()
    }
  }, [setUserFromSession, setGuestMode])

  const refreshProfile = useCallback(async () => {
    if (state.user && !state.isGuest && state.user.auth_id) {
      const profile = await fetchProfile(state.user.auth_id)
      if (profile) {
        setState((prev) => ({ ...prev, user: profile }))
      }
    }
  }, [state.user, state.isGuest, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { ...state, refreshProfile, signOut }
}