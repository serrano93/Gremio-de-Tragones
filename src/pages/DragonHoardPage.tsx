import { useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoldCard, StoneCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useDragonHoard } from '../hooks/useDragonHoard'

export default function DragonHoardPage() {
  const navigate = useNavigate()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<Phaser.Game | null>(null)
  const {
    level,
    levelInfo,
    nextLevel,
    pendingGold,
    canUpgrade,
    upgradeCost,
    userGold,
    lastClaimedAmount,
    claiming,
    claim,
    upgrade,
  } = useDragonHoard()

  useEffect(() => {
    if (!canvasContainerRef.current) return
    let destroyed = false

    void import('phaser').then((PhaserModule) => {
      if (destroyed || !canvasContainerRef.current) return
      const Phaser = PhaserModule.default
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: canvasContainerRef.current,
        width: 360,
        height: 360,
        backgroundColor: '#1a0e0a',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: {
          create() {
            const scene = this as Phaser.Scene & { add: Phaser.GameObjects.Factory; time: Phaser.Time.Clock; tweens: Phaser.Tweens.TweenManager }
            const cx = 180
            const cy = 180

            // Cueva (círculo oscuro)
            const cave = scene.add.circle(cx, cy, 160, 0x2a1a14)
            cave.setStrokeStyle(4, 0xd4af37)

            // Antorchas (chispas)
            for (let i = 0; i < 6; i += 1) {
              const angle = (i / 6) * Math.PI * 2
              const tx = cx + Math.cos(angle) * 140
              const ty = cy + Math.sin(angle) * 140
              const torch = scene.add.circle(tx, ty, 8, 0xff6b35)
              scene.tweens.add({
                targets: torch,
                scale: { from: 0.9, to: 1.3 },
                alpha: { from: 0.6, to: 1 },
                duration: 400 + i * 100,
                yoyo: true,
                repeat: -1,
              })
            }

            // Dragón (rectángulo)
            const dragon = scene.add.rectangle(cx, cy, 100, 60, 0x4d4638)
            dragon.setStrokeStyle(3, 0xd4af37)

            // Ojos del dragón
            const eyeL = scene.add.circle(cx - 18, cy - 8, 4, 0xff0000)
            const eyeR = scene.add.circle(cx + 18, cy - 8, 4, 0xff0000)
            scene.tweens.add({
              targets: [eyeL, eyeR],
              alpha: { from: 1, to: 0.2 },
              duration: 1500,
              yoyo: true,
              repeat: -1,
            })

            // Monedas orbitando
            for (let i = 0; i < 5; i += 1) {
              const angle = (i / 5) * Math.PI * 2
              const coin = scene.add.circle(cx, cy, 5, 0xffd700)
              scene.tweens.add({
                targets: coin,
                x: cx + Math.cos(angle + 0.02 * scene.time.now) * 90,
                y: cy + Math.sin(angle + 0.02 * scene.time.now) * 60,
                duration: 100,
                repeat: -1,
              })
            }
          },
        },
      })
      phaserGameRef.current = game
    })

    return () => {
      destroyed = true
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
    }
  }, [level])

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
          <h1 className="font-display text-2xl font-bold text-primary">Dragon's Hoard</h1>
          <p className="font-label-sm text-outline">Cuida el tesoro del dragón</p>
        </div>
      </div>

      <GoldCard>
        <div className="text-center space-y-md">
          <div
            ref={canvasContainerRef}
            className="w-full max-w-[360px] mx-auto bg-slate-950 rounded-md"
            style={{ aspectRatio: '1 / 1' }}
          />
          <p className="font-display text-xl text-amber-300">Nivel {level}: {levelInfo.label}</p>
          <p className="font-label-md text-label-md text-on-surface">
            Producción: <span className="font-bold">{levelInfo.goldPerMin} oro/min</span>
          </p>
          <p className="font-label-md text-label-md text-on-surface">
            Oro acumulado: <span className="font-bold text-amber-300">{pendingGold}</span>
          </p>
          <Button
            variant="gold"
            size="lg"
            onClick={claim}
            disabled={pendingGold <= 0 || claiming}
            isLoading={claiming}
            className="w-full"
          >
            <span className="material-symbols-outlined">savings</span>
            Reclamar {pendingGold} oro
          </Button>
          {lastClaimedAmount > 0 && (
            <p className="font-label-sm text-emerald-400">¡+{lastClaimedAmount} oro reclamado!</p>
          )}
        </div>
      </GoldCard>

      {canUpgrade && nextLevel && (
        <StoneCard className="p-md">
          <h3 className="font-title-md text-title-md text-on-surface mb-sm">Mejorar cueva</h3>
          <div className="flex items-center justify-between bg-surface-container p-md rounded-md">
            <div>
              <p className="font-label-md text-label-md text-on-surface">
                Nivel {nextLevel.level}: {nextLevel.label}
              </p>
              <p className="font-label-sm text-label-sm text-outline">
                Produce {nextLevel.goldPerMin} oro/min
              </p>
            </div>
            <Button
              variant="outline"
              onClick={upgrade}
              disabled={!canUpgrade}
            >
              <span className="material-symbols-outlined">upgrade</span>
              {upgradeCost} oro
            </Button>
            <p className="font-label-sm text-label-sm text-outline mt-xs">
              Tu oro: {userGold}
            </p>
          </div>
        </StoneCard>
      )}

      <StoneCard className="p-md">
        <h3 className="font-title-md text-title-md text-on-surface mb-sm">Cómo funciona</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          El dragón cuida tu tesoro y genera oro pasivamente. Cuanto mayor sea el nivel de la cueva,
          más oro produce por minuto. Puedes dejar la app y el dragón seguirá acumulando hasta
          12 horas. Mejora la cueva para aumentar la producción.
        </p>
      </StoneCard>
    </div>
  )
}
