import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for offline support & PWA with auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      // Check for updates every 60 seconds
      setInterval(() => registration.update(), 60 * 1000)

      // When a new SW is found, activate it immediately
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available - tell it to take over
            newWorker.postMessage('SKIP_WAITING')
          }
        })
      })

      // When the new SW takes control, reload to get fresh assets
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    } catch {
      // SW registration failed - app works fine without it
    }
  })
}
