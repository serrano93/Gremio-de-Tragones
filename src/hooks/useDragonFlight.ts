import { useState, useEffect, useCallback, useRef } from 'react'
import { claimMinigameReward, getCurrentUserGold, getMinigameHighscore, isUserLoggedIn } from '../lib/game-api'
import { calculateFlightReward, FLIGHT_ENTRY_COST } from '../lib/game-rewards'
import { gameSounds } from '../lib/game-sounds'
import localforage from 'localforage'

const GUEST_FLIGHT_HIGHSCORE_KEY = 'minigame_flight_highscore'
const GUEST_FLIGHT_LASTSCORE_KEY = 'minigame_flight_lastscore'

export type FlightState = 'idle' | 'playing' | 'gameover'

const WORLD_W = 360
const WORLD_H = 540
const DRAGON_W = 40
const DRAGON_H = 24
const PILLAR_W = 60
const GAP = 180
const BASE_PILLAR_SPEED = 150
const SPEED_INCREMENT = 30 // +30 px/s por cada 5 columnas
const MAX_PILLAR_SPEED = 400
const PILLAR_INTERVAL = 1500
const GRAVITY = 900
const FLAP_VELOCITY = -320

interface Pillar {
  container: Phaser.GameObjects.Container
  topHeight: number
  passed: boolean
}

export function useDragonFlight() {
  const [state, setState] = useState<FlightState>('idle')
  const [score, setScore] = useState(0)
  const [highscore, setHighscore] = useState(0)
  const [lastReward, setLastReward] = useState<{ xp: number; gold: number } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [userGold, setUserGold] = useState(0)
  const [entryError, setEntryError] = useState<string | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const scoreRef = useRef(0)
  const highscoreRef = useRef(0)
  const isGameOverRef = useRef(false)
  const isPlayingRef = useRef(false)
  const entryPaidRef = useRef(false)

  const refreshUserGold = useCallback(async () => {
    const gold = await getCurrentUserGold()
    setUserGold(gold)
  }, [])

  useEffect(() => {
    void refreshUserGold()
  }, [refreshUserGold])

  const refreshHighscore = useCallback(async () => {
    if (!isUserLoggedIn()) {
      const stored = (await localforage.getItem<number>(GUEST_FLIGHT_HIGHSCORE_KEY)) ?? 0
      setHighscore(stored)
      highscoreRef.current = stored
      return
    }
    const hs = await getMinigameHighscore('flight')
    setHighscore(hs)
    highscoreRef.current = hs
  }, [])

  useEffect(() => {
    refreshHighscore()
  }, [refreshHighscore])

  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  const startGame = useCallback(
    async (canvasParent: HTMLElement) => {
      setEntryError(null)
      // Charge entry fee (10 gold) for non-logged guests from localforage
      if (isUserLoggedIn()) {
        if (userGold < FLIGHT_ENTRY_COST) {
          setEntryError(`Necesitas ${FLIGHT_ENTRY_COST} oro para volar`)
          return
        }
        // Deduct via REST PATCH
        const sessionStr = localStorage.getItem('sb-xzgsjedajlyesnzciwva-auth-token')
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr) as {
              access_token: string
              user: { id: string }
            }
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?auth_id=eq.${session.user.id}`,
              {
                method: 'PATCH',
                headers: {
                  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gold: userGold - FLIGHT_ENTRY_COST }),
              }
            )
            if (!res.ok) {
              setEntryError('Error al cobrar entrada')
              return
            }
            setUserGold(userGold - FLIGHT_ENTRY_COST)
          } catch {
            setEntryError('Error al cobrar entrada')
            return
          }
        }
        entryPaidRef.current = true
      } else {
        const profile = (await localforage.getItem<{ xp: number; gold: number }>(
          'guestProfile'
        ))
        const currentGold = profile?.gold ?? 0
        if (currentGold < FLIGHT_ENTRY_COST) {
          setEntryError(`Necesitas ${FLIGHT_ENTRY_COST} oro para volar`)
          return
        }
        if (profile) {
          profile.gold = currentGold - FLIGHT_ENTRY_COST
          await localforage.setItem('guestProfile', profile)
        }
        setUserGold(currentGold - FLIGHT_ENTRY_COST)
        entryPaidRef.current = true
      }

      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }

      await new Promise((resolve) => requestAnimationFrame(resolve))

      if (!canvasParent.isConnected) return

      setScore(0)
      scoreRef.current = 0
      setLastReward(null)
      setIsNewRecord(false)
      setClaiming(false)
      isGameOverRef.current = false
      isPlayingRef.current = true
      setState('playing')
      gameSounds.resume()

      const Phaser = await import('phaser')
      if (!canvasParent.isConnected) return

      // No physics - all movement is manual in update()
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: canvasParent,
        width: WORLD_W,
        height: WORLD_H,
        backgroundColor: '#0F172A',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: {
          create(this: Phaser.Scene) {
            const scene = this as Phaser.Scene

            // Background clouds
            for (let i = 0; i < 3; i += 1) {
              const cloudY = 60 + i * 80
              const cloudX = 120 * i + 80
              const cloud = scene.add.ellipse(cloudX, cloudY, 80, 30, 0x4a5568, 0.5)
              scene.tweens.add({
                targets: cloud,
                x: cloudX - 400,
                duration: 12000 + i * 4000,
                repeat: -1,
                onRepeat: () => {
                  cloud.x = 360
                },
              })
            }

            // Ground
            scene.add.rectangle(WORLD_W / 2, WORLD_H - 20, WORLD_W, 40, 0x2d4a1f, 0.8)

            // Dragon
            const dragon = scene.add.container(80, WORLD_H / 2)
            const dragonBody = scene.add.rectangle(0, 0, DRAGON_W, DRAGON_H, 0xffd700)
            dragonBody.setStrokeStyle(2, 0xa68a20)
            const dragonWingL = scene.add.triangle(-2, 4, 0, 0, 12, -8, 12, 8, 0xffa500)
            const dragonWingR = scene.add.triangle(2, 4, 0, 0, -12, -8, -12, 8, 0xffa500)
            const dragonEye = scene.add.circle(8, -4, 3, 0x000000)
            dragon.add([dragonBody, dragonWingL, dragonWingR, dragonEye])
            dragon.setDepth(10)

            // State for update loop
            let dragonVy = 0
            const pillars: Pillar[] = []
            let lastPillarSpawn = 0
            let elapsed = 0

            // Score text
            const scoreText = scene.add.text(16, 16, '0', {
              fontSize: '40px',
              color: '#d4af37',
              fontStyle: 'bold',
              stroke: '#0F172A',
              strokeThickness: 4,
            })
            scoreText.setDepth(20)

            // Speed indicator (esquina superior derecha)
            const speedText = scene.add.text(WORLD_W - 16, 20, 'x1', {
              fontSize: '16px',
              color: '#94a3b8',
              fontStyle: 'bold',
              stroke: '#0F172A',
              strokeThickness: 3,
            })
            speedText.setOrigin(1, 0)
            speedText.setDepth(20)

            // Hint
            const hintText = scene.add.text(WORLD_W / 2, WORLD_H - 60, 'TOCA PARA ALETAR', {
              fontSize: '16px',
              color: '#d4af37',
              fontStyle: 'bold',
            })
            hintText.setOrigin(0.5)
            hintText.setDepth(20)
            scene.tweens.add({
              targets: hintText,
              alpha: { from: 1, to: 0.3 },
              duration: 600,
              yoyo: true,
              repeat: -1,
            })

            const spawnPillar = () => {
              const minTop = 60
              const maxTop = WORLD_H - 60 - GAP
              const topHeight = Phaser.Math.Between(minTop, maxTop)
              const container = scene.add.container(WORLD_W, 0)
              // Top pillar: hangs from top, height = topHeight
              const topRect = scene.add.rectangle(
                PILLAR_W / 2,
                topHeight / 2,
                PILLAR_W,
                topHeight,
                0x6b4423,
                1
              )
              topRect.setStrokeStyle(2, 0x4d2a10)
              // Bottom pillar: starts at topHeight + GAP, extends to bottom
              const bottomHeight = WORLD_H - (topHeight + GAP)
              const bottomRect = scene.add.rectangle(
                PILLAR_W / 2,
                topHeight + GAP + bottomHeight / 2,
                PILLAR_W,
                bottomHeight,
                0x6b4423,
                1
              )
              bottomRect.setStrokeStyle(2, 0x4d2a10)
              container.add([topRect, bottomRect])
              container.setDepth(5)
              pillars.push({ container, topHeight, passed: false })
            }

            const triggerGameOver = (finalScore: number) => {
              if (isGameOverRef.current) return
              isGameOverRef.current = true
              isPlayingRef.current = false
              gameSounds.crash()
              scene.cameras.main.shake(300, 0.01)
              setTimeout(() => {
                void onGameOver(finalScore)
              }, 500)
            }

            const flap = () => {
              if (isGameOverRef.current) return
              if (!isPlayingRef.current) return
              dragonVy = FLAP_VELOCITY
              gameSounds.flap()
              hintText.setVisible(false)
            }
            scene.input.on('pointerdown', flap)
            scene.input.keyboard?.on('keydown-SPACE', flap)
            scene.input.keyboard?.on('keydown-UP', flap)

            // AABB collision check
            const checkPillarCollision = (): boolean => {
              const dLeft = dragon.x - DRAGON_W / 2
              const dRight = dragon.x + DRAGON_W / 2
              const dTop = dragon.y - DRAGON_H / 2
              const dBottom = dragon.y + DRAGON_H / 2
              for (const p of pillars) {
                const pLeft = p.container.x
                const pRight = p.container.x + PILLAR_W
                // Top pillar: from y=0 to y=p.topHeight
                const topBottom = p.topHeight
                if (dRight > pLeft && dLeft < pRight && dBottom > 0 && dTop < topBottom) {
                  return true
                }
                // Bottom pillar: from y=p.topHeight+GAP to y=WORLD_H
                const bottomTop = p.topHeight + GAP
                if (
                  dRight > pLeft &&
                  dLeft < pRight &&
                  dBottom > bottomTop &&
                  dTop < WORLD_H
                ) {
                  return true
                }
              }
              return false
            }

            const onGameOver = async (finalScore: number) => {
              const reward = calculateFlightReward(finalScore)
              setScore(finalScore)
              const isNewRecord = finalScore > highscoreRef.current && finalScore > 0
              setIsNewRecord(isNewRecord)
              setState('gameover')
              if (isUserLoggedIn()) {
                setClaiming(true)
                const result = await claimMinigameReward(
                  'flight',
                  reward.xp,
                  reward.gold,
                  finalScore
                )
                setClaiming(false)
                if (result.success) {
                  setLastReward({
                    xp: result.xp_awarded || 0,
                    gold: result.gold_awarded || 0,
                  })
                  if (isNewRecord) await refreshHighscore()
                }
              } else {
                const profile = await localforage.getItem<{ xp: number; gold: number }>(
                  'guestProfile'
                )
                if (profile) {
                  profile.xp = (profile.xp || 0) + reward.xp
                  profile.gold = (profile.gold || 0) + reward.gold
                  await localforage.setItem('guestProfile', profile)
                }
                await localforage.setItem(GUEST_FLIGHT_LASTSCORE_KEY, finalScore)
                if (isNewRecord) {
                  await localforage.setItem(GUEST_FLIGHT_HIGHSCORE_KEY, finalScore)
                  highscoreRef.current = finalScore
                  setHighscore(finalScore)
                }
                setLastReward({ xp: reward.xp, gold: reward.gold })
              }
              if (gameRef.current) {
                gameRef.current.destroy(true)
                gameRef.current = null
              }
            }

            // Main update loop (no physics)
            scene.events.on('update', (_time: number, delta: number) => {
              if (isGameOverRef.current || !isPlayingRef.current) return

              // dt in seconds
              const dt = Math.min(delta, 50) / 1000
              elapsed += delta

              // Spawn pillars at intervals
              if (elapsed - lastPillarSpawn >= PILLAR_INTERVAL) {
                spawnPillar()
                lastPillarSpawn = elapsed
              }

              // Apply gravity to dragon
              dragonVy += GRAVITY * dt
              dragon.y += dragonVy * dt
              // Tilt dragon
              dragon.rotation = Phaser.Math.Clamp(dragonVy / 600, -0.4, 0.6)

              // Wing flapping
              dragonWingL.scaleY = 0.6 + Math.abs(Math.sin(elapsed / 80)) * 0.4
              dragonWingR.scaleY = dragonWingL.scaleY

              // Move pillars
              const currentSpeed = Math.min(
                MAX_PILLAR_SPEED,
                BASE_PILLAR_SPEED + Math.floor(scoreRef.current / 5) * SPEED_INCREMENT
              )
              const speedMultiplier = currentSpeed / BASE_PILLAR_SPEED
              const speedTextStr = `x${speedMultiplier.toFixed(1)}`
              if (speedText.text !== speedTextStr) {
                speedText.setText(speedTextStr)
                // Color shift: dim at x1, brighter at higher speed
                const intensity = Math.min(1, (speedMultiplier - 1) / 4)
                const r = Math.floor(148 + (255 - 148) * intensity)
                const g = Math.floor(163 + (215 - 163) * intensity)
                const b = Math.floor(184 + (0 - 184) * intensity)
                speedText.setColor(`rgb(${r}, ${g}, ${b})`)
              }
              for (let i = pillars.length - 1; i >= 0; i -= 1) {
                const p = pillars[i]
                p.container.x -= currentSpeed * dt
                if (p.container.x < -PILLAR_W) {
                  p.container.destroy()
                  pillars.splice(i, 1)
                } else if (!p.passed && p.container.x + PILLAR_W < dragon.x) {
                  p.passed = true
                  scoreRef.current += 1
                  scoreText.setText(String(scoreRef.current))
                  gameSounds.score()
                }
              }

              // Check game over: out of world or collision
              if (dragon.y < 0 || dragon.y > WORLD_H) {
                triggerGameOver(scoreRef.current)
                return
              }
              if (checkPillarCollision()) {
                triggerGameOver(scoreRef.current)
                return
              }
            })

            // Spawn first pillar
            spawnPillar()
            lastPillarSpawn = 0
          },
        },
      })
      gameRef.current = game
    },
    [refreshHighscore, userGold]
  )

  const reset = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
    }
    setState('idle')
    setScore(0)
    scoreRef.current = 0
    setLastReward(null)
    setIsNewRecord(false)
    isGameOverRef.current = false
    isPlayingRef.current = false
  }, [])

  return {
    state,
    score,
    highscore,
    lastReward,
    claiming,
    isNewRecord,
    userGold,
    entryError,
    entryCost: FLIGHT_ENTRY_COST,
    startGame,
    reset,
    refreshHighscore,
  }
}
