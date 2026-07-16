import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { DirectorContext } from './context/DirectorContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Login from './pages/Login.jsx'
import Overview from './pages/Overview.jsx'
import Branches from './pages/Branches.jsx'
import Students from './pages/Students.jsx'
import Admins from './pages/Admins.jsx'
import Teachers from './pages/Teachers.jsx'
import Pricing from './pages/Pricing.jsx'
import Attendance from './pages/Attendance.jsx'
import Courses from './pages/Courses.jsx'
import Homework from './pages/Homework.jsx'
import Groups from './pages/Groups.jsx'
import Settings from './pages/Settings.jsx'

const App = () => {
  const { token } = useContext(DirectorContext)

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
              <Route path='/' element={<Overview />} />
              <Route path='/branches' element={<Branches />} />
              <Route path='/students' element={<Students />} />
              <Route path='/admins' element={<Admins />} />
              <Route path='/teachers' element={<Teachers />} />
              <Route path='/pricing' element={<Pricing />} />
              <Route path='/attendance' element={<Attendance />} />
              <Route path='/courses' element={<Courses />} />
              <Route path='/homework' element={<Homework />} />
              <Route path='/groups' element={<Groups />} />
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
