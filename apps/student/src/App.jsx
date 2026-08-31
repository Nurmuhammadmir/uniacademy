import React, { lazy, Suspense, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { StudentContext } from './context/StudentContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
import Login from './pages/Login.jsx'
import GoogleTranslateWidget from './components/GoogleTranslateWidget.jsx'

// every page below is its own lazily-fetched JS chunk instead of part of one giant bundle - with
// 300-400 concurrent students, the first paint on the busiest app in the whole platform shouldn't
// be held up by downloading the exam engine, ranking, and progress charts before anyone even sees
// today's homework. Login stays a regular (non-lazy) import since it's the very first thing an
// unauthenticated visitor sees and there's no benefit to a network round-trip + spinner just to
// show the login form.
const Today = lazy(() => import('./pages/Today.jsx'))
const Progress = lazy(() => import('./pages/Progress.jsx'))
const Ranking = lazy(() => import('./pages/Ranking.jsx'))
const Exam = lazy(() => import('./pages/Exam.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))

// centered, minimal - shown only for the brief moment a route's own chunk is still downloading
const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <Spinner size={28} className='text-accent' />
  </div>
)

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
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path='/' element={<Today />} />
              <Route path='/progress' element={<Progress />} />
              <Route path='/ranking' element={<Ranking />} />
              <Route path='/exam/:levelId' element={<Exam />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='*' element={<Navigate to='/' />} />
            </Routes>
          </Suspense>
          <GoogleTranslateWidget />
          <BottomNav />
        </div>
      )}
    </LanguageProvider>
  )
}

export default App
