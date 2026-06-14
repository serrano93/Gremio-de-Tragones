import { useEffect, useRef } from 'react'
import { ROULETTE_RESULTS } from '../../lib/game-rewards'

interface RouletteWheelProps {
  spinning: boolean
  resultIndex: number | null
  onSpinComplete?: () => void
}

const SEGMENT_COLORS = ['#3a5a40', '#a68a64', '#6b4423', '#d4af37', '#4a2818']

const SEGMENT_LABELS: Record<string, string> = {
  xp5: '5 XP',
  xp10: '10 XP',
  xp15: '15 XP',
  xp30: '30 XP',
  xp50: '50 XP',
  g50: '50 oro',
  g100: '100 oro',
  g200: '200 oro',
  g300: '300 oro',
  jp1k: '1000',
}

const SPIN_DURATION_MS = 5000

function easeInQuad(t: number): number {
  return t * t
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function twoStageEasing(progress: number): number {
  if (progress < 0.5) {
    return 0.5 * easeInQuad(progress * 2)
  }
  return 0.5 + 0.5 * easeOutBack((progress - 0.5) * 2)
}

export function RouletteWheel({ spinning, resultIndex, onSpinComplete }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const startAngleRef = useRef<number>(0)
  const targetAngleRef = useRef<number>(0)
  const currentAngleRef = useRef<number>(0)

  const drawWheel = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    angle: number
  ) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    const segments = ROULETTE_RESULTS.length
    const arc = (2 * Math.PI) / segments

    for (let i = 0; i < segments; i += 1) {
      const startAngle = angle + i * arc
      const endAngle = startAngle + arc

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + arc / 2)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#f5f0e8'
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif'
      const labelText = SEGMENT_LABELS[ROULETTE_RESULTS[i].id] ?? ROULETTE_RESULTS[i].label
      ctx.fillText(labelText, radius * 0.7, 5)
      ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(centerX, centerY, 28, 0, 2 * Math.PI)
    ctx.fillStyle = '#d4af37'
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI)
    ctx.fillStyle = '#0f172a'
    ctx.fill()

    const arrowX = centerX + radius + 10
    const arrowY = centerY
    ctx.beginPath()
    ctx.moveTo(arrowX - 30, arrowY)
    ctx.lineTo(arrowX, arrowY - 18)
    ctx.lineTo(arrowX, arrowY + 18)
    ctx.closePath()
    const arrowGradient = ctx.createLinearGradient(arrowX - 30, arrowY, arrowX, arrowY)
    arrowGradient.addColorStop(0, '#ffd700')
    arrowGradient.addColorStop(1, '#a68a20')
    ctx.fillStyle = arrowGradient
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(arrowX + 8, centerY, 6, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffd700'
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 30

    if (!spinning && resultIndex === null) {
      drawWheel(ctx, centerX, centerY, radius, currentAngleRef.current)
      return
    }

    if (!spinning && resultIndex !== null) {
      const arc = (2 * Math.PI) / ROULETTE_RESULTS.length
      const twoPi = 2 * Math.PI
      const normalizedCurrent = ((currentAngleRef.current % twoPi) + twoPi) % twoPi
      const desiredSegmentCenter = -resultIndex * arc - arc / 2
      const diff = desiredSegmentCenter - normalizedCurrent
      const finalAngle = currentAngleRef.current + diff
      currentAngleRef.current = finalAngle
      drawWheel(ctx, centerX, centerY, radius, finalAngle)
      return
    }

    if (spinning && resultIndex !== null) {
      const arc = (2 * Math.PI) / ROULETTE_RESULTS.length
      const twoPi = 2 * Math.PI
      const normalizedCurrent = ((currentAngleRef.current % twoPi) + twoPi) % twoPi
      const desiredSegmentCenter = -resultIndex * arc - arc / 2
      const baseTurns = 5
      const fullSpins = baseTurns * twoPi
      let delta = desiredSegmentCenter - normalizedCurrent
      while (delta > 0) delta -= twoPi
      const totalRotation = fullSpins + delta

      startAngleRef.current = currentAngleRef.current
      startTimeRef.current = performance.now()
      targetAngleRef.current = currentAngleRef.current + totalRotation

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / SPIN_DURATION_MS, 1)
        const eased = twoStageEasing(progress)
        const currentAngle =
          startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * eased
        drawWheel(ctx, centerX, centerY, radius, currentAngle)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          currentAngleRef.current = targetAngleRef.current
          animationRef.current = null

          if (onSpinComplete) onSpinComplete()
          drawWheel(ctx, centerX, centerY, radius, currentAngleRef.current)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [spinning, resultIndex, onSpinComplete])

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="max-w-full h-auto"
        style={{ filter: 'drop-shadow(0 4px 16px rgba(212, 175, 55, 0.5))' }}
      />
    </div>
  )
}
