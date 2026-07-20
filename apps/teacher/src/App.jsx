import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { TeacherContext } from './context/TeacherContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Login from './pages/Login.jsx'
import MyGroups from './pages/MyGroups.jsx'
import GroupRoster from './pages/GroupRoster.jsx'
import StudentDetail from './pages/StudentDetail.jsx'
import Attendance from './pages/Attendance.jsx'
import MyAttendance from './pages/MyAttendance.jsx'
import Timetable from './pages/Timetable.jsx'
import Profile from './pages/Profile.jsx'

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
        </div>
      )}
    </LanguageProvider>
  )
}

export default App
