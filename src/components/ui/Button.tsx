import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps {
  variant?: 'gold' | 'outline' | 'ghost' | 'danger' | 'stone'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
  children?: ReactNode
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  id?: string
  'aria-label'?: string
}

const variants = {
  gold: 'bg-primary-container text-on-primary-container hover:bg-primary active:bg-on-primary-container font-label-lg tracking-widest uppercase',
  stone: 'stone-button text-primary font-label-lg tracking-widest uppercase',
  outline: 'border-2 border-outline text-outline hover:text-primary hover:border-primary active:scale-95 transition-all font-label-lg tracking-wider uppercase',
  ghost: 'text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors font-label-lg',
  danger: 'bg-error-container text-on-error-container hover:bg-error/20 active:bg-error/30 font-label-lg',
}

const sizes = {
  sm: 'px-md py-xs text-sm rounded-sm min-h-[36px]',
  md: 'px-lg py-sm text-base rounded-sm min-h-[44px]',
  lg: 'px-xl py-md text-lg rounded-sm min-h-[52px]',
}

export function Button({
  variant = 'gold',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`
        inline-flex items-center justify-center gap-sm font-label-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="material-symbols-outlined animate-spin">progress_activity</span>
      ) : null}
      {children}
    </motion.button>
  )
}