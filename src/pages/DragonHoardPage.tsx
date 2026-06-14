import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoldCard, StoneCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useDragonHoard } from '../hooks/useDragonHoard'
import { gameSounds } from '../lib/game-sounds'

export default function DragonHoardPage() {
  const navigate = useNavigate()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<Phaser.Game | null>(null)
  const initStartedRef = useRef(false)
  const [phaserError, setPhaserError] = useState<string | null>(null)
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
    if (initStartedRef.current) return
    initStartedRef.current = true

    const init = async () => {
      try {
        // Wait for DOM
        await new Promise((resolve) => requestAnimationFrame(resolve))
        if (!canvasContainerRef.current || !canvasContainerRef.current.isConnected) return

        const Phaser = await import('phaser')
        if (!canvasContainerRef.current || !canvasContainerRef.current.isConnected) return

        const parent = canvasContainerRef.current
        // Clear any existing canvas
        while (parent.firstChild) {
          parent.removeChild(parent.firstChild)
        }

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent,
          width: 360,
          height: 360,
          backgroundColor: '#1a0e0a',
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          scene: {
            create(this: Phaser.Scene) {
              const scene = this as Phaser.Scene
              const cx = 180
              const cy = 180

              // Background
              scene.add.rectangle(180, 180, 360, 360, 0x2a1a14).setDepth(-10)
              scene.add.circle(180, 200, 130, 0x4d2a1a, 0.5).setDepth(-9)
              scene.add.circle(180, 250, 80, 0x6b3a20, 0.4).setDepth(-8)

              // Walls
              for (let i = 0; i < 4; i += 1) {
                const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
                const sx = cx + Math.cos(angle) * 175
                const sy = cy + Math.sin(angle) * 175
                const wall = scene.add.rectangle(sx, sy, 12, 80, 0x3a2418, 1)
                wall.setRotation(angle - Math.PI / 2)
              }

              // Stalactites (ceiling)
              for (let i = 0; i < 5; i += 1) {
                const x = 30 + i * 75
                const stalactite = scene.add.triangle(x, 0, 0, 0, 16, 30, -16, 30, 0x3a2418)
                stalactite.setOrigin(0.5, 0)
              }

              // Stalagmites (floor)
              for (let i = 0; i < 5; i += 1) {
                const x = 50 + i * 70
                const stalagmite = scene.add.triangle(x, 360, 0, 0, 14, -20, -14, -20, 0x2d1a10)
                stalagmite.setOrigin(0.5, 1)
              }

              // Torches on walls
              for (let i = 0; i < 2; i += 1) {
                const tx = i === 0 ? 30 : 330
                scene.add.rectangle(tx, cy, 8, 30, 0x6b4423)
                const flame = scene.add.circle(tx, cy - 18, 10, 0xff6b35)
                const flameGlow = scene.add.circle(tx, cy - 18, 22, 0xffa500, 0.3)
                scene.tweens.add({
                  targets: flame,
                  scale: { from: 0.9, to: 1.2 },
                  duration: 300 + i * 100,
                  yoyo: true,
                  repeat: -1,
                })
                scene.tweens.add({
                  targets: flameGlow,
                  alpha: { from: 0.2, to: 0.5 },
                  scale: { from: 0.9, to: 1.1 },
                  duration: 400 + i * 100,
                  yoyo: true,
                  repeat: -1,
                })
              }

              // Ground
              scene.add.ellipse(cx, 320, 280, 50, 0x3a2418, 0.8).setDepth(2)
              for (let i = 0; i < 8; i += 1) {
                const px = cx - 120 + i * 32 + (i % 2) * 10
                const py = 320 + (i % 3) * 4
                scene.add.circle(px, py, 4, 0x4d3a28).setDepth(2)
              }

              // Egg container
              const eggContainer = scene.add.container(cx, cy)
              eggContainer.setDepth(5)

              const drawEgg = (lvl: number) => {
                eggContainer.removeAll(true)
                const eggColor = lvl >= 4 ? 0xffd700 : lvl >= 3 ? 0xf0c060 : 0xfff5d6
                const eggG = scene.add.graphics()
                eggG.fillStyle(eggColor, 1)
                eggG.fillEllipse(0, 0, 80, 100)
                eggG.fillStyle(0x000000, 0.15)
                eggG.fillEllipse(-20, 20, 30, 40)
                eggG.lineStyle(2, 0x8b6f47, 0.6)
                eggG.strokeEllipse(0, 0, 80, 100)

                if (lvl >= 1 && lvl < 3) {
                  const crackG = scene.add.graphics()
                  crackG.lineStyle(2, 0x3a2418, 0.9)
                  crackG.beginPath()
                  crackG.moveTo(-15, -20)
                  crackG.lineTo(-5, 0)
                  crackG.lineTo(-20, 25)
                  crackG.lineTo(0, 30)
                  crackG.strokePath()
                  eggContainer.add(crackG)
                }
                if (lvl >= 2) {
                  const crackG2 = scene.add.graphics()
                  crackG2.lineStyle(2, 0x3a2418, 0.9)
                  crackG2.beginPath()
                  crackG2.moveTo(15, -15)
                  crackG2.lineTo(8, 5)
                  crackG2.lineTo(20, 20)
                  crackG2.strokePath()
                  eggContainer.add(crackG2)
                }

                if (lvl >= 3) {
                  const head = scene.add.ellipse(0, -8, 60, 50, 0x4d4638, 1)
                  head.setScale(0.7, 0.8)
                  eggContainer.add(head)
                  const eyeL = scene.add.circle(-12, -10, 4, 0x000000)
                  const eyeR = scene.add.circle(12, -10, 4, 0x000000)
                  const eyeLh = scene.add.circle(-11, -11, 1.5, 0xffffff)
                  const eyeRh = scene.add.circle(13, -11, 1.5, 0xffffff)
                  eggContainer.add([eyeL, eyeR, eyeLh, eyeRh])
                  scene.tweens.add({
                    targets: [eyeL, eyeR, eyeLh, eyeRh],
                    alpha: { from: 1, to: 0.1 },
                    duration: 200,
                    yoyo: true,
                    repeat: -1,
                    delay: 3000,
                  })
                }

                if (lvl >= 4) {
                  const tail = scene.add.triangle(0, 35, 0, 0, -10, 30, 10, 30, 0x4d4638)
                  eggContainer.add(tail)
                  const hornL = scene.add.triangle(-18, -28, 0, 0, 4, -10, -4, -10, 0xffd700)
                  const hornR = scene.add.triangle(18, -28, 0, 0, 4, -10, -4, -10, 0xffd700)
                  eggContainer.add([hornL, hornR])
                }
                if (lvl >= 5) {
                  const aura = scene.add.circle(0, 0, 70, 0xffd700, 0.15)
                  eggContainer.add(aura)
                  scene.tweens.add({
                    targets: aura,
                    scale: { from: 0.9, to: 1.2 },
                    alpha: { from: 0.1, to: 0.25 },
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                  })
                }

                eggContainer.add(eggG)
                eggContainer.sendToBack(eggG)
              }
              drawEgg(1)

              scene.tweens.add({
                targets: eggContainer,
                scaleY: { from: 1, to: 1.06 },
                scaleX: { from: 1, to: 0.96 },
                duration: 2200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
              })

              // Initial coins
              const drawCoins = (n: number) => {
                const existing = scene.data.get('coinGroup') as
                  | Phaser.GameObjects.Group
                  | undefined
                if (existing) existing.clear(true, true)
                const group = scene.add.group()
                const radius = 90 + Math.min(n / 10, 30)
                const count = Math.min(n, 60)
                for (let i = 0; i < count; i += 1) {
                  const angle = (i / Math.max(count, 6)) * Math.PI * 2
                  const r = radius + (i % 3) * 6
                  const coinX = 180 + Math.cos(angle) * r
                  const coinY = 320 - (i % 4) * 4
                  const coin = scene.add.circle(coinX, coinY, 6, 0xffd700, 0.95)
                  coin.setStrokeStyle(1, 0xb8860b)
                  group.add(coin)
                }
                scene.data.set('coinGroup', group)
              }
              drawCoins(0)

              const spawnFallingCoin = () => {
                const coin = scene.add.circle(180 + (Math.random() - 0.5) * 60, 0, 7, 0xffd700)
                coin.setStrokeStyle(1, 0xb8860b)
                const label = scene.add.text(coin.x, coin.y, '+1', {
                  fontSize: '14px',
                  color: '#ffd700',
                  fontStyle: 'bold',
                })
                label.setOrigin(0.5)
                scene.tweens.add({
                  targets: [coin, label],
                  y: 320,
                  duration: 800,
                  ease: 'Quad.easeIn',
                  onComplete: () => {
                    coin.destroy()
                    label.destroy()
                  },
                })
                scene.tweens.add({
                  targets: label,
                  alpha: 0,
                  duration: 800,
                })
              }

              const drawZ = () => {
                const z = scene.add.text(180, 100, 'Z', {
                  fontSize: '24px',
                  color: '#d4af37',
                  fontStyle: 'bold',
                })
                z.setOrigin(0.5)
                z.setAlpha(0)
                scene.tweens.add({
                  targets: z,
                  y: 40,
                  alpha: { from: 0, to: 1 },
                  duration: 1500,
                  ease: 'Cubic.easeOut',
                  onComplete: () => {
                    scene.tweens.add({
                      targets: z,
                      alpha: 0,
                      duration: 500,
                      onComplete: () => z.destroy(),
                    })
                  },
                })
              }

              scene.time.addEvent({
                delay: 6000,
                callback: drawZ,
                loop: true,
              })

              // Ember particles
              const spark = scene.add.graphics()
              spark.fillStyle(0xff6b35, 1)
              spark.fillCircle(0, 0, 3)
              spark.generateTexture('spark', 6, 6)
              spark.destroy()

              const emberEmitter = scene.add.particles(0, 0, 'spark', {
                x: { min: 50, max: 310 },
                y: 0,
                lifespan: 2500,
                speedY: { min: 30, max: 60 },
                speedX: { min: -10, max: 10 },
                scale: { start: 0.3, end: 0 },
                alpha: { start: 0.8, end: 0 },
                tint: [0xff6b35, 0xffa500, 0xffd700],
                frequency: 200,
                quantity: 1,
              })
              emberEmitter.setDepth(3)

              scene.data.set('drawEgg', drawEgg)
              scene.data.set('drawCoins', drawCoins)
              scene.data.set('spawnFallingCoin', spawnFallingCoin)
            },
          },
        })

        phaserGameRef.current = game
      } catch (err) {
        setPhaserError(err instanceof Error ? err.message : String(err))
      }
    }

    void init()

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
      }
      initStartedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!phaserGameRef.current) return
    const game = phaserGameRef.current
    const scene = game.scene.scenes[0]
    if (!scene) return
    const drawEgg = scene.data.get('drawEgg') as ((lvl: number) => void) | undefined
    if (drawEgg) drawEgg(level)
  }, [level])

  useEffect(() => {
    if (!phaserGameRef.current) return
    const game = phaserGameRef.current
    const scene = game.scene.scenes[0]
    if (!scene) return
    const drawCoins = scene.data.get('drawCoins') as ((n: number) => void) | undefined
    if (drawCoins) drawCoins(pendingGold)
  }, [pendingGold])

  const handleClaim = async () => {
    gameSounds.coin()
    await claim()
  }

  const handleUpgrade = async () => {
    gameSounds.upgrade()
    await upgrade()
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
          <h1 className="font-display text-2xl font-bold text-primary">Dragon's Hoard</h1>
          <p className="font-label-sm text-outline">Cuida el tesoro del dragón</p>
        </div>
      </div>

      <GoldCard>
        <div className="text-center space-y-md">
          <div
            ref={canvasContainerRef}
            className="w-full max-w-[360px] mx-auto rounded-md overflow-hidden bg-[#1a0e0a]"
            style={{ aspectRatio: '1 / 1' }}
          />
          {phaserError && (
            <p className="text-error text-sm font-label-sm bg-error-container p-sm rounded-md">
              Error Phaser: {phaserError}
            </p>
          )}
          <div className="bg-surface-container p-md rounded-md space-y-xs">
            <p className="font-display text-xl text-amber-300">
              Nivel {level}: {levelInfo.label}
            </p>
            <p className="font-label-md text-label-md text-on-surface">
              Producción: <span className="font-bold">{levelInfo.goldPerMin} oro/min</span>
            </p>
            <p className="font-label-md text-label-md text-on-surface">
              Oro acumulado:{' '}
              <span className="font-bold text-amber-300">{pendingGold}</span>
            </p>
            <p className="font-label-sm text-label-sm text-outline">Tu oro: {userGold}</p>
          </div>
          <Button
            variant="gold"
            size="lg"
            onClick={handleClaim}
            disabled={pendingGold <= 0 || claiming}
            isLoading={claiming}
            className="w-full"
          >
            <span className="material-symbols-outlined">savings</span>
            Reclamar {pendingGold} oro
          </Button>
          {lastClaimedAmount > 0 && (
            <p className="font-label-sm text-emerald-400 font-bold">
              ¡+{lastClaimedAmount} oro reclamado!
            </p>
          )}
        </div>
      </GoldCard>

      {nextLevel && (
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
            <Button variant="outline" onClick={handleUpgrade} disabled={!canUpgrade}>
              <span className="material-symbols-outlined">upgrade</span>
              {upgradeCost} oro
            </Button>
          </div>
        </StoneCard>
      )}

      <StoneCard className="p-md">
        <h3 className="font-title-md text-title-md text-on-surface mb-sm">Cómo funciona</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          El dragón cuida tu tesoro y genera oro pasivamente. Cuanto mayor sea el nivel de la
          cueva, más oro produce por minuto. Puedes dejar la app y el dragón seguirá acumulando
          hasta 12 horas. Mejora la cueva para aumentar la producción.
        </p>
      </StoneCard>
    </div>
  )
}
