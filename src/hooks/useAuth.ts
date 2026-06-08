import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getStoredSession,
  clearStoredSession,
  AUTH_STORAGE_KEY,
  supabaseUrlValue,
  supabaseAnonKeyValue,
  type StoredSession,
} from '../lib/supabase'
import type { Profile, AuthState } from '../types'
import { getOrCreateGuestProfile, clearGuestProfile as clearLocalGuest } from '../lib/storage'

const AUTH_TIMEOUT_MS = 15000
const PROFILE_TIMEOUT_MS = 10000
const REFRESH_AHEAD_MS = 5 * 60 * 1000

interface UseAuthState extends AuthState {
  profileError?: boolean
}

async function fetchProfileWithTimeout(authId: string, signal?: AbortSignal): Promise<Profile | null> {
  const session = getStoredSession()
  try {
    const url = new URL(`${supabaseUrlValue}/rest/v1/profiles`)
    url.searchParams.set('select', '*')
    url.searchParams.set('auth_id', `eq.${authId}`)
    url.searchParams.set('limit', '1')

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKeyValue,
        'Authorization': `Bearer ${session?.access_token || supabaseAnonKeyValue}`,
      },
      signal,
    })

    if (!res.ok) {
      console.error('fetchProfile HTTP', res.status)
      return null
    }
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as Profile
    }
    return null
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err
    }
    console.error('fetchProfile exception:', err)
    return null
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
      reject(new Error(errorMessage))
    }, ms)
    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timeout)
        reject(err)
      })
  })
}

export function useAuth() {
  const [state, setState] = useState<UseAuthState>({
    user: null,
    session: null,
    isLoading: true,
    isGuest: true,
  })

  const initStarted = useRef(false)
  const mounted = useRef(true)
  const intentionalSignOut = useRef(false)
  const initAbortController = useRef<AbortController | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (initAbortController.current) {
        initAbortController.current.abort()
      }
    }
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

  const loadUserFromStoredSession = useCallback(async (session: StoredSession) => {
    if (!mounted.current) return false

    const profile = await withTimeout(
      fetchProfileWithTimeout(session.user.id),
      PROFILE_TIMEOUT_MS,
      'fetchProfile timeout'
    ).catch(() => null)

    if (!mounted.current) return false

    if (profile) {
      setState({
        user: profile,
        session: session as unknown as import('@supabase/supabase-js').Session,
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
    })
    return false
  }, [])

  const refreshSessionIfNeeded = useCallback(async (): Promise<StoredSession | null> => {
    const session = getStoredSession()
    if (!session) return null

    const expiresAt = session.expires_at * 1000
    const now = Date.now()

    if (expiresAt - now > REFRESH_AHEAD_MS) {
      return session
    }

    try {
      const res = await fetch(`${supabaseUrlValue}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKeyValue,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      })

      if (!res.ok) {
        console.warn('refresh failed, clearing session')
        clearStoredSession()
        return null
      }

      const newSession = (await res.json()) as StoredSession
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession))
      console.log('Session refreshed, new expiry:', new Date(newSession.expires_at * 1000))
      return newSession
    } catch (err) {
      console.error('refresh error:', err)
      return null
    }
  }, [])

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

    const controller = new AbortController()
    initAbortController.current = controller

    const init = async () => {
      try {
        const session = await withTimeout(
          refreshSessionIfNeeded(),
          AUTH_TIMEOUT_MS,
          'refreshSession timeout'
        ).catch(() => null)

        if (!mounted.current) return

        if (!session) {
          setGuestMode()
          return
        }

        const success = await loadUserFromStoredSession(session)
        if (!mounted.current) return

        if (!success) {
          setGuestMode()
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Auth init exception:', err)
        if (mounted.current) setGuestMode()
      }
    }

    init()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_STORAGE_KEY) {
        const newSession = getStoredSession()
        if (newSession) {
          loadUserFromStoredSession(newSession)
        } else if (!intentionalSignOut.current) {
          setGuestMode()
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      controller.abort()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [loadUserFromStoredSession, refreshSessionIfNeeded, setGuestMode])

  const refreshProfile = useCallback(async () => {
    const currentUser = state.user
    if (currentUser && !state.isGuest && currentUser.auth_id) {
      const profile = await withTimeout(
        fetchProfileWithTimeout(currentUser.auth_id),
        PROFILE_TIMEOUT_MS,
        'fetchProfile timeout'
      ).catch(() => null)
      if (mounted.current && profile) {
        setState((prev) => ({ ...prev, user: profile }))
      }
    }
  }, [state.user, state.isGuest])

  const signOut = useCallback(async () => {
    intentionalSignOut.current = true
    await clearLocalGuest()
    clearStoredSession()
    try {
      await fetch(`${supabaseUrlValue}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKeyValue,
          'Authorization': `Bearer ${getStoredSession()?.access_token || supabaseAnonKeyValue}`,
        },
      })
    } catch {}
    if (mounted.current) setGuestMode()
    setTimeout(() => {
      intentionalSignOut.current = false
    }, 1000)
  }, [setGuestMode])

  return { ...state, refreshProfile, signOut }
}
