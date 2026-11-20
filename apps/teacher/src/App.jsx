import React, { lazy, Suspense, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { TeacherContext } from './context/TeacherContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { NewYearProvider, useNewYear } from './context/NewYearContext.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
import NewYearSnow from './components/NewYearSnow.jsx'
import Login from './pages/Login.jsx'

// every page below is its own lazily-fetched JS chunk instead of part of one giant bundle - a
// teacher opening the app to check their groups shouldn't have to download the attendance grid,
// the roster tables, and the timetable's code before their first paint. Login stays a regular
// (non-lazy) import since it's the very first thing an unauthenticated visitor sees and there's no
// benefit to a network round-trip + spinner just to show the login form.
const MyGroups = lazy(() => import('./pages/MyGroups.jsx'))
const GroupRoster = lazy(() => import('./pages/GroupRoster.jsx'))
const StudentDetail = lazy(() => import('./pages/StudentDetail.jsx'))
const Attendance = lazy(() => import('./pages/Attendance.jsx'))
const MyAttendance = lazy(() => import('./pages/MyAttendance.jsx'))
const Timetable = lazy(() => import('./pages/Timetable.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))

// centered, minimal - shown only for the brief moment a route's own chunk is still downloading
const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <Spinner size={28} className='text-accent' />
  </div>
)

const App = () => {
  const { token } = useContext(TeacherContext)

  return (
    <LanguageProvider>
      <ToastContainer position='top-center' autoClose={2500} />
      <ConfirmHost />
      {!token ? (
        <div className='min-h-screen bg-bg'>
          <Login />
        </div>
      ) : (
        <NewYearProvider>
          <NewYearSnowLayer />
          <ContentArea />
        </NewYearProvider>
      )}
    </LanguageProvider>
  )
}

// split out only so it (and NewYearSnowLayer below) can call useNewYear() - needs to be inside
// NewYearProvider, which wraps this same component's own parent return, so it can't read the
// context at that outer level. The 60px top margin is what keeps TopBanner.jsx's fixed, full-
// width banner from covering the top of whatever page is showing.
const ContentArea = () => {
  const { enabled: newYearEnabled } = useNewYear()
  return (
    <div className='min-h-screen bg-bg' style={{ paddingTop: newYearEnabled ? 120 : 0, transition: 'padding-top 0.3s ease' }}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path='/' element={<MyGroups />} />
          <Route path='/groups/:id' element={<GroupRoster />} />
          <Route path='/groups/:id/students/:studentId' element={<StudentDetail />} />
          <Route path='/groups/:id/attendance' element={<Attendance />} />
          <Route path='/timetable' element={<Timetable />} />
          <Route path='/my-attendance' element={<MyAttendance />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='*' element={<Navigate to='/' />} />
        </Routes>
      </Suspense>
    </div>
  )
}

const NewYearSnowLayer = () => {
  const { enabled } = useNewYear()
  return enabled ? <NewYearSnow /> : null
}

export default App
