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

// Capacitor deep link handler — routes com.gremio.tragones:// URLs to the WebView
async function setupCapacitorDeepLink() {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor
  if (!cap?.isNativePlatform?.()) return

  try {
    const { App: CapApp } = await import('@capacitor/app')
    await CapApp.addListener('appUrlOpen', (event: { url: string }) => {
      console.log('[DeepLink] appUrlOpen received:', event.url)
      const url = event.url
      if (url.startsWith('com.gremio.tragones://')) {
        const path = url.replace('com.gremio.tragones://', '').replace(/\/+$/, '')
        const target = `/${path || ''}${url.includes('?') ? url.substring(url.indexOf('?')) : ''}`
        console.log('[DeepLink] navigating WebView to:', target)
        window.location.assign(target)
      }
    })

    const launchUrl = await CapApp.getLaunchUrl()
    if (launchUrl?.url && launchUrl.url.startsWith('com.gremio.tragones://')) {
      console.log('[DeepLink] launchUrl:', launchUrl.url)
      const path = launchUrl.url.replace('com.gremio.tragones://', '').replace(/\/+$/, '')
      const target = `/${path || ''}${launchUrl.url.includes('?') ? launchUrl.url.substring(launchUrl.url.indexOf('?')) : ''}`
      console.log('[DeepLink] navigating from launch to:', target)
      setTimeout(() => window.location.assign(target), 100)
    }
  } catch (err) {
    console.warn('[DeepLink] @capacitor/app not available:', err)
  }
}

setupCapacitorDeepLink()
