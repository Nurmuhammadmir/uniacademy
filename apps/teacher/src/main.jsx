import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import TeacherContextProvider from './context/TeacherContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <TeacherContextProvider>
        <App />
      </TeacherContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
