import { useState, useEffect } from 'react'

interface LoadingScreenProps {
  onRetry?: () => void
  message?: string
}

export function LoadingScreen({ onRetry, message = 'Cargando tu Gremio' }: LoadingScreenProps) {
  const [showSlow, setShowSlow] = useState(false)
  const [showRetry, setShowRetry] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowSlow(true), 5000)
    const t2 = setTimeout(() => setShowRetry(true), 20000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[300] bg-surface flex flex-col items-center justify-center px-margin-mobile">
      <div className="flex flex-col items-center gap-lg max-w-xs text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-5xl ms-filled animate-pulse">shield</span>
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>

        <div className="space-y-xs">
          <h1 className="font-display-lg text-headline-lg text-primary">Gremio de Tragones</h1>
          <p className="font-body-md text-on-surface-variant">{message}...</p>
        </div>

        {showSlow && !showRetry && (
          <p className="font-label-sm text-outline animate-fade-in">
            Esto puede tardar un momento la primera vez
          </p>
        )}

        {showRetry && onRetry && (
          <div className="animate-fade-in space-y-sm">
            <p className="font-label-sm text-error">Está tardando demasiado</p>
            <button
              onClick={onRetry}
              className="px-lg py-sm bg-primary text-on-primary font-label-lg text-label-lg rounded-md hover:scale-105 active:scale-95 transition-transform min-h-[44px]"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
