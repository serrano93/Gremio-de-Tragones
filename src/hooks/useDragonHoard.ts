import { useState, useEffect, useCallback, useRef } from 'react'
import { isUserLoggedIn } from '../lib/game-api'
import { HOARD_LEVELS, HOARD_MAX_OFFLINE_MS } from '../lib/game-rewards'
import {
  AUTH_STORAGE_KEY,
  supabaseUrlValue as supabaseUrl,
  supabaseAnonKeyValue as supabaseAnonKey,
  type StoredSession,
} from '../lib/supabase'
import localforage from 'localforage'

const GUEST_HOARD_KEY = 'minigame_hoard_state'

interface HoardState {
  level: number
  lastClaim: number
  pendingGold: number
}

function getDefaultHoardState(): HoardState {
  return { level: 1, lastClaim: Date.now(), pendingGold: 0 }
}

function calculatePendingGold(state: HoardState, now: number): number {
  const level = HOARD_LEVELS.find((l) => l.level === state.level) ?? HOARD_LEVELS[0]
  const elapsed = now - state.lastClaim
  if (elapsed <= 0) return state.pendingGold
  if (elapsed > HOARD_MAX_OFFLINE_MS) {
    const capped = HOARD_MAX_OFFLINE_MS
    return state.pendingGold + Math.floor((capped / 60000) * level.goldPerMin)
  }
  return state.pendingGold + Math.floor((elapsed / 60000) * level.goldPerMin)
}

const SUPABASE_URL = supabaseUrl
const SUPABASE_ANON_KEY = supabaseAnonKey

function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    if (!session?.access_token || !session.user?.id) return null
    return session
  } catch {
    return null
  }
}

interface HoardDbState {
  hoard_level: number
  hoard_last_claim: string
  gold: number
}

async function fetchHoardFromDb(): Promise<HoardDbState | null> {
  const session = getStoredSession()
  if (!session) return null
  try {
    // Try with hoard columns first
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=gold,hoard_level,hoard_last_claim&auth_id=eq.${session.user.id}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    )
    if (res.ok) {
      const rows = (await res.json()) as Array<{
        gold: number
        hoard_level: number | null
        hoard_last_claim: string | null
      }>
      if (!rows[0]) return null
      return {
        hoard_level: rows[0].hoard_level ?? 1,
        hoard_last_claim: rows[0].hoard_last_claim ?? new Date().toISOString(),
        gold: rows[0].gold ?? 0,
      }
    }
    return null
  } catch {
    return null
  }
}

async function patchHoard(payload: {
  gold?: number
  hoard_level?: number
  hoard_last_claim?: string
}): Promise<boolean> {
  const session = getStoredSession()
  if (!session) return false
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?auth_id=eq.${session.user.id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

export function useDragonHoard() {
  const [state, setState] = useState<HoardState>(getDefaultHoardState)
  const [claiming, setClaiming] = useState(false)
  const [lastClaimedAmount, setLastClaimedAmount] = useState(0)
  const [userGold, setUserGold] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const isLoggedIn = isUserLoggedIn()

  // Load initial state from DB or localforage
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (isLoggedIn) {
        const db = await fetchHoardFromDb()
        if (cancelled) return
        if (db) {
          // Check if DB has hoard columns; if not, use localforage for level/lastClaim
          const localStored = (await localforage.getItem<HoardState>(`${GUEST_HOARD_KEY}_logged`))
          let level: number
          let lastClaimMs: number
          if (localStored) {
            level = localStored.level
            lastClaimMs = localStored.lastClaim
          } else if (db.hoard_last_claim) {
            level = db.hoard_level
            lastClaimMs = new Date(db.hoard_last_claim).getTime()
          } else {
            level = 1
            lastClaimMs = Date.now()
          }
          const initial: HoardState = {
            level,
            lastClaim: lastClaimMs,
            pendingGold: 0,
          }
          initial.pendingGold = calculatePendingGold(initial, Date.now())
          setState(initial)
          setUserGold(db.gold)
        }
      } else {
        const stored = (await localforage.getItem<HoardState>(GUEST_HOARD_KEY))
        if (cancelled) return
        if (stored) {
          const newPending = calculatePendingGold(stored, Date.now())
          setState({ ...stored, pendingGold: newPending })
        }
        const profile = (await localforage.getItem<{ xp: number; gold: number }>('guestProfile'))
        if (cancelled) return
        setUserGold(profile?.gold ?? 0)
      }
      setLoaded(true)
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  // Tick: update pendingGold every 5s based on time elapsed
  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const pending = calculatePendingGold(prev, Date.now())
        if (pending !== prev.pendingGold) {
          return { ...prev, pendingGold: pending }
        }
        return prev
      })
    }
    if (loaded) tick()
    intervalRef.current = window.setInterval(tick, 5000)
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [loaded])

  const claim = useCallback(async () => {
    if (state.pendingGold <= 0) return
    setClaiming(true)
    const amount = state.pendingGold
    const nowIso = new Date().toISOString()
    if (isLoggedIn) {
      const newGold = userGold + amount
      // Try patching with hoard_last_claim; if it fails, just update gold
      let ok = await patchHoard({ gold: newGold, hoard_last_claim: nowIso })
      if (!ok) {
        ok = await patchHoard({ gold: newGold })
      }
      if (ok) {
        setUserGold(newGold)
        const newState: HoardState = { level: state.level, lastClaim: Date.now(), pendingGold: 0 }
        await localforage.setItem(`${GUEST_HOARD_KEY}_logged`, newState)
        setState(newState)
      }
    } else {
      const profile = (await localforage.getItem<{ xp: number; gold: number }>('guestProfile'))
      if (profile) {
        profile.gold = (profile.gold || 0) + amount
        await localforage.setItem('guestProfile', profile)
      }
      const newState: HoardState = { level: state.level, lastClaim: Date.now(), pendingGold: 0 }
      await localforage.setItem(GUEST_HOARD_KEY, newState)
      setUserGold((profile?.gold ?? 0) + amount)
      setState(newState)
    }
    setLastClaimedAmount(amount)
    setClaiming(false)
  }, [state, userGold, isLoggedIn])

  const upgrade = useCallback(async () => {
    const current = HOARD_LEVELS.find((l) => l.level === state.level) ?? HOARD_LEVELS[0]
    const next = HOARD_LEVELS.find((l) => l.level === current.level + 1)
    if (!next) return
    if (userGold < next.cost) return

    if (isLoggedIn) {
      const newGold = userGold - next.cost
      // Try the dedicated RPC first (migration 013)
      const sessionStr = localStorage.getItem(AUTH_STORAGE_KEY)
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr) as {
            access_token: string
            user: { id: string }
          }
          const res = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/purchase_hoard_upgrade`,
            {
              method: 'POST',
              headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ p_target_level: next.level }),
            }
          )
          if (res.ok) {
            const newState: HoardState = {
              level: next.level,
              lastClaim: Date.now(),
              pendingGold: 0,
            }
            await localforage.setItem(`${GUEST_HOARD_KEY}_logged`, newState)
            setState(newState)
            setUserGold(newGold)
            return
          }
        } catch {
          // Fall through to legacy PATCH
        }
      }
      // Fallback: PATCH gold + hoard fields directly
      let ok = await patchHoard({
        gold: newGold,
        hoard_level: next.level,
        hoard_last_claim: new Date().toISOString(),
      })
      if (!ok) {
        ok = await patchHoard({ gold: newGold })
      }
      if (ok) {
        const newState: HoardState = {
          level: next.level,
          lastClaim: Date.now(),
          pendingGold: 0,
        }
        await localforage.setItem(`${GUEST_HOARD_KEY}_logged`, newState)
        setState(newState)
        setUserGold(newGold)
      }
    } else {
      const profile = (await localforage.getItem<{ xp: number; gold: number }>('guestProfile'))
      if (!profile) return
      profile.gold = (profile.gold || 0) - next.cost
      await localforage.setItem('guestProfile', profile)
      const newState: HoardState = { level: next.level, lastClaim: Date.now(), pendingGold: 0 }
      await localforage.setItem(GUEST_HOARD_KEY, newState)
      setUserGold(profile.gold)
      setState(newState)
    }
  }, [state.level, userGold, isLoggedIn])

  const currentLevel = HOARD_LEVELS.find((l) => l.level === state.level) ?? HOARD_LEVELS[0]
  const nextLevel = HOARD_LEVELS.find((l) => l.level === state.level + 1)
  const canUpgrade = nextLevel !== undefined && userGold >= (nextLevel?.cost ?? Infinity)

  return {
    level: state.level,
    levelInfo: currentLevel,
    nextLevel,
    pendingGold: state.pendingGold,
    canUpgrade,
    upgradeCost: nextLevel?.cost ?? 0,
    userGold,
    lastClaimedAmount,
    claiming,
    claim,
    upgrade,
  }
}
