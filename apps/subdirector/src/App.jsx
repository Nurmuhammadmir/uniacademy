import React, { lazy, Suspense, useContext, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { SubDirectorContext } from './context/SubDirectorContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Logo from './components/Logo.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
import Login from './pages/Login.jsx'

// every page below is its own lazily-fetched JS chunk instead of part of one giant bundle, same
// as admin/director. Login stays a regular (non-lazy) import since it's the very first thing an
// unauthenticated visitor sees and there's no benefit to a network round-trip + spinner just to
// show the login form.
const Students = lazy(() => import('./pages/Students.jsx'))
const StudentProfile = lazy(() => import('./pages/StudentProfile.jsx'))
const Admins = lazy(() => import('./pages/Admins.jsx'))
const Teachers = lazy(() => import('./pages/Teachers.jsx'))
const Pricing = lazy(() => import('./pages/Pricing.jsx'))
const Attendance = lazy(() => import('./pages/Attendance.jsx'))
const Courses = lazy(() => import('./pages/Courses.jsx'))
const Groups = lazy(() => import('./pages/Groups.jsx'))
const Timetable = lazy(() => import('./pages/Timetable.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Finance = lazy(() => import('./pages/Finance.jsx'))
const TransactionDetail = lazy(() => import('./pages/TransactionDetail.jsx'))

// centered, minimal - shown only for the brief moment a route's own chunk is still downloading
const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <Spinner size={28} className='text-accent' />
  </div>
)

// no Overview, no Branches map, no Homework builder - a sub_director never gets those, so this
// app simply doesn't have the pages, not just hidden nav links. Students is home ('/') since
// there's no Overview to land on.
const App = () => {
  const { token } = useContext(SubDirectorContext)
  const [navOpen, setNavOpen] = useState(false)

  return (
    <LanguageProvider>
      <ToastContainer position='top-right' autoClose={2500} />
      <ConfirmHost />
      {!token ? (
        <div className='min-h-screen bg-bg'>
          <Login />
        </div>
      ) : (
        <div className='min-h-screen bg-bg flex'>
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
          <div className='flex-1 flex flex-col min-w-0 lg:ml-60'>
            <header className='lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-bg-elevated border-b border-hairline px-4 py-3'>
              <button onClick={() => setNavOpen(true)} aria-label='Menu' className='plain text-ink text-2xl leading-none px-1'>☰</button>
              <Logo size={28} />
            </header>
            <main className='flex-1 p-4 sm:p-8'>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path='/' element={<Students />} />
                  <Route path='/students' element={<Students />} />
                  <Route path='/students/:id' element={<StudentProfile />} />
                  <Route path='/admins' element={<Admins />} />
                  <Route path='/teachers' element={<Teachers />} />
                  <Route path='/pricing' element={<Pricing />} />
                  <Route path='/attendance' element={<Attendance />} />
                  <Route path='/courses' element={<Courses />} />
                  <Route path='/groups' element={<Groups />} />
                  <Route path='/timetable' element={<Timetable />} />
                  <Route path='/finance' element={<Finance />} />
                  <Route path='/finance/payments/:id' element={<TransactionDetail />} />
                  <Route path='/settings' element={<Settings />} />
                  <Route path='*' element={<Navigate to='/' />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      )}
    </LanguageProvider>
  )
}

export default App
