import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bluetooth, MapPin, Bell, Trash2, CheckCircle } from 'lucide-react'
import { useBluetooth } from '../hooks'
import { useParkingHistory } from '../hooks'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { selectedDevice, selectDevice } = useBluetooth()
  const { clearHistory } = useParkingHistory()
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [devices, setDevices] = useState<{ name: string; address: string }[]>([])

  useEffect(() => {
    setDevices([
      { name: 'MBAU-XXXX', address: 'AA:BB:CC:DD:EE:FF' },
      { name: 'Mercedes-AME-XXX', address: '11:22:33:44:55:66' },
    ])
  }, [])

  const handleSelectDevice = (device: { name: string; address: string }) => {
    selectDevice(device)
    setShowDeviceModal(false)
  }

  const handleClearHistory = () => {
    if (confirm('¿Borrar todo el historial?')) {
      clearHistory()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface px-4 py-4 flex items-center gap-3 border-b border-surfaceLight">
        <button onClick={() => navigate('/')} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-text" />
        </button>
        <h1 className="font-semibold text-lg text-text">Ajustes</h1>
      </header>

      <main className="flex-1 p-4 space-y-6">
        <section className="space-y-3">
          <h2 className="text-textMuted text-sm font-medium flex items-center gap-2">
            <Bluetooth className="w-4 h-4" />
            Bluetooth del coche
          </h2>
          <button
            onClick={() => setShowDeviceModal(true)}
            className="w-full bg-surface hover:bg-surfaceLight rounded-xl p-4 flex items-center justify-between transition-colors border border-surfaceLight"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bluetooth className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-text font-medium">
                  {selectedDevice?.name || 'No seleccionado'}
                </p>
                {selectedDevice && (
                  <p className="text-textMuted text-xs">{selectedDevice.address}</p>
                )}
              </div>
            </div>
            <span className="text-textMuted text-lg">›</span>
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="text-textMuted text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Permisos
          </h2>
          <div className="bg-surface rounded-xl p-4 border border-surfaceLight space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-text">Bluetooth</span>
              <span className="text-success flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Concedido
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text">Ubicación</span>
              <span className="text-success flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Concedido
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text">Notificaciones</span>
              <span className="text-success flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Concedido
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-textMuted text-sm font-medium flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Servicio en segundo plano
          </h2>
          <div className="bg-surface rounded-xl p-4 border border-surfaceLight flex items-center justify-between">
            <span className="text-text">Estado del servicio</span>
            <span className="bg-success/20 text-success px-3 py-1 rounded-full text-sm font-medium">
              ACTIVO
            </span>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-textMuted text-sm font-medium flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Datos
          </h2>
          <button
            onClick={handleClearHistory}
            className="w-full bg-surface hover:bg-red-500/10 rounded-xl p-4 flex items-center gap-3 transition-colors border border-surfaceLight text-red-400"
          >
            <Trash2 className="w-5 h-5" />
            <span>Borrar historial</span>
          </button>
        </section>
      </main>

      {showDeviceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-surface w-full rounded-t-3xl p-6">
            <div className="w-12 h-1 bg-textMuted rounded-full mx-auto mb-4" />
            <h3 className="text-text font-semibold text-lg mb-4">Seleccionar dispositivo</h3>
            <div className="space-y-2 mb-6">
              {devices.map((device) => (
                <button
                  key={device.address}
                  onClick={() => handleSelectDevice(device)}
                  className="w-full bg-surfaceLight hover:bg-primary/20 rounded-xl p-4 flex items-center gap-3 transition-colors"
                >
                  <Bluetooth className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <p className="text-text font-medium">{device.name}</p>
                    <p className="text-textMuted text-xs">{device.address}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDeviceModal(false)}
              className="w-full bg-surfaceLight text-text py-3 rounded-xl font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}