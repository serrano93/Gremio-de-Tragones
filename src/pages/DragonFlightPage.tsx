import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoneCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useDragonFlight } from '../hooks/useDragonFlight'

export default function DragonFlightPage() {
  const navigate = useNavigate()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const {
    state,
    score,
    highscore,
    lastReward,
    claiming,
    isNewRecord,
    userGold,
    entryError,
    entryCost,
    startGame,
    reset,
  } = useDragonFlight()

  const handleStart = () => {
    if (!canvasContainerRef.current) return
    startGame(canvasContainerRef.current)
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-md mb-base">
        <button
          onClick={() => navigate('/games')}
          aria-label="Volver"
          className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Dragon's Flight</h1>
          <p className="font-label-sm text-outline">Vuela entre columnas, evita chocar</p>
        </div>
      </div>

      <div className="relative w-full max-w-[360px] mx-auto bg-slate-900 rounded-md overflow-hidden">
        <div
          ref={canvasContainerRef}
          className="w-full"
          style={{ aspectRatio: '360 / 540' }}
        />
        {state === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-md bg-slate-900/60 p-md">
            <p className="font-label-md text-label-md text-on-surface">
              Highscore: <span className="text-amber-300 font-bold">{highscore}</span>
            </p>
            <p className="font-label-sm text-label-sm text-amber-300">
              Coste: {entryCost} oro · Tu oro: <span className="font-bold">{userGold}</span>
            </p>
            <Button variant="gold" size="lg" onClick={handleStart} className="w-full max-w-[280px]">
              <span className="material-symbols-outlined">flight_takeoff</span>
              Iniciar Vuelo
            </Button>
            {entryError && (
              <p className="font-label-sm text-label-sm text-error bg-error-container px-sm py-xs rounded-md text-center">
                {entryError}
              </p>
            )}
            <p className="font-label-sm text-label-sm text-on-surface-variant text-center max-w-[260px]">
              Toca la pantalla para aletear. Esquiva las columnas.
            </p>
          </div>
        )}
        {state === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-md bg-slate-900/85 p-md overflow-y-auto">
            <p className="font-display text-2xl font-bold text-error">GAME OVER</p>
            {isNewRecord && (
              <p className="font-display text-base text-amber-300 animate-flicker">
                ¡NUEVO HIGHSCORE!
              </p>
            )}
            <div className="text-center">
              <p className="font-label-sm text-label-sm text-outline">Puntuación</p>
              <p className="font-display text-4xl font-bold text-primary">{score}</p>
              <p className="font-label-sm text-label-sm text-outline mt-xs">
                Récord: {highscore}
              </p>
            </div>
            {lastReward && (
              <div className="flex gap-lg bg-emerald-900/40 px-md py-sm rounded-md">
                {lastReward.xp > 0 && (
                  <span className="font-label-sm text-emerald-400 font-bold">
                    +{lastReward.xp} XP
                  </span>
                )}
                {lastReward.gold > 0 && (
                  <span className="font-label-sm text-amber-300 font-bold">
                    +{lastReward.gold} oro
                  </span>
                )}
              </div>
            )}
            {claiming && <p className="font-label-sm text-outline">Reclamando reward...</p>}
            <Button
              variant="gold"
              size="md"
              onClick={handleStart}
              className="w-full max-w-[260px]"
              disabled={claiming || userGold < entryCost}
            >
              <span className="material-symbols-outlined">refresh</span>
              Volver a jugar ({entryCost} oro)
            </Button>
            <Button variant="outline" size="md" onClick={reset} className="w-full max-w-[260px]">
              Volver al inicio
            </Button>
          </div>
        )}
      </div>

      <StoneCard className="p-md">
        <h3 className="font-title-md text-title-md text-on-surface mb-sm">Recompensas</h3>
        <ul className="space-y-xs font-label-sm text-label-sm text-on-surface-variant">
          <li>• Coste por partida: {entryCost} oro</li>
          <li>• 1 oro cada 5 puntos</li>
          <li>• Bonus +10 oro al superar 50 puntos</li>
          <li>• Bonus +100 oro al superar 500 puntos</li>
          <li>• Velocidad aumenta cada 5 columnas</li>
        </ul>
      </StoneCard>
    </div>
  )
}
