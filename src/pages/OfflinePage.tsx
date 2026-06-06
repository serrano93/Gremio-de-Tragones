import { Button } from '../components/ui/Button'
import { StoneCard } from '../components/ui/Card'

export default function OfflinePage() {
  return (
    <div className="min-h-dvh bg-surface flex items-center justify-center p-margin-mobile">
      <StoneCard className="text-center py-xl px-lg max-w-sm">
        <span className="material-symbols-outlined text-outline text-6xl mb-md ms-filled">wifi_off</span>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-sm">
          Sin conexión al reino
        </h1>
        <p className="font-body-md text-on-surface-variant mb-lg">
          Parece que te has aventurado más allá de las fronteras de la red.
          Tu progreso local está a salvo y se sincronizará al volver.
        </p>
        <Button variant="gold" onClick={() => window.location.reload()} className="w-full">
          <span className="material-symbols-outlined">refresh</span>
          Intentar reconectar
        </Button>
      </StoneCard>
    </div>
  )
}