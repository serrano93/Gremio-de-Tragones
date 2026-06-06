import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GUEST_RANK } from '../../lib/constants'

interface GuestBannerProps {
  isGuest: boolean
  rank?: string
  xp?: number
}

export function GuestBanner({ isGuest, rank = GUEST_RANK, xp = 0 }: GuestBannerProps) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {isGuest && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="stone-texture p-md border-2 border-outline-variant mb-md">
            <div className="flex items-start gap-md">
              <div className="w-12 h-12 rounded-full border-2 border-outline flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-outline text-2xl">person</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-xs">
                  <span className="font-label-lg text-label-lg text-primary">
                    Rango {rank} (Invitado)
                  </span>
                  <span className="material-symbols-outlined text-secondary text-sm">star</span>
                </div>
                <p className="font-label-sm text-label-sm text-outline mb-sm">
                  Progreso local: {xp} XP acumulados
                </p>
                <p className="font-body-md text-on-surface-variant mb-md">
                  Únete al Gremio de Aventureros para sincronizar tu progreso,
                  desbloquear recompensas y ascender de rango.
                </p>
                <button
                  onClick={() => navigate('/profile')}
                  className="flicker-flame px-md py-xs font-label-lg text-on-primary rounded-sm uppercase tracking-widest font-bold active:scale-95 transition-transform"
                  aria-label="Registrarse en el Gremio de Aventureros"
                >
                  Inscribirse en el Gremio
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}