import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent
  }
}

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return true
      }
      if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    if (checkInstalled()) return

    const dismissedAt = localStorage.getItem('pwa_install_dismissed')
    if (dismissedAt) {
      const hoursSinceDismissed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60)
      if (hoursSinceDismissed < 24) return
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setShowBanner(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    const pollInterval = setInterval(() => {
      if (window.__pwaInstallPrompt && !deferredPrompt) {
        setDeferredPrompt(window.__pwaInstallPrompt)
        setShowBanner(true)
      }
    }, 1000)

    const timeout = setTimeout(() => clearInterval(pollInterval), 5000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearInterval(pollInterval)
      clearTimeout(timeout)
    }
  }, [deferredPrompt])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
      }
    } catch (err) {
      console.error('Install prompt error:', err)
    } finally {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa_install_dismissed', String(Date.now()))
  }

  if (isInstalled || !showBanner) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
        style={{
          width: 'min(440px, calc(100vw - 2rem))',
          maxWidth: 'calc(100vw - 2rem)',
        }}
      >
        <div className="bg-surface-container-high border-2 border-primary rounded-xl p-md shadow-2xl flex items-center gap-md">
          <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-2xl ms-filled">install_mobile</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-title-md text-title-md text-on-surface">Instalar Gremio</p>
            <p className="font-label-sm text-label-sm text-outline truncate">Añade la app a tu pantalla de inicio</p>
          </div>
          <button
            onClick={handleInstall}
            className="px-md py-xs bg-primary text-on-primary font-label-lg text-label-lg rounded-md hover:scale-105 active:scale-95 transition-transform min-h-[44px] min-w-[44px]"
            aria-label="Instalar aplicación"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="text-outline hover:text-on-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
