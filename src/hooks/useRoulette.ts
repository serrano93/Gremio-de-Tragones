import { useState, useCallback, useEffect, useRef } from 'react'
import { claimMinigameReward, getMinigameHighscore, isUserLoggedIn } from '../lib/game-api'
import { pickRouletteResult, ROULETTE_SPIN_COST, ROULETTE_COOLDOWN_MS, type RouletteResult } from '../lib/game-rewards'
import localforage from 'localforage'

const GUEST_HISTORY_KEY = 'minigame_roulette_history'
const GUEST_GOLD_KEY = 'guestProfile'
const GUEST_LAST_SPIN_KEY = 'minigame_roulette_last_spin'

interface GuestProfile {
  guestId: string
  xp: number
  gold: number
  completedMissions: string[]
  createdAt: string
}

interface RouletteSpin {
  id: string
  result: RouletteResult
  timestamp: number
  xpEarned: number
  goldEarned: number
}

export function useRoulette() {
  const [spinning, setSpinning] = useState(false)
  const [lastResult, setLastResult] = useState<RouletteResult | null>(null)
  const [lastSpinAt, setLastSpinAt] = useState<number>(0)
  const [history, setHistory] = useState<RouletteSpin[]>([])
  const [highscore, setHighscore] = useState<number>(0)
  const [userGold, setUserGold] = useState<number>(0)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const cooldownTimerRef = useRef<number | null>(null)

  const refreshHighscore = useCallback(async () => {
    if (!isUserLoggedIn()) return
    const hs = await getMinigameHighscore('roulette')
    setHighscore(hs)
  }, [])

  const loadHistory = useCallback(async () => {
    if (isUserLoggedIn()) return
    const stored = (await localforage.getItem<RouletteSpin[]>(GUEST_HISTORY_KEY)) ?? []
    setHistory(stored.slice(-20))
  }, [])

  const loadLastSpinTime = useCallback(async () => {
    if (isUserLoggedIn()) return
    const last = (await localforage.getItem<number>(GUEST_LAST_SPIN_KEY)) ?? 0
    setLastSpinAt(last)
  }, [])

  const loadGuestGold = useCallback(async () => {
    if (isUserLoggedIn()) return
    const profile = (await localforage.getItem<GuestProfile>(GUEST_GOLD_KEY))
    setUserGold(profile?.gold ?? 0)
  }, [])

  useEffect(() => {
    refreshHighscore()
    loadHistory()
    loadLastSpinTime()
    loadGuestGold()
  }, [refreshHighscore, loadHistory, loadLastSpinTime, loadGuestGold])

  useEffect(() => {
    const update = () => {
      if (lastSpinAt === 0) {
        setCooldownRemaining(0)
        return
      }
      const elapsed = Date.now() - lastSpinAt
      const remaining = Math.max(0, ROULETTE_COOLDOWN_MS - elapsed)
      setCooldownRemaining(remaining)
    }
    update()
    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current)
    }
    cooldownTimerRef.current = window.setInterval(update, 1000)
    return () => {
      if (cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current)
      }
    }
  }, [lastSpinAt])

  const spin = useCallback(async () => {
    if (spinning) return { success: false, error: 'Ya hay un giro en curso' }
    if (cooldownRemaining > 0) {
      return { success: false, error: `Espera ${Math.ceil(cooldownRemaining / 1000)}s` }
    }
    if (!isUserLoggedIn() && userGold < ROULETTE_SPIN_COST) {
      return { success: false, error: `Necesitas ${ROULETTE_SPIN_COST} oro` }
    }

    setSpinning(true)
    const result = pickRouletteResult()
    setLastResult(result)

    if (isUserLoggedIn()) {
      const claim = await claimMinigameReward(
        'roulette',
        result.xp,
        result.gold,
        1,
        { result_id: result.id, label: result.label }
      )
      setSpinning(false)
      if (claim.success) {
        const now = Date.now()
        setLastSpinAt(now)
        await refreshHighscore()
        return { success: true, result, claim }
      }
      return { success: false, error: claim.error }
    } else {
      const profile = (await localforage.getItem<GuestProfile>(GUEST_GOLD_KEY)) ?? {
        guestId: 'unknown',
        xp: 0,
        gold: 0,
        completedMissions: [],
        createdAt: new Date().toISOString(),
      }
      const newGold = Math.max(0, (profile.gold ?? 0) - ROULETTE_SPIN_COST)
      const newXp = (profile.xp ?? 0) + result.xp
      const updatedProfile: GuestProfile = { ...profile, gold: newGold, xp: newXp }
      await localforage.setItem(GUEST_GOLD_KEY, updatedProfile)
      const now = Date.now()
      const newSpin: RouletteSpin = {
        id: `spin-${now}`,
        result,
        timestamp: now,
        xpEarned: result.xp,
        goldEarned: result.gold - ROULETTE_SPIN_COST,
      }
      const existing = (await localforage.getItem<RouletteSpin[]>(GUEST_HISTORY_KEY)) ?? []
      const newHistory = [...existing, newSpin].slice(-20)
      await localforage.setItem(GUEST_HISTORY_KEY, newHistory)
      await localforage.setItem(GUEST_LAST_SPIN_KEY, now)
      setHistory(newHistory)
      setUserGold(newGold)
      setLastSpinAt(now)
      setSpinning(false)
      return { success: true, result, claim: { success: true } }
    }
  }, [spinning, cooldownRemaining, userGold, refreshHighscore])

  return {
    spinning,
    lastResult,
    history,
    highscore,
    userGold,
    cooldownRemaining,
    spinCost: ROULETTE_SPIN_COST,
    canSpin: !spinning && cooldownRemaining === 0,
    spin,
    refreshHighscore,
  }
}
