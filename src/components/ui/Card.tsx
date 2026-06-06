import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`
        bg-surface-container border border-outline-variant
        rounded-lg p-md transition-all duration-200
        ${hover ? 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 cursor-pointer' : ''}
        ${className}
      `}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </motion.div>
  )
}

export function GoldCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`stone-block rounded-xl p-md ${className}`}
    >
      {children}
    </div>
  )
}

export function StoneCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`stone-block p-md flex flex-col items-center justify-center ${className}`}>
      {children}
    </div>
  )
}

export function ParchmentCard({ children, className = '', rotate = '0deg' }: { children: ReactNode; className?: string; rotate?: string }) {
  return (
    <div
      className={`parchment-texture p-md border-2 border-outline-variant rounded-lg ${className}`}
      style={{ transform: `rotate(${rotate})`, transition: 'transform 0.3s' }}
    >
      {children}
    </div>
  )
}