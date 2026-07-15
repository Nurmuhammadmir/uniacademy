import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AdminContext } from './context/AdminContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Login from './pages/Login.jsx'
import Students from './pages/Students.jsx'
import Groups from './pages/Groups.jsx'
import Payments from './pages/Payments.jsx'
import Teachers from './pages/Teachers.jsx'
import Profile from './pages/Profile.jsx'

const App = () => {
  const { token } = useContext(AdminContext)

  return (
    <>
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
              <Route path='/groups' element={<Groups />} />
              <Route path='/payments' element={<Payments />} />
              <Route path='/teachers' element={<Teachers />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='*' element={<Navigate to='/' />} />
            </Routes>
          </main>
        </div>
      )}
    </>
  )
}

export default App
