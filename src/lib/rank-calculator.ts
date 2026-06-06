import { RANK_THRESHOLDS, RANKS_ASC } from './constants'

export function calculateRank(xp: number): string {
  let currentRank = 'F'
  for (const rank of RANKS_ASC) {
    if (xp >= RANK_THRESHOLDS[rank]) {
      currentRank = rank
    } else {
      break
    }
  }
  return currentRank
}

export function getNextRankThreshold(xp: number): { current: string; next: string | null; xpNeeded: number } {
  const current = calculateRank(xp)
  const currentIdx = RANKS_ASC.indexOf(current)

  if (currentIdx >= RANKS_ASC.length - 1) {
    return { current, next: null, xpNeeded: 0 }
  }

  const next = RANKS_ASC[currentIdx + 1]
  const nextThreshold = RANK_THRESHOLDS[next]
  const xpNeeded = nextThreshold - xp

  return { current, next, xpNeeded }
}

export function getRankProgress(xp: number): { rank: string; progress: number } {
  const rank = calculateRank(xp)
  const rankIdx = RANKS_ASC.indexOf(rank)
  const currentThreshold = RANK_THRESHOLDS[rank]

  if (rankIdx >= RANKS_ASC.length - 1) {
    return { rank, progress: 100 }
  }

  const nextThreshold = RANK_THRESHOLDS[RANKS_ASC[rankIdx + 1]]
  const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100

  return { rank, progress: Math.min(Math.max(progress, 0), 100) }
}
