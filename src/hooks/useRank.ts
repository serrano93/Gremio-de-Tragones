import { useMemo } from 'react'
import { calculateRank, getNextRankThreshold, getRankProgress } from '../lib/rank-calculator'
import { RANK_NAMES, RANK_COLORS } from '../lib/constants'

export function useRank(xp: number) {
  const rank = useMemo(() => calculateRank(xp), [xp])
  const nextRank = useMemo(() => getNextRankThreshold(xp), [xp])
  const progress = useMemo(() => getRankProgress(xp), [xp])
  const rankName = useMemo(() => RANK_NAMES[rank] || 'Desconocido', [rank])
  const colors = useMemo(() => RANK_COLORS[rank] || RANK_COLORS.F, [rank])

  return { rank, rankName, nextRank, progress, colors }
}
