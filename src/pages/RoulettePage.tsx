import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoldCard, StoneCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { RouletteWheel } from '../components/games/RouletteWheel'
import { useRoulette } from '../hooks/useRoulette'
import { ROULETTE_RESULTS } from '../lib/game-rewards'
import { isUserLoggedIn } from '../lib/game-api'

export default function RoulettePage() {
  const navigate = useNavigate()
  const {
    spinning,
    lastResult,
    history,
    highscore,
    userGold,
    cooldownRemaining,
    spinCost,
    canSpin,
    spin,
  } = useRoulette()
  const [error, setError] = useState<string | null>(null)
  const [lastSpinIndex, setLastSpinIndex] = useState<number | null>(null)

  const handleSpin = async () => {
    setError(null)
    const result = await spin()
    if (!result.success) {
      setError(result.error || 'Error desconocido')
      return
    }
    if (result.result) {
      const idx = ROULETTE_RESULTS.findIndex((r) => r.id === result.result!.id)
      if (idx >= 0) setLastSpinIndex(idx)
    }
  }

  const cooldownSec = Math.ceil(cooldownRemaining / 1000)

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
          <h1 className="font-display text-2xl font-bold text-primary">Ruleta de la Suerte</h1>
          <p className="font-label-sm text-outline">Gira y gana XP/oro</p>
        </div>
      </div>

      <GoldCard>
        <div className="text-center space-y-md">
          <p className="font-label-md text-label-md text-on-surface">
            Coste por tirada: <span className="text-amber-300 font-bold">{spinCost} oro</span>
          </p>
          <RouletteWheel
            spinning={spinning}
            resultIndex={lastSpinIndex}
            onSpinComplete={() => {}}
          />
          {error && (
            <p className="font-label-md text-error bg-error-container px-md py-sm rounded-md">
              {error}
            </p>
          )}
          {cooldownRemaining > 0 ? (
            <Button variant="outline" size="lg" disabled className="w-full">
              <span className="material-symbols-outlined">schedule</span>
              Espera {cooldownSec}s
            </Button>
          ) : (
            <Button
              variant="gold"
              size="lg"
              onClick={handleSpin}
              disabled={!canSpin}
              isLoading={spinning}
              className="w-full"
            >
              <span className="material-symbols-outlined">casino</span>
              Girar Ruleta
            </Button>
          )}
          {!isUserLoggedIn() && (
            <p className="font-label-sm text-outline">
              Tu oro: <span className="text-amber-300 font-bold">{userGold}</span>
            </p>
          )}
        </div>
      </GoldCard>

      {lastResult && (
        <StoneCard className="p-md">
          <div className="text-center">
            <p className="font-label-md text-label-md text-outline mb-xs">Última tirada</p>
            <p className="font-display text-2xl text-primary">{lastResult.label}</p>
            <div className="flex justify-center gap-lg mt-sm">
              {lastResult.xp > 0 && (
                <span className="font-label-md text-emerald-400">+{lastResult.xp} XP</span>
              )}
              {lastResult.gold > 0 && (
                <span className="font-label-md text-amber-300">+{lastResult.gold} oro</span>
              )}
            </div>
          </div>
        </StoneCard>
      )}

      <StoneCard className="p-md">
        <h3 className="font-title-md text-title-md text-on-surface mb-sm">Premios posibles</h3>
        <div className="grid grid-cols-2 gap-sm">
          {ROULETTE_RESULTS.map((r) => (
            <div
              key={r.id}
              className="bg-surface-container px-sm py-xs rounded-md text-center"
            >
              <p className="font-label-sm text-label-sm text-on-surface">{r.label}</p>
            </div>
          ))}
        </div>
      </StoneCard>

      {history.length > 0 && (
        <StoneCard className="p-md">
          <h3 className="font-title-md text-title-md text-on-surface mb-sm">Historial reciente</h3>
          <div className="space-y-xs max-h-64 overflow-y-auto">
            {history
              .slice()
              .reverse()
              .map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center bg-surface-container px-sm py-xs rounded-md"
                >
                  <span className="font-label-sm text-label-sm text-on-surface">
                    {s.result.label}
                  </span>
                  <span className="font-label-sm text-label-sm text-outline">
                    {new Date(s.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        </StoneCard>
      )}

      {isUserLoggedIn() && highscore > 0 && (
        <StoneCard className="p-md text-center">
          <p className="font-label-md text-label-md text-outline">Tiradas totales</p>
          <p className="font-display text-3xl text-primary">{highscore}</p>
        </StoneCard>
      )}
    </div>
  )
}
