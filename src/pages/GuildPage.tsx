import { useAuth } from '../hooks/useAuth'
import { useRank } from '../hooks/useRank'
import { RankBadge } from '../components/guild/RankBadge'
import { RankProgress } from '../components/guild/RankProgress'
import { GuestBanner } from '../components/layout/GuestBanner'
import { GoldCard } from '../components/ui/Card'
import { RANK_THRESHOLDS, RANK_NAMES, RANKS_ASC } from '../lib/constants'

export default function GuildPage() {
  const { user, isGuest } = useAuth()
  const { rank, rankName, nextRank, progress, colors } = useRank(user?.xp || 0)

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary">Rangos del Gremio</h1>
        <p className="font-label-sm text-outline">Tu camino de aventurero</p>
      </div>

      <GuestBanner isGuest={isGuest} rank={rank} xp={user?.xp || 0} />

      <GoldCard>
        <div className="flex items-center gap-lg mb-lg">
          <RankBadge rank={rank} size="lg" />
          <div>
            <h2 className={`font-headline-lg text-headline-lg ${colors.text}`}>
              {rankName}
            </h2>
            <p className="font-label-sm text-outline">
              Rango {rank} — {user?.xp || 0} XP
            </p>
          </div>
        </div>
        <RankProgress
          xp={user?.xp || 0}
          currentRank={rank}
          progress={progress.progress}
          nextRank={nextRank}
        />
      </GoldCard>

      <div>
        <h3 className="font-label-lg text-label-lg text-outline uppercase tracking-wider mb-md">Jerarquía del Gremio</h3>
        <div className="space-y-sm">
          {RANKS_ASC.map((r) => {
            const reached = RANKS_ASC.indexOf(r) <= RANKS_ASC.indexOf(rank)
            const rankColors = reached
              ? rank === r
                ? 'border-primary/40 bg-primary/5'
                : 'border-outline-variant bg-surface-container/50'
              : 'border-surface-container-lowest bg-surface-container-lowest/30 opacity-50'

            return (
              <div
                key={r}
                className={`flex items-center gap-md p-md rounded-xl border-2 transition-all ${rankColors}`}
              >
                <RankBadge rank={r} size="sm" />
                <div className="flex-1">
                  <p className={`font-title-lg text-title-lg ${reached ? 'text-on-surface' : 'text-outline'}`}>
                    {RANK_NAMES[r]}
                  </p>
                  <p className="font-label-sm text-outline">
                    {r === 'S' ? 'Rango legendario' : `${RANK_THRESHOLDS[r]} XP requeridos`}
                  </p>
                </div>
                {reached && (
                  <span className="material-symbols-outlined text-secondary text-xl ms-filled">check_circle</span>
                )}
                {rank === r && (
                  <span className="px-sm py-xs bg-primary-container text-on-primary-container font-label-sm rounded-sm uppercase tracking-widest">
                    Actual
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {rank === 'F' && !isGuest && (
        <div className="flex items-center gap-sm p-md bg-surface-container border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-primary text-xl">info</span>
          <p className="font-label-sm text-on-surface-variant">
            Completa misiones para ganar XP y ascender de rango. Necesitas 100 XP para alcanzar el Rango E.
          </p>
        </div>
      )}
    </div>
  )
}