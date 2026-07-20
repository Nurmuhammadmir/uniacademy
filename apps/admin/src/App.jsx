import React, { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AdminContext } from './context/AdminContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Login from './pages/Login.jsx'
import Students from './pages/Students.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import Groups from './pages/Groups.jsx'
import GroupDetails from './pages/GroupDetails.jsx'
import Finance from './pages/Finance.jsx'
import TransactionDetail from './pages/TransactionDetail.jsx'
import Leads from './pages/Leads.jsx'
import Teachers from './pages/Teachers.jsx'
import TeacherProfile from './pages/TeacherProfile.jsx'
import Timetable from './pages/Timetable.jsx'
import Profile from './pages/Profile.jsx'
import Notes from './pages/Notes.jsx'
import PublicLeadForm from './pages/PublicLeadForm.jsx'

// the public lead-intake form (/forms/:slug) is reachable with no admin session at all - it lives
// outside the token gate below, which everything else in this app sits behind
const AuthenticatedApp = () => {
  const { token } = useContext(AdminContext)

  if (!token) {
    return (
      <div className='min-h-screen bg-bg'>
        <Login />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-bg flex'>
      <Sidebar />
      <main className='flex-1 p-8 ml-60'>
        <Routes>
          <Route path='/' element={<Students />} />
          <Route path='/students/:id' element={<StudentProfile />} />
          <Route path='/groups' element={<Groups />} />
          <Route path='/groups/:id' element={<GroupDetails />} />
          <Route path='/finance' element={<Finance />} />
          <Route path='/finance/payments/:id' element={<TransactionDetail type='payment' />} />
          <Route path='/finance/expenses/:id' element={<TransactionDetail type='expense' />} />
          <Route path='/leads' element={<Leads />} />
          <Route path='/teachers' element={<Teachers />} />
          <Route path='/teachers/:id' element={<TeacherProfile />} />
          <Route path='/timetable' element={<Timetable />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/notes' element={<Notes />} />
          <Route path='*' element={<Navigate to='/' />} />
        </Routes>
      </main>
    </div>
  )
}

const App = () => {
  return (
    <LanguageProvider>
      <ToastContainer position='top-right' autoClose={2500} />
      <ConfirmHost />
      <Routes>
        <Route path='/forms/:slug' element={<PublicLeadForm />} />
        <Route path='/*' element={<AuthenticatedApp />} />
      </Routes>
    </LanguageProvider>
  )
}

export default App
