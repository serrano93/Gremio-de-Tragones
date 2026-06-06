import { motion } from 'framer-motion'
import { RANK_COLORS, RANK_NAMES } from '../../lib/constants'

interface RankBadgeProps {
  rank: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

const sizeMap = {
  sm: { container: 'h-10 w-10', icon: 'text-base', text: 'text-xs' },
  md: { container: 'h-16 w-16', icon: 'text-xl', text: 'text-lg' },
  lg: { container: 'h-20 w-20', icon: 'text-2xl', text: 'text-xl' },
}

export function RankBadge({ rank, size = 'md', showName = false }: RankBadgeProps) {
  const colors = RANK_COLORS[rank] || RANK_COLORS.F
  const name = RANK_NAMES[rank] || 'Iniciado'
  const isSRank = rank === 'S'
  const sz = sizeMap[size]

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        whileHover={isSRank ? undefined : { scale: 1.05 }}
        animate={isSRank ? { boxShadow: ['0 0 10px #ffb77d', '0 0 25px #ffb77d', '0 0 10px #ffb77d'] } : undefined}
        transition={isSRank ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : undefined}
        className={`
          ${sz.container} rounded-full flex items-center justify-center
          border-2 ${colors.border} ${colors.bg} ${colors.text}
          font-display-lg font-bold shadow-lg
        `}
      >
        {isSRank ? (
          <span className={`material-symbols-outlined ${sz.icon} ms-filled`}>crown</span>
        ) : (
          <span className={`${sz.text} font-display-lg`}>{rank}</span>
        )}
      </motion.div>
      {showName && (
        <span className={`font-label-sm text-label-sm ${colors.text} tracking-wider`}>
          {name}
          {isSRank && <span className="material-symbols-outlined text-secondary text-xs ml-1">star</span>}
        </span>
      )}
    </div>
  )
}