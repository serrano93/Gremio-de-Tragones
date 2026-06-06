import { useState, useCallback, useRef } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'

type ScanError = string | null

export function useQRScan(onScan: (decoded: string) => void) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<ScanError>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const stoppedRef = useRef(false)

  const startScan = useCallback(
    async (elementId: string) => {
      setError(null)
      stoppedRef.current = false

      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode(elementId)
        scannerRef.current = scanner

        setIsScanning(true)

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (stoppedRef.current) return
            onScan(decodedText)
            stopScan()
          },
          () => {
            // QR scan failure per frame — ignore silently
          },
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al iniciar escáner'
        setError(msg)
        setIsScanning(false)
      }
    },
    [onScan],
  )

  const stopScan = useCallback(async () => {
    stoppedRef.current = true
    setIsScanning(false)

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch {
        // Already stopped
      }
      scannerRef.current = null
    }
  }, [])

  return { isScanning, error, startScan, stopScan }
}
