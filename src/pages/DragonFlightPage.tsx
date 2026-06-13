import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoldCard, StoneCard } from '../components/ui/Card'
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

      {state === 'idle' && (
        <GoldCard>
          <div className="text-center space-y-md">
            <p className="font-label-md text-label-md text-on-surface">
              Highscore: <span className="text-amber-300 font-bold">{highscore}</span>
            </p>
            <div
              ref={canvasContainerRef}
              className="w-full max-w-[360px] mx-auto bg-slate-900 rounded-md"
              style={{ aspectRatio: '360 / 540', minHeight: 360 }}
            />
            <Button variant="gold" size="lg" onClick={handleStart} className="w-full">
              <span className="material-symbols-outlined">flight_takeoff</span>
              Iniciar Vuelo
            </Button>
          </div>
        </GoldCard>
      )}

      {state === 'playing' && (
        <StoneCard className="p-md">
          <div
            ref={canvasContainerRef}
            className="w-full max-w-[360px] mx-auto bg-slate-900 rounded-md"
            style={{ aspectRatio: '360 / 540', minHeight: 360 }}
          />
        </StoneCard>
      )}

      {state === 'gameover' && (
        <GoldCard>
          <div className="text-center space-y-md">
            <p className="font-display text-2xl text-error">Game Over</p>
            <p className="font-label-md text-label-md text-on-surface">
              Puntuación: <span className="font-bold text-primary">{score}</span>
            </p>
            {lastReward && (
              <div className="flex justify-center gap-md">
                <span className="font-label-md text-emerald-400">+{lastReward.xp} XP</span>
                <span className="font-label-md text-amber-300">+{lastReward.gold} oro</span>
              </div>
            )}
            {claiming && <p className="font-label-sm text-outline">Reclamando reward...</p>}
            {score > highscore && score > 0 && (
              <p className="font-display text-amber-300 animate-flicker">¡NUEVO HIGHSCORE!</p>
            )}
            <Button variant="gold" size="lg" onClick={handleStart} className="w-full" disabled={claiming}>
              <span className="material-symbols-outlined">refresh</span>
              Volver a jugar
            </Button>
            <Button variant="outline" onClick={reset} className="w-full">
              Volver al inicio
            </Button>
          </div>
        </GoldCard>
      )}

      <StoneCard className="p-md">
        <h3 className="font-title-md text-title-md text-on-surface mb-sm">Recompensas</h3>
        <ul className="space-y-xs font-label-sm text-label-sm text-on-surface-variant">
          <li>• 5 XP por cada columna superada</li>
          <li>• 1 oro cada 5 puntos</li>
          <li>• Bonus +50 XP y +200 oro al superar 50 puntos</li>
          <li>• Bonus +200 XP y +1000 oro al superar 100 puntos</li>
        </ul>
      </StoneCard>
    </div>
  )
}
