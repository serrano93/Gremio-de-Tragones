import { motion } from 'framer-motion'
import type { Mission } from '../../types'
import { RANK_COLORS, RANKS_ASC, MISSION_TYPE_LABELS, MISSION_TYPE_ICONS, MISSION_TYPE_COLORS } from '../../lib/constants'

interface MissionCardProps {
  mission: Mission
  status: string | null
  isGuest: boolean
  userRank: string
  onOpenQR: (mission: Mission) => void
  isCompleted: boolean
}

export function MissionCard({ mission, status, isGuest, userRank, onOpenQR, isCompleted }: MissionCardProps) {
  const isVerified = status === 'verified'
  const isPending = status === 'completed' || status === 'pending'

  const rankOrder = RANKS_ASC
  const userRankIdx = rankOrder.indexOf(userRank || 'F')
  const reqRankIdx = rankOrder.indexOf(mission.required_min_rank)
  const isAccessible = reqRankIdx <= userRankIdx
  const isLocked = !isGuest && !isAccessible && !isVerified && !isPending

  const rankColor = RANK_COLORS[mission.required_min_rank] || RANK_COLORS.F
  const missionType = mission.mission_type || 'reto'
  const typeColors = MISSION_TYPE_COLORS[missionType] || MISSION_TYPE_COLORS.reto
  const typeIcon = MISSION_TYPE_ICONS[missionType] || 'emoji_events'
  const typeLabel = MISSION_TYPE_LABELS[missionType] || 'Reto'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isLocked ? 0.6 : 1, y: 0 }}
      layout
      whileHover={isLocked ? undefined : { y: -2 }}
      className={`relative stone-block rounded-xl p-md ${isCompleted ? 'opacity-60' : ''} ${
        isLocked ? 'grayscale' : ''
      }`}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-xl bg-black/30">
          <div className="flex items-center gap-sm bg-surface-container border-2 border-outline-variant rounded-md px-md py-sm">
            <span className="material-symbols-outlined text-on-surface text-lg">lock</span>
            <span className="font-label-md text-label-md text-on-surface">
              Requiere rango {mission.required_min_rank}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-sm">
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${rankColor.bg} border-2 ${rankColor.border} shrink-0`}>
          <span className={`font-display text-2xl ${rankColor.text}`}>
            {mission.required_min_rank}
          </span>
        </div>

        <div className="flex items-center gap-xs shrink-0">
          <div className="flex items-center gap-xs bg-primary-container text-on-primary-container px-sm py-xs rounded-sm whitespace-nowrap">
            <span className="material-symbols-outlined text-sm ms-filled">military_tech</span>
            <span className="font-label-md text-label-md whitespace-nowrap">{mission.xp_reward}</span>
          </div>
          {mission.gold_reward > 0 && (
            <div className="flex items-center gap-xs bg-amber-900/60 text-amber-200 px-sm py-xs rounded-sm whitespace-nowrap">
              <span className="material-symbols-outlined text-sm ms-filled">payments</span>
              <span className="font-label-md text-label-md whitespace-nowrap">{mission.gold_reward}</span>
            </div>
          )}
        </div>
      </div>

      {mission.establishment?.name && (
        <div className="flex items-center gap-xs mb-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">storefront</span>
          <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
            {mission.establishment.name}
          </p>
        </div>
      )}

      <h3 className="font-display text-title-md text-on-surface mb-sm leading-tight">
        {mission.title}
      </h3>

      {mission.description && (
        <p className="font-body-sm text-on-surface-variant mb-md line-clamp-2">
          {mission.description}
        </p>
      )}

      <div className="flex items-center gap-sm mb-md">
        <div className={`inline-flex items-center gap-xs px-sm py-xs rounded-md border ${typeColors.bg} ${typeColors.border}`}>
          <span className={`material-symbols-outlined text-sm ${typeColors.text}`}>{typeIcon}</span>
          <span className={`font-label-sm text-label-sm ${typeColors.text}`}>{typeLabel}</span>
        </div>
      </div>

      <div className="flex justify-end items-center pt-sm border-t border-outline-variant/30">
        {isVerified ? (
          <span className="px-md py-sm bg-emerald-900/40 text-emerald-300 font-label-md text-label-md rounded-md border border-emerald-700/50">
            ✓ Completada
          </span>
        ) : isPending ? (
          <span className="px-md py-sm bg-primary-container text-on-primary-container font-label-md text-label-md rounded-md animate-flicker">
            Pendiente
          </span>
        ) : isGuest ? (
          <button
            disabled
            className="px-md py-sm border-2 border-outline text-outline font-label-md text-label-md rounded-md opacity-50"
          >
            Regístrate
          </button>
        ) : isLocked ? (
          <button
            disabled
            className="px-md py-sm border-2 border-outline text-outline font-label-md text-label-md rounded-md opacity-50 cursor-not-allowed"
          >
            <span className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">lock</span>
              Bloqueada
            </span>
          </button>
        ) : (
          <button
            onClick={() => onOpenQR(mission)}
            className="px-md py-sm bg-primary text-on-primary font-label-md text-label-md rounded-md hover:scale-105 transition-transform active:scale-95 min-h-[40px]"
          >
            Aceptar Misión
          </button>
        )}
      </div>
    </motion.div>
  )
}
