interface WaxSealProps {
  status: 'online' | 'suspended'
  className?: string
}

export function WaxSeal({ status, className = '' }: WaxSealProps) {
  return (
    <span
      className={`wax-seal ${status === 'online' ? 'wax-online' : 'wax-suspended'} ${className}`}
      aria-label={status === 'online' ? 'En línea' : 'Suspendido'}
    />
  )
}