import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registering a service worker is what makes the browser consider this app
// installable (Add to Home Screen / Install App) — see public/sw.js.
if ('serviceWorker' in navigator) {
  let reloadingForUpdate = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return
    reloadingForUpdate = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => registration.update())
      .catch(() => {})
  })
}
