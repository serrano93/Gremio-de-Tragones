import { motion } from 'framer-motion'
import { XPBar } from '../ui/XPBar'
import { RANK_THRESHOLDS, RANKS_ASC, RANK_NAMES, RANK_COLORS } from '../../lib/constants'

interface RankProgressProps {
  xp: number
  currentRank: string
  progress: number
  nextRank: { current: string; next: string | null; xpNeeded: number }
}

export function RankProgress({ xp, currentRank, nextRank }: RankProgressProps) {
  const currentIdx = RANKS_ASC.indexOf(currentRank)
  const nextRankKey = nextRank.next
  const currentThreshold = RANK_THRESHOLDS[currentRank] || 0
  const nextThreshold = nextRankKey ? RANK_THRESHOLDS[nextRankKey] : currentThreshold + 1

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display-lg text-headline-md text-primary">
            {RANK_NAMES[currentRank]}
          </p>
          <p className="font-label-sm text-label-sm text-outline">
            XP Total: {xp}
          </p>
        </div>
        {currentRank === 'S' ? (
          <span className="material-symbols-outlined text-secondary text-4xl ms-filled">emoji_events</span>
        ) : (
          <div className="text-right">
            <p className="font-label-sm text-label-sm text-outline">Próximo rango</p>
            <p className="font-title-lg text-title-lg text-on-surface">
              {nextRankKey ? RANK_NAMES[nextRankKey] : '—'}
            </p>
          </div>
        )}
      </div>

      <XPBar
        current={xp - currentThreshold}
        max={nextThreshold - currentThreshold}
        showLabel
      />

      {nextRankKey && (
        <p className="text-center font-label-sm text-label-sm text-on-surface-variant">
          Te faltan <span className="text-primary font-bold">{nextRank.xpNeeded} XP</span> para alcanzar el rango{' '}
          <span className="font-title-lg text-primary">{RANK_NAMES[nextRankKey]}</span>
        </p>
      )}

      {currentRank === 'S' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center font-title-lg text-title-lg text-primary animate-flicker"
        >
          Has alcanzado el rango máximo. La Taberna Secreta te espera.
        </motion.p>
      )}

      <div className="flex justify-between items-center pt-sm">
        {RANKS_ASC.map((rank) => {
          const reached = RANKS_ASC.indexOf(rank) <= currentIdx
          const colors = RANK_COLORS[rank]
          return (
            <div key={rank} className="flex flex-col items-center gap-1">
              <div
                className={`
                  h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold font-display-lg
                  border-2 transition-all duration-300
                  ${reached ? `${colors.bg} ${colors.text} border-${colors.border.split('-')[1]}-400` : 'bg-surface-container text-outline border-outline'}
                `}
              >
                {rank}
              </div>
              <span className={`text-[9px] font-label-sm ${reached ? 'text-on-surface' : 'text-outline'}`}>
                {RANK_THRESHOLDS[rank]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}