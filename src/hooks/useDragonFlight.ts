import { useState, useEffect, useCallback, useRef } from 'react'
import { claimMinigameReward, getMinigameHighscore, isUserLoggedIn } from '../lib/game-api'
import { calculateFlightReward } from '../lib/game-rewards'
import localforage from 'localforage'

const GUEST_FLIGHT_HIGHSCORE_KEY = 'minigame_flight_highscore'
const GUEST_FLIGHT_LASTSCORE_KEY = 'minigame_flight_lastscore'

export type FlightState = 'idle' | 'playing' | 'gameover'

export function useDragonFlight() {
  const [state, setState] = useState<FlightState>('idle')
  const [score, setScore] = useState(0)
  const [highscore, setHighscore] = useState(0)
  const [lastReward, setLastReward] = useState<{ xp: number; gold: number } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const gameRef = useRef<Phaser.Game | null>(null)

  const refreshHighscore = useCallback(async () => {
    if (!isUserLoggedIn()) {
      const stored = (await localforage.getItem<number>(GUEST_FLIGHT_HIGHSCORE_KEY)) ?? 0
      setHighscore(stored)
      return
    }
    const hs = await getMinigameHighscore('flight')
    setHighscore(hs)
  }, [])

  useEffect(() => {
    refreshHighscore()
  }, [refreshHighscore])

  const startGame = useCallback((canvasParent: HTMLElement) => {
    if (gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
    }

    setScore(0)
    setLastReward(null)
    setState('playing')

    void import('phaser').then((PhaserModule) => {
      const Phaser = PhaserModule.default
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: canvasParent,
        width: 360,
        height: 540,
        backgroundColor: '#0F172A',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 800 }, debug: false },
        },
        scene: {
          preload() {
            const g = this as Phaser.Scene & { load: Phaser.LoaderPlugin; add: Phaser.GameObjects.Factory; input: Phaser.Input.InputPlugin }
            const graphics = g.add.graphics()
            graphics.fillStyle(0xd4af37, 1)
            graphics.fillRoundedRect(0, 0, 40, 24, 4)
            graphics.generateTexture('dragon', 40, 24)
            graphics.destroy()
            const pillarGraphics = g.add.graphics()
            pillarGraphics.fillStyle(0x6b4423, 1)
            pillarGraphics.fillRoundedRect(0, 0, 60, 200, 6)
            pillarGraphics.generateTexture('pillar', 60, 200)
            pillarGraphics.destroy()
          },
          create() {
            const scene = this as Phaser.Scene & Phaser.Physics.Arcade.SpriteWithDynamicBody
            const dragon = scene.physics.add.sprite(80, 270, 'dragon')
            dragon.setCollideWorldBounds(true)
            dragon.body!.setSize(36, 22)

            const pillarGroup = scene.physics.add.group()
            const scoreText = scene.add.text(16, 16, '0', {
              fontSize: '32px',
              color: '#d4af37',
              fontStyle: 'bold',
            })

            const spawnPillar = () => {
              const gap = 200
              const minY = 100
              const maxY = 540 - 100 - gap
              const topHeight = Phaser.Math.Between(minY, maxY)
              const topPillar = scene.physics.add.sprite(400, topHeight, 'pillar') as Phaser.Physics.Arcade.ImageWithDynamicBody
              topPillar.setOrigin(0, 0)
              topPillar.body!.setSize(60, topHeight)
              topPillar.body!.setAllowGravity(false)
              topPillar.body!.setVelocityX(-150)
              pillarGroup.add(topPillar)

              const bottomPillar = scene.physics.add.sprite(400, topHeight + gap, 'pillar') as Phaser.Physics.Arcade.ImageWithDynamicBody
              bottomPillar.setOrigin(0, 0)
              bottomPillar.body!.setSize(60, 540 - (topHeight + gap))
              bottomPillar.body!.setAllowGravity(false)
              bottomPillar.body!.setVelocityX(-150)
              pillarGroup.add(bottomPillar)
            }

            let currentScore = 0
            scene.input.on('pointerdown', () => {
              if (dragon.body) dragon.body!.setVelocityY(-280)
            })

            scene.physics.add.collider(dragon, pillarGroup, () => {
              game.scene.pause()
              const finalScore = currentScore
              scene.time.delayedCall(500, async () => {
                await onGameOver(finalScore)
              })
            })

            scene.time.addEvent({ delay: 1500, callback: spawnPillar, loop: true })

            scene.update = () => {
              if (dragon.y > 540 || dragon.y < 0) {
                game.scene.pause()
                const finalScore = currentScore
                scene.time.delayedCall(500, async () => {
                  await onGameOver(finalScore)
                })
              }
              pillarGroup.getChildren().forEach((child) => {
                const pillar = child as Phaser.Physics.Arcade.ImageWithDynamicBody
                if (pillar.x < -60) {
                  pillar.destroy()
                  currentScore += 1
                  scoreText.setText(String(currentScore))
                }
              })
            }

            const onGameOver = async (finalScore: number) => {
              const reward = calculateFlightReward(finalScore)
              setScore(finalScore)
              setState('gameover')
              if (isUserLoggedIn()) {
                setClaiming(true)
                const result = await claimMinigameReward('flight', reward.xp, reward.gold, finalScore)
                setClaiming(false)
                if (result.success) {
                  setLastReward({ xp: result.xp_awarded || 0, gold: result.gold_awarded || 0 })
                  await refreshHighscore()
                }
              } else {
                const profile = (await localforage.getItem<{ xp: number; gold: number }>('guestProfile'))
                if (profile) {
                  profile.xp = (profile.xp || 0) + reward.xp
                  profile.gold = (profile.gold || 0) + reward.gold
                  await localforage.setItem('guestProfile', profile)
                }
                await localforage.setItem(GUEST_FLIGHT_LASTSCORE_KEY, finalScore)
                if (finalScore > highscore) {
                  await localforage.setItem(GUEST_FLIGHT_HIGHSCORE_KEY, finalScore)
                  setHighscore(finalScore)
                }
                setLastReward({ xp: reward.xp, gold: reward.gold })
              }
              if (gameRef.current) {
                gameRef.current.destroy(true)
                gameRef.current = null
              }
            }
          },
        },
      })
      gameRef.current = game
    })
  }, [highscore, refreshHighscore])

  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setScore(0)
    setLastReward(null)
  }, [])

  return {
    state,
    score,
    highscore,
    lastReward,
    claiming,
    startGame,
    reset,
    refreshHighscore,
  }
}
