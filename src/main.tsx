import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

// Detectar si hay una versión vieja del SW que cacheaba JS
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      if (reg.active && !reg.active.scriptURL.includes('sw.js')) {
        reg.unregister().then(() => console.log('SW antiguo desregistrado'))
      }
    }
  })
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA install prompt — show custom button when beforeinstallprompt fires
window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault()
  const deferredPrompt = e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

  // Store for later use; a custom install button in the UI can trigger deferredPrompt.prompt()
  ;(window as unknown as Record<string, unknown>).__pwaInstallPrompt = deferredPrompt

  console.log('📱 PWA instalable — beforeinstallprompt capturado')
})

// Register service worker with update notification
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('🔄 Nueva versión de la PWA disponible. Recarga para actualizar.')
        }
      })
    })
  })
}
