import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ParentContext } from './context/ParentContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'

const App = () => {
  const { token } = useContext(ParentContext)

  return (
    <LanguageProvider>
      <ToastContainer position='top-center' autoClose={2500} />
      <ConfirmHost />
      {!token ? (
        <div className='min-h-screen bg-bg'>
          <Login />
        </div>
      ) : (
        <div className='min-h-screen bg-bg pb-20'>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='*' element={<Navigate to='/' />} />
          </Routes>
          <BottomNav />
        </div>
      )}
    </LanguageProvider>
  )
}

export default App
