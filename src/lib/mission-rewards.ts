import { RANK_THRESHOLDS, RANKS_ASC } from './constants'

export interface MissionReward {
  xp: number
  gold: number
}

export const MISSION_REWARDS: Record<string, MissionReward> = {
  F: { xp: 20, gold: 200 },
  E: { xp: 40, gold: 400 },
  D: { xp: 60, gold: 600 },
  C: { xp: 80, gold: 800 },
  B: { xp: 120, gold: 1200 },
  A: { xp: 180, gold: 1800 },
  S: { xp: 200, gold: 2000 },
}

export type RewardTier = 'low' | 'mid' | 'high'

export function getRewardTier(rank: string): RewardTier {
  if (rank === 'F' || rank === 'E' || rank === 'D' || rank === 'C') return 'low'
  if (rank === 'B' || rank === 'A') return 'mid'
  return 'high'
}

export const TIER_LIMITS: Record<RewardTier, number> = {
  low: 3,
  mid: 2,
  high: 1,
}

export const TIER_LABELS: Record<RewardTier, string> = {
  low: 'F-C',
  mid: 'B-A',
  high: 'S',
}

export interface MerchantMissionLimit {
  tier: RewardTier
  used: number
  limit: number
  remaining: number
  canCreate: boolean
}

export function computeMissionLimits(missions: Array<{ required_min_rank: string }>): Record<RewardTier, MerchantMissionLimit> {
  const result: Record<RewardTier, MerchantMissionLimit> = {
    low: { tier: 'low', used: 0, limit: TIER_LIMITS.low, remaining: TIER_LIMITS.low, canCreate: true },
    mid: { tier: 'mid', used: 0, limit: TIER_LIMITS.mid, remaining: TIER_LIMITS.mid, canCreate: true },
    high: { tier: 'high', used: 0, limit: TIER_LIMITS.high, remaining: TIER_LIMITS.high, canCreate: true },
  }
  for (const m of missions) {
    const tier = getRewardTier(m.required_min_rank)
    result[tier].used += 1
  }
  for (const tier of Object.keys(result) as RewardTier[]) {
    const r = result[tier]
    r.remaining = Math.max(0, r.limit - r.used)
    r.canCreate = r.used < r.limit
  }
  return result
}

export function canCreateMissionAtRank(missions: Array<{ required_min_rank: string }>, rank: string): { allowed: boolean; reason?: string } {
  const tier = getRewardTier(rank)
  const limits = computeMissionLimits(missions)
  const r = limits[tier]
  if (!r.canCreate) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${r.limit} misión${r.limit === 1 ? '' : 'es'} de rango ${TIER_LABELS[tier]} por comerciante.`,
    }
  }
  return { allowed: true }
}

export interface RankProgressionStep {
  fromRank: string
  toRank: string
  xpRequired: number
  missionsNeeded: number
}

export function computeRankProgression(): RankProgressionStep[] {
  const steps: RankProgressionStep[] = []
  for (let i = 0; i < RANKS_ASC.length - 1; i += 1) {
    const from = RANKS_ASC[i]
    const to = RANKS_ASC[i + 1]
    const xpRequired = RANK_THRESHOLDS[to] - RANK_THRESHOLDS[from]
    const reward = MISSION_REWARDS[from]
    const missionsNeeded = Math.ceil(xpRequired / reward.xp)
    steps.push({ fromRank: from, toRank: to, xpRequired, missionsNeeded })
  }
  return steps
}
