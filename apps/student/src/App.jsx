import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { StudentContext } from './context/StudentContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Login from './pages/Login.jsx'
import Today from './pages/Today.jsx'
import Progress from './pages/Progress.jsx'
import Ranking from './pages/Ranking.jsx'
import Exam from './pages/Exam.jsx'
import Profile from './pages/Profile.jsx'
import GoogleTranslateWidget from './components/GoogleTranslateWidget.jsx'

const App = () => {
  const { token, settings } = useContext(StudentContext)

  return (
    <LanguageProvider enabledLanguages={settings?.enabledStudentLanguages}>
      <ToastContainer position='top-center' autoClose={2500} />
      <ConfirmHost />
      {!token ? (
        <div className='min-h-screen bg-bg'>
          <Login />
        </div>
      ) : (
        <div className='min-h-screen bg-bg pb-20'>
          <Routes>
            <Route path='/' element={<Today />} />
            <Route path='/progress' element={<Progress />} />
            <Route path='/ranking' element={<Ranking />} />
            <Route path='/exam/:levelId' element={<Exam />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='*' element={<Navigate to='/' />} />
          </Routes>
          <GoogleTranslateWidget />
          <BottomNav />
        </div>
      )}
    </LanguageProvider>
  )
}

export default App
