import React, { lazy, Suspense, useContext, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { DirectorContext } from './context/DirectorContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Logo from './components/Logo.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
import Login from './pages/Login.jsx'

// every page below is its own lazily-fetched JS chunk instead of part of one giant bundle - a
// director opening the app to check attendance shouldn't have to download the branches map,
// the finance charts, and the homework builder's code before their first paint. Login stays a
// regular (non-lazy) import since it's the very first thing an unauthenticated visitor sees and
// there's no benefit to a network round-trip + spinner just to show the login form.
const Overview = lazy(() => import('./pages/Overview.jsx'))
const Branches = lazy(() => import('./pages/Branches.jsx'))
const Students = lazy(() => import('./pages/Students.jsx'))
const StudentProfile = lazy(() => import('./pages/StudentProfile.jsx'))
const Admins = lazy(() => import('./pages/Admins.jsx'))
const Teachers = lazy(() => import('./pages/Teachers.jsx'))
const Pricing = lazy(() => import('./pages/Pricing.jsx'))
const Attendance = lazy(() => import('./pages/Attendance.jsx'))
const Courses = lazy(() => import('./pages/Courses.jsx'))
const Homework = lazy(() => import('./pages/Homework.jsx'))
const Groups = lazy(() => import('./pages/Groups.jsx'))
const Timetable = lazy(() => import('./pages/Timetable.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Finance = lazy(() => import('./pages/Finance.jsx'))
const TransactionDetail = lazy(() => import('./pages/TransactionDetail.jsx'))
const Leads = lazy(() => import('./pages/Leads.jsx'))

// centered, minimal - shown only for the brief moment a route's own chunk is still downloading
const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <Spinner size={28} className='text-accent' />
  </div>
)

const App = () => {
  const { token } = useContext(DirectorContext)
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
                  <Route path='/' element={<Overview />} />
                  <Route path='/branches' element={<Branches />} />
                  <Route path='/students' element={<Students />} />
                  <Route path='/students/:id' element={<StudentProfile />} />
                  <Route path='/admins' element={<Admins />} />
                  <Route path='/teachers' element={<Teachers />} />
                  <Route path='/pricing' element={<Pricing />} />
                  <Route path='/attendance' element={<Attendance />} />
                  <Route path='/courses' element={<Courses />} />
                  <Route path='/homework' element={<Homework />} />
                  <Route path='/groups' element={<Groups />} />
                  <Route path='/timetable' element={<Timetable />} />
                  <Route path='/finance' element={<Finance />} />
                  <Route path='/finance/payments/:id' element={<TransactionDetail />} />
                  <Route path='/leads' element={<Leads />} />
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
