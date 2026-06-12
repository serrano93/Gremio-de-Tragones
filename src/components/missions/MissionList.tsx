import { motion, AnimatePresence } from 'framer-motion'
import { MissionCard } from './MissionCard'
import type { Mission } from '../../types'

interface MissionListProps {
  missions: Mission[]
  isLoading: boolean
  isGuest: boolean
  userRank: string
  error?: string | null
  onRetry?: () => void
  getMissionStatus: (missionId: string) => string | null
  onOpenQR: (mission: Mission) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function MissionList({
  missions,
  isLoading,
  isGuest,
  userRank,
  error,
  onRetry,
  getMissionStatus,
  onOpenQR,
  searchQuery,
  onSearchChange,
}: MissionListProps) {
  const filtered = missions.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (m.establishment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
      </div>
    )
  }

  if (error && onRetry) {
    return (
      <div className="text-center py-12 stone-block rounded-xl">
        <span className="material-symbols-outlined text-error text-5xl mb-md">cloud_off</span>
        <p className="font-title-md text-title-md text-on-surface mb-xs">No se pudieron cargar las misiones</p>
        <p className="font-label-sm text-outline mb-md">{error}</p>
        <button
          onClick={onRetry}
          className="px-lg py-sm bg-primary text-on-primary font-label-lg text-label-lg rounded-md hover:scale-105 active:scale-95 transition-transform min-h-[44px]"
        >
          <span className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-base">refresh</span>
            Reintentar
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-md">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline text-xl">search</span>
        <input
          type="text"
          placeholder="Buscar misiones..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-xl pr-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface placeholder:text-outline font-label-lg
                     focus:outline-none focus:border-primary-container min-h-[48px]"
          aria-label="Buscar misiones"
        />
      </div>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 stone-block rounded-xl"
        >
          <span className="material-symbols-outlined text-outline text-6xl mb-md">search_off</span>
          <p className="font-title-lg text-title-lg text-on-surface-variant">
            {searchQuery ? 'No se encontraron misiones.' : 'No hay misiones disponibles aún.'}
          </p>
          <p className="font-label-sm text-outline mt-sm">
            {searchQuery
              ? 'Intenta con otros términos de búsqueda.'
              : 'El Gremio de Comerciantes prepara nuevas misiones.'}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filtered.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              status={getMissionStatus(mission.id)}
              isGuest={isGuest}
              userRank={userRank}
              isCompleted={getMissionStatus(mission.id) === 'verified'}
              onOpenQR={onOpenQR}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
