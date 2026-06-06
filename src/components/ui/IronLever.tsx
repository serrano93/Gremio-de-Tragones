import { useState } from 'react'

interface IronLeverProps {
  active?: boolean
  onToggle?: (active: boolean) => void
  className?: string
}

export function IronLever({ active = false, onToggle, className = '' }: IronLeverProps) {
  const [isActive, setIsActive] = useState(active)

  const handleToggle = () => {
    const newState = !isActive
    setIsActive(newState)
    onToggle?.(newState)
  }

  return (
    <div className={`iron-lever-track ${isActive ? 'lever-active' : ''} ${className}`} onClick={handleToggle}>
      <div className="iron-lever-handle" />
    </div>
  )
}