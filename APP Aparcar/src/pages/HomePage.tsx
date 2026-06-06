import { useNavigate } from 'react-router-dom'
import { Car, MapPin, Clock, History, Settings, Navigation } from 'lucide-react'
import { useLocation } from '../hooks'
import { formatDate, openGoogleMaps } from '../lib/storage'

export default function HomePage() {
  const navigate = useNavigate()
  const { currentLocation } = useLocation()

  const handleGoToCar = () => {
    if (currentLocation) {
      openGoogleMaps(currentLocation.latitude, currentLocation.longitude)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface px-4 py-4 flex items-center gap-3 border-b border-surfaceLight">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <Car className="w-5 h-5 text-white" />
        </div>
        <h1 className="font-semibold text-lg text-text">Aparcar</h1>
      </header>

      <main className="flex-1 p-4 space-y-6">
        <div className="bg-surface rounded-2xl p-5 border border-surfaceLight">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-textMuted text-sm">Dispositivo Bluetooth</p>
              <p className="text-text font-medium">Mercedes Clase A</p>
            </div>
          </div>
        </div>

        {currentLocation ? (
          <div className="bg-surface rounded-2xl p-5 border border-surfaceLight space-y-4">
            <div className="flex items-center gap-2 text-textMuted">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Última ubicación</span>
            </div>

            <div className="space-y-2">
              <p className="text-text font-medium">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
              <div className="flex items-center gap-2 text-textMuted text-sm">
                <Clock className="w-4 h-4" />
                <span>{formatDate(currentLocation.timestamp)}</span>
              </div>
            </div>

            <button
              onClick={handleGoToCar}
              className="w-full bg-primary hover:bg-primaryDark text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            >
              <Navigation className="w-5 h-5" />
              IR AL COCHE
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl p-5 border border-surfaceLight text-center">
            <MapPin className="w-12 h-12 text-textMuted mx-auto mb-3" />
            <p className="text-textMuted">
              Cuando desconectes el Bluetooth del coche, la ubicación se guardará automáticamente.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/history')}
            className="w-full bg-surface hover:bg-surfaceLight rounded-xl p-4 flex items-center justify-between transition-colors border border-surfaceLight"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-textMuted" />
              <span className="text-text">Historial</span>
            </div>
            <span className="text-textMuted">›</span>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="w-full bg-surface hover:bg-surfaceLight rounded-xl p-4 flex items-center justify-between transition-colors border border-surfaceLight"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-textMuted" />
              <span className="text-text">Ajustes</span>
            </div>
            <span className="text-textMuted">›</span>
          </button>
        </div>
      </main>
    </div>
  )
}