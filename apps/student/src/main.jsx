import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import StudentContextProvider from './context/StudentContext.jsx'
import './lib/fontScale.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StudentContextProvider>
        <App />
      </StudentContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
