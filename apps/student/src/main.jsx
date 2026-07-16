import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import StudentContextProvider from './context/StudentContext.jsx'
import './lib/fontScale.js'
import './index.css'

// registers the passthrough service worker so the browser considers this app installable
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StudentContextProvider>
        <App />
      </StudentContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
