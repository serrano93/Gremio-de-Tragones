import { motion } from 'framer-motion'
import type { Mission } from '../../types'

interface MissionCardProps {
  mission: Mission
  status: string | null
  isGuest: boolean
  onOpenQR: (mission: Mission) => void
  isCompleted: boolean
  difficulty?: 'low' | 'moderate' | 'high' | 'legendary'
  rotate?: string
}

export function MissionCard({ mission, status, isGuest, onOpenQR, isCompleted, difficulty = 'low', rotate = '0deg' }: MissionCardProps) {
  const isVerified = status === 'verified'
  const isPending = status === 'completed' || status === 'pending'

  const borderClass = difficulty === 'high' || difficulty === 'legendary' ? 'fiery-border' : difficulty === 'moderate' ? 'mystic-aura' : 'border-2 border-outline-variant'

  return (
    <div className="relative group cursor-pointer overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        style={{ transform: `rotate(${rotate})` }}
        whileHover={{ scale: 1.02, rotate: 0 }}
        className="relative"
      >
        <div className={`parchment-texture p-md ${borderClass} ${isCompleted ? 'opacity-60' : ''}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#2a2a2a] rounded-full shadow-lg border border-outline" />

          <div className="flex justify-between items-start gap-sm mb-md">
            <div className="wax-seal-badge w-12 h-12 shrink-0 text-on-background font-display-lg text-xl" style={{ background: difficulty === 'high' ? 'radial-gradient(circle, #8b0000 0%, #600000 100%)' : difficulty === 'moderate' ? 'radial-gradient(circle, #004f51 0%, #002020 100%)' : 'radial-gradient(circle, #4d4638 0%, #201b0f 100%)' }}>
              <span className="material-symbols-outlined text-on-background ms-filled">
                {difficulty === 'legendary' ? 'auto_awesome' : difficulty === 'high' ? 'local_fire_department' : difficulty === 'moderate' ? 'auto_stories' : 'pest_control'}
              </span>
            </div>
            <div className="flex items-center gap-xs shrink-0 flex-wrap justify-end">
              <div className="flex items-center gap-xs bg-primary-container text-on-primary-container px-sm py-xs rounded-sm whitespace-nowrap">
                <span className="material-symbols-outlined text-sm ms-filled">military_tech</span>
                <span className="font-label-lg text-label-lg">{mission.xp_reward} XP</span>
              </div>
              {mission.gold_reward > 0 && (
                <div className="flex items-center gap-xs bg-[#4a3800] text-[#ffb77d] px-sm py-xs rounded-sm whitespace-nowrap">
                  <span className="material-symbols-outlined text-sm ms-filled">payments</span>
                  <span className="font-label-lg text-label-lg">{mission.gold_reward}</span>
                </div>
              )}
            </div>
          </div>

          <h3 className="font-display-lg text-headline-md text-on-primary mb-sm break-words min-w-0">{mission.title}</h3>
          <p className="font-body-md text-on-tertiary-container mb-md line-clamp-3 break-words">{mission.description || 'Sin descripción'}</p>

          <div className="flex justify-between items-center gap-sm mt-auto border-t border-outline-variant/30 pt-md">
            <div className="flex gap-sm shrink-0">
              <span className="material-symbols-outlined text-on-primary text-lg">
                {difficulty === 'legendary' ? 'swords' : difficulty === 'high' ? 'local_fire_department' : difficulty === 'moderate' ? 'shield' : 'pest_control'}
              </span>
            </div>

            <div className="min-w-0 flex-1 flex justify-end">
              {isVerified ? (
                <span className="px-md py-xs bg-secondary-container text-on-secondary-container font-label-lg text-label-lg rounded-sm whitespace-nowrap">
                  Completada
                </span>
              ) : isPending ? (
                <span className="px-md py-xs bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-sm animate-flicker whitespace-nowrap">
                  Pendiente
                </span>
              ) : isGuest ? (
                <button
                  disabled
                  className="px-md py-xs border-2 border-outline text-outline font-label-lg text-label-lg rounded-sm opacity-50 whitespace-nowrap text-sm"
                >
                  Regístrate para completar
                </button>
              ) : (
                <button
                  onClick={() => onOpenQR(mission)}
                  className="px-md py-xs bg-primary-container text-on-primary-container font-label-lg text-label-lg rounded-sm hover:scale-105 transition-transform active:scale-95 whitespace-nowrap"
                >
                  Aceptar Misión
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}