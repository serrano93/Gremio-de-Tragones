import { useState, useEffect, useCallback, useRef } from 'react'
import { claimMinigameReward, getCurrentUserGold, isUserLoggedIn } from '../lib/game-api'
import { HOARD_LEVELS, HOARD_MAX_OFFLINE_MS } from '../lib/game-rewards'
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

export function useDragonHoard() {
  const [state, setState] = useState<HoardState>(getDefaultHoardState)
  const [claiming, setClaiming] = useState(false)
  const [lastClaimedAmount, setLastClaimedAmount] = useState(0)
  const [userGold, setUserGold] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const refreshUserGold = useCallback(async () => {
    const gold = await getCurrentUserGold()
    setUserGold(gold)
  }, [])

  useEffect(() => {
    void refreshUserGold()
  }, [refreshUserGold])

  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const pending = calculatePendingGold(prev, Date.now())
        if (pending !== prev.pendingGold) {
          const newState = { ...prev, pendingGold: pending }
          if (!isUserLoggedIn()) {
            void localforage.setItem(GUEST_HOARD_KEY, newState)
          }
          return newState
        }
        return prev
      })
    }
    tick()
    intervalRef.current = window.setInterval(tick, 30000)
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [])

  const claim = useCallback(async () => {
    if (state.pendingGold <= 0) return
    setClaiming(true)
    const amount = state.pendingGold
    if (isUserLoggedIn()) {
      await claimMinigameReward('hoard', 0, amount, state.level)
    } else {
      const profile = (await localforage.getItem<{ xp: number; gold: number }>('guestProfile'))
      if (profile) {
        profile.gold = (profile.gold || 0) + amount
        await localforage.setItem('guestProfile', profile)
      }
      const newState: HoardState = { level: state.level, lastClaim: Date.now(), pendingGold: 0 }
      await localforage.setItem(GUEST_HOARD_KEY, newState)
      setState(newState)
    }
    setLastClaimedAmount(amount)
    await refreshUserGold()
    setClaiming(false)
  }, [state, refreshUserGold])

  const upgrade = useCallback(async () => {
    const current = HOARD_LEVELS.find((l) => l.level === state.level) ?? HOARD_LEVELS[0]
    const next = HOARD_LEVELS.find((l) => l.level === current.level + 1)
    if (!next) return
    if (userGold < next.cost) return

    if (isUserLoggedIn()) {
      const result = await claimMinigameReward('hoard', 0, -next.cost, current.level, {
        upgrade_to: next.level,
      } as Record<string, unknown>)
      if (result.success) {
        const newState: HoardState = { level: next.level, lastClaim: Date.now(), pendingGold: 0 }
        setState(newState)
        await refreshUserGold()
      }
    } else {
      const profile = (await localforage.getItem<{ xp: number; gold: number }>('guestProfile'))
      if (!profile) return
      profile.gold = (profile.gold || 0) - next.cost
      await localforage.setItem('guestProfile', profile)
      const newState: HoardState = { level: next.level, lastClaim: Date.now(), pendingGold: 0 }
      await localforage.setItem(GUEST_HOARD_KEY, newState)
      setState(newState)
      await refreshUserGold()
    }
  }, [state.level, userGold, refreshUserGold])

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
