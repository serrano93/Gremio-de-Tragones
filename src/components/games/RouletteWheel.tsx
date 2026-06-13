import { useEffect, useRef } from 'react'
import { ROULETTE_RESULTS } from '../../lib/game-rewards'

interface RouletteWheelProps {
  spinning: boolean
  resultIndex: number | null
  onSpinComplete?: () => void
}

const SEGMENT_COLORS = [
  '#3a5a40', '#a68a64', '#6b4423', '#d4af37',
  '#3a5a40', '#a68a64', '#6b4423', '#d4af37',
  '#3a5a40', '#d4af37',
]

export function RouletteWheel({ spinning, resultIndex, onSpinComplete }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const startAngleRef = useRef<number>(0)
  const targetAngleRef = useRef<number>(0)
  const currentAngleRef = useRef<number>(0)

  const drawWheel = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, angle: number) => {
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
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + arc / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#f5f0e8'
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
      ctx.fillText(ROULETTE_RESULTS[i].label, radius - 10, 5)
      ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI)
    ctx.fillStyle = '#d4af37'
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(centerX, centerY - radius - 5)
    ctx.lineTo(centerX - 12, centerY - radius + 15)
    ctx.lineTo(centerX + 12, centerY - radius + 15)
    ctx.closePath()
    ctx.fillStyle = '#d4af37'
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
    const radius = Math.min(centerX, centerY) - 20

    if (!spinning && resultIndex === null) {
      drawWheel(ctx, centerX, centerY, radius, 0)
      return
    }

    if (!spinning && resultIndex !== null) {
      const targetSegment = resultIndex
      const arc = (2 * Math.PI) / ROULETTE_RESULTS.length
      const finalAngle = -targetSegment * arc - arc / 2
      drawWheel(ctx, centerX, centerY, radius, finalAngle)
      return
    }

    if (spinning && resultIndex !== null) {
      const targetSegment = resultIndex
      const arc = (2 * Math.PI) / ROULETTE_RESULTS.length
      const totalRotation = 5 * 2 * Math.PI + (-targetSegment * arc - arc / 2)

      startAngleRef.current = currentAngleRef.current
      startTimeRef.current = performance.now()
      targetAngleRef.current = currentAngleRef.current + totalRotation

      const duration = 4000

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 4)
        const currentAngle = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * eased

        drawWheel(ctx, centerX, centerY, radius, currentAngle)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          currentAngleRef.current = targetAngleRef.current
          animationRef.current = null
          if (onSpinComplete) onSpinComplete()
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
        style={{ filter: 'drop-shadow(0 4px 12px rgba(212, 175, 55, 0.4))' }}
      />
    </div>
  )
}
