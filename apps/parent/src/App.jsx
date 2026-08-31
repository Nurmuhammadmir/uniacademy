import React, { lazy, Suspense, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ParentContext } from './context/ParentContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import BottomNav from './components/BottomNav.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
import Login from './pages/Login.jsx'

// every page below is its own lazily-fetched JS chunk instead of part of one giant bundle. Login
// stays a regular (non-lazy) import since it's the very first thing an unauthenticated visitor
// sees and there's no benefit to a network round-trip + spinner just to show the login form.
const Home = lazy(() => import('./pages/Home.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))

// centered, minimal - shown only for the brief moment a route's own chunk is still downloading
const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <Spinner size={28} className='text-accent' />
  </div>
)

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
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='*' element={<Navigate to='/' />} />
            </Routes>
          </Suspense>
          <BottomNav />
        </div>
      )}
    </LanguageProvider>
  )
}

export default App
