import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRank } from '../hooks/useRank'
import { useMissions } from '../hooks/useMissions'
import { MissionList } from '../components/missions/MissionList'
import { MissionQRGenerator } from '../components/missions/MissionQRGenerator'
import { GuestBanner } from '../components/layout/GuestBanner'
import type { Mission } from '../types'

export default function MissionsPage() {
  const { user, isGuest } = useAuth()
  const { rank } = useRank(user?.xp || 0)
  const { missions, isLoading, getMissionStatus } = useMissions(rank, user?.id ?? null, isGuest)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [isQROpen, setQROpen] = useState(false)

  const handleOpenQR = (mission: Mission) => {
    setSelectedMission(mission)
    setQROpen(true)
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-md mb-base">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Tablón de Misiones</h1>
          <p className="font-label-sm text-outline">Completa misiones y gana XP</p>
        </div>
      </div>

      <GuestBanner isGuest={isGuest} rank={rank} xp={user?.xp || 0} />

      {missions.length > 0 && (
        <div className="flex items-center justify-between mb-md">
          <div className="h-px flex-grow bg-gradient-to-r from-transparent via-outline-variant to-transparent" />
          <h1 className="font-display-lg text-headline-lg text-primary text-center px-md">Tablón de Misiones</h1>
          <div className="h-px flex-grow bg-gradient-to-r from-transparent via-outline-variant to-transparent" />
        </div>
      )}

      <div className="wood-texture p-lg rounded-lg border-4 border-outline-variant shadow-2xl">
        <MissionList
          missions={missions}
          isLoading={isLoading}
          isGuest={isGuest}
          getMissionStatus={getMissionStatus}
          onOpenQR={handleOpenQR}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <MissionQRGenerator
        mission={selectedMission}
        userId={user?.id || ''}
        isOpen={isQROpen}
        onClose={() => { setQROpen(false); setSelectedMission(null) }}
      />
    </div>
  )
}