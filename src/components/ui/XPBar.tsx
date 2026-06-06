import { motion } from 'framer-motion'

interface XPBarProps {
  current: number
  max: number
  showLabel?: boolean
  className?: string
}

export function XPBar({ current, max, showLabel = true, className = '' }: XPBarProps) {
  const progress = max > 0 ? Math.min((current / max) * 100, 100) : 0
  const label = showLabel ? `${current} / ${max} XP` : undefined

  return (
    <div className={`space-y-1.5 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="font-label-lg text-label-lg text-secondary uppercase tracking-wider">Legendary Progress</span>
          <span className="font-label-lg text-label-lg text-secondary">{progress.toFixed(0)}%</span>
        </div>
      )}
      <div
        className="h-6 bg-surface-container-lowest border-2 border-outline-variant rounded-sm inner-carved relative p-1"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Barra de experiencia'}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full gold-liquid"
          style={{ opacity: 0.86 }}
        />
      </div>
    </div>
  )
}