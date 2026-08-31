import React, { lazy, Suspense, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { TeacherContext } from './context/TeacherContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
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
        <div className='min-h-screen bg-bg'>
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
      )}
    </LanguageProvider>
  )
}

export default App
