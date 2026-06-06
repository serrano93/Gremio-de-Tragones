import { useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { useQRScan } from '../../hooks/useQRScan'

interface MerchantScannerProps {
  onScan: (payload: string) => void
}

export function MerchantScanner({ onScan }: MerchantScannerProps) {
  const [isActive, setIsActive] = useState(false)
  const { isScanning, error, startScan, stopScan } = useQRScan((decoded) => {
    onScan(decoded)
    setIsActive(false)
  })

  const handleStart = async () => {
    setIsActive(true)
    await startScan('qr-reader')
  }

  const handleStop = async () => {
    await stopScan()
    setIsActive(false)
  }

  return (
    <div className="space-y-md">
      {!isActive ? (
        <Card className="text-center py-xl">
          <span className="material-symbols-outlined text-primary text-6xl mb-md ms-filled">qr_code_scanner</span>
          <h3 className="font-title-lg text-title-lg text-on-surface mb-sm">Escanear Código de Aventurero</h3>
          <p className="font-label-sm text-outline mb-lg">
            Solicita al aventurero que muestre su código QR de misión activa
          </p>
          <Button variant="gold" size="lg" onClick={handleStart} className="mx-auto">
            <span className="material-symbols-outlined">camera</span>
            Activar Escáner
          </Button>
        </Card>
      ) : (
        <div className="space-y-md">
          <div
            id="qr-reader"
            className="w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden border-2 border-outline-variant bg-black"
            aria-label="Visor de escáner QR"
          />

          {isScanning ? (
            <div className="flex items-center justify-center gap-sm text-primary">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span className="font-label-lg text-label-lg">Escaneando...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-sm text-outline">
              <span className="font-label-lg text-label-lg">Esperando cámara...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-sm p-md bg-error-container/10 border border-error-container/20 rounded-xl text-error font-label-lg">
              <span className="material-symbols-outlined">error</span>
              <span className="font-label-lg">{error}</span>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleStop} className="w-full">
            Detener Escáner
          </Button>
        </div>
      )}
    </div>
  )
}