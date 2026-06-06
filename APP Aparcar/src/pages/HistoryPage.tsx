import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Navigation } from 'lucide-react'
import { useParkingHistory } from '../hooks'
import { formatDate, openGoogleMaps } from '../lib/storage'

export default function HistoryPage() {
  const navigate = useNavigate()
  const { history, refreshHistory } = useParkingHistory()

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface px-4 py-4 flex items-center gap-3 border-b border-surfaceLight">
        <button onClick={() => navigate('/')} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-text" />
        </button>
        <h1 className="font-semibold text-lg text-text">Historial</h1>
      </header>

      <main className="flex-1 p-4">
        {history.length === 0 ? (
          <div className="bg-surface rounded-2xl p-6 border border-surfaceLight text-center">
            <MapPin className="w-12 h-12 text-textMuted mx-auto mb-3" />
            <p className="text-textMuted">No hay ubicaciones guardadas todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((location) => (
              <div
                key={location.id}
                className="bg-surface rounded-xl p-4 border border-surfaceLight"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-textMuted text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(location.timestamp)}</span>
                    </div>
                    <p className="text-text font-mono text-sm">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                    <p className="text-textMuted text-xs">{location.deviceName}</p>
                  </div>
                  <button
                    onClick={() => openGoogleMaps(location.latitude, location.longitude)}
                    className="bg-primary hover:bg-primaryDark text-white p-3 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <Navigation className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}