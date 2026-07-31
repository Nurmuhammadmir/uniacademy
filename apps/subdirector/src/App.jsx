import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { SubDirectorContext } from './context/SubDirectorContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Login from './pages/Login.jsx'
import Students from './pages/Students.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import Admins from './pages/Admins.jsx'
import Teachers from './pages/Teachers.jsx'
import Pricing from './pages/Pricing.jsx'
import Attendance from './pages/Attendance.jsx'
import Courses from './pages/Courses.jsx'
import Groups from './pages/Groups.jsx'
import Timetable from './pages/Timetable.jsx'
import Settings from './pages/Settings.jsx'
import Finance from './pages/Finance.jsx'
import TransactionDetail from './pages/TransactionDetail.jsx'

// no Overview, no Branches map, no Homework builder - a sub_director never gets those, so this
// app simply doesn't have the pages, not just hidden nav links. Students is home ('/') since
// there's no Overview to land on.
const App = () => {
  const { token } = useContext(SubDirectorContext)

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
          <Sidebar />
          <main className='flex-1 p-8 ml-60'>
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
          </main>
        </div>
      )}
    </LanguageProvider>
  )
}

export default App
