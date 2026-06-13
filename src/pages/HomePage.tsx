import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRank } from '../hooks/useRank'
import { useMissions } from '../hooks/useMissions'
import { useEstablishments } from '../hooks/useEstablishments'
import { GuestBanner } from '../components/layout/GuestBanner'
import { StoneCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const { rank, rankName } = useRank(user?.xp || 0)
  const profileId: string | null = user?.id ?? null
  const { missions } = useMissions(rank, profileId, isGuest)
  const { establishments } = useEstablishments(profileId, user?.role || 'adventurer')

  const totalMissions = missions.length
  const activeEstablishments = establishments.filter((e) => e.is_active).length

  return (
    <div className="space-y-lg">
      <div className="mb-lg">
        <h2 className="font-headline-lg text-headline-lg text-on-background mb-base">Tablón de Misiones</h2>
        <p className="font-body-md text-on-surface-variant">
          {isGuest
            ? 'Tu aventura comienza aquí, joven aventurero.'
            : `${rankName} — ${user?.full_name || 'Aventurero'}`}
        </p>
      </div>

      <GuestBanner isGuest={isGuest} rank={rank} xp={user?.xp || 0} />

      <div className="grid grid-cols-3 gap-gutter">
        <StoneCard className="min-h-[120px] flex flex-col items-center justify-center text-center p-sm">
          <span className="material-symbols-outlined text-primary text-2xl mb-xs ms-filled">assignment</span>
          <span className="font-label-sm text-label-sm text-outline mb-xs">Misiones</span>
          <span className="carved-text font-title-lg text-title-lg text-primary">{totalMissions}</span>
        </StoneCard>

        <StoneCard className="min-h-[120px] flex flex-col items-center justify-center text-center p-sm">
          <span className="material-symbols-outlined text-secondary text-2xl mb-xs ms-filled">storefront</span>
          <span className="font-label-sm text-label-sm text-outline mb-xs">Establec.</span>
          <span className="carved-text font-title-lg text-title-lg text-secondary">{activeEstablishments}</span>
        </StoneCard>

        <StoneCard className="min-h-[120px] flex flex-col items-center justify-center text-center p-sm">
          <span className="material-symbols-outlined text-tertiary text-2xl mb-xs ms-filled">military_tech</span>
          <span className="font-label-sm text-label-sm text-outline mb-xs">Mi XP</span>
          <span className="carved-text font-title-lg text-title-lg text-tertiary">{user?.xp ?? 0}</span>
        </StoneCard>
      </div>

      <div className="text-center py-xl">
        <p className="font-body-md text-on-surface-variant mb-md">
          Completa misiones en establecimientos locales para ganar XP, oro y ascender en rangos.
        </p>
        <Button variant="outline" onClick={() => navigate('/missions')}>
          Ver Misiones
        </Button>
      </div>
    </div>
  )
}
