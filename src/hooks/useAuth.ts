import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, AuthState } from '../types'
import { getOrCreateGuestProfile, clearGuestProfile } from '../lib/storage'

const FETCH_PROFILE_TIMEOUT = 8000
const GET_SESSION_TIMEOUT = 10000

async function fetchProfileWithTimeout(authId: string): Promise<Profile | null> {
  try {
    const { data, error } = await Promise.race([
      supabase
        .from('profiles')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('fetchProfile timeout')), FETCH_PROFILE_TIMEOUT)),
    ])

    if (error) {
      console.error('fetchProfile error:', error)
      return null
    }
    return (data as Profile) ?? null
  } catch (err) {
    console.error('fetchProfile exception:', err)
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
  const mounted = useRef(true)
  const authListenerRef = useRef<{ data: { subscription: { unsubscribe: () => void } } } | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const setGuestMode = useCallback(() => {
    getOrCreateGuestProfile()
      .then((guest) => {
        if (!mounted.current) return
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
        if (!mounted.current) return
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
    if (!mounted.current) return false

    let profile = await fetchProfileWithTimeout(session.user.id)
    if (!mounted.current) return false

    if (!profile) {
      console.warn('Profile no encontrado, intentando crear con ensure_user_profile...')
      try {
        const { data, error } = await supabase.rpc('ensure_user_profile', {
          p_auth_id: session.user.id,
          p_email: session.user.email || null,
          p_full_name: (session.user.user_metadata?.full_name as string) || null,
        })
        if (error) {
          console.error('ensure_user_profile error:', error)
        } else if (data?.success) {
          profile = await fetchProfileWithTimeout(session.user.id)
        }
      } catch (rpcErr) {
        console.error('ensure_user_profile exception:', rpcErr)
      }
    }

    if (!mounted.current) return false

    if (profile) {
      setState({
        user: profile,
        session,
        isLoading: false,
        isGuest: false,
      })
      return true
    }

    setState({
      user: null,
      session: null,
      isLoading: false,
      isGuest: true,
      profileError: true,
    } as AuthState)
    return false
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

        if (!mounted.current) return

        if (error) {
          console.error('getSession error:', error)
          await supabase.auth.signOut().catch(() => {})
          if (mounted.current) setGuestMode()
          return
        }

        if (data.session) {
          // Verificar que la sesión no esté expirada
          const expiresAt = data.session.expires_at
          if (expiresAt && expiresAt * 1000 < Date.now()) {
            console.warn('Sesión expirada, haciendo signOut explícito')
            await supabase.auth.signOut().catch(() => {})
            if (mounted.current) setGuestMode()
            return
          }

          const success = await setUserFromSession(data.session)
          if (success) return
        }
      } catch (err) {
        console.error('Auth init exception:', err)
      }

      if (mounted.current) {
        setGuestMode()
      }
    }

    init().catch((err) => {
      console.error('Auth init uncaught error:', err)
      if (mounted.current) setGuestMode()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current) return
      console.log('Auth event:', event, session?.user?.id)

      if (event === 'INITIAL_SESSION') return

      if (event === 'SIGNED_IN' && session) {
        const success = await setUserFromSession(session)
        if (!success) {
          console.warn('Signed in but profile not loaded')
        }
      }

      if (event === 'SIGNED_OUT') {
        await clearGuestProfile()
        if (mounted.current) setGuestMode()
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        await setUserFromSession(session)
      }
    })

    authListenerRef.current = { data: { subscription } }

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [setUserFromSession, setGuestMode])

  const refreshProfile = useCallback(async () => {
    const currentUser = state.user
    if (currentUser && !state.isGuest && currentUser.auth_id) {
      const profile = await fetchProfileWithTimeout(currentUser.auth_id)
      if (mounted.current && profile) {
        setState((prev) => ({ ...prev, user: profile }))
      }
    }
  }, [state.user, state.isGuest])

  // Función helper: limpia la sesión actual (para usar antes de un nuevo login)
  const clearSession = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('signOut during clearSession:', err)
    }
  }, [])

  const signOut = useCallback(async () => {
    await clearGuestProfile()
    await supabase.auth.signOut()
    if (mounted.current) setGuestMode()
  }, [setGuestMode])

  return { ...state, refreshProfile, signOut, clearSession }
}
