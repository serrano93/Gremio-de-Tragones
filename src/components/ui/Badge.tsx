interface BadgeProps {
  label: string
  className?: string
  glow?: boolean
}

export function Badge({ label, className = '', glow = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-sm py-xs rounded-sm text-label-sm font-label-sm
        font-bold uppercase tracking-widest
        ${glow ? 'animate-flicker' : ''}
        ${className}
      `}
    >
      {label}
    </span>
  )
}