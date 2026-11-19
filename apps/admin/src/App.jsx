import React, { lazy, Suspense, useContext, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { AdminContext } from './context/AdminContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { NewYearProvider, useNewYear } from './context/NewYearContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Logo from './components/Logo.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import NewYearSnow from './components/NewYearSnow.jsx'
import NewYearMusic from './components/NewYearMusic.jsx'
import Login from './pages/Login.jsx'

// every page below is its own lazily-fetched JS chunk instead of part of one giant bundle - a
// director opening the app to check attendance shouldn't have to download the Leads kanban board,
// the finance charts, and the exam builder's code before their first paint. Login stays a regular
// (non-lazy) import since it's the very first thing an unauthenticated visitor sees and there's no
// benefit to a network round-trip + spinner just to show the login form.
const Students = lazy(() => import('./pages/Students.jsx'))
const StudentProfile = lazy(() => import('./pages/StudentProfile.jsx'))
const Groups = lazy(() => import('./pages/Groups.jsx'))
const GroupDetails = lazy(() => import('./pages/GroupDetails.jsx'))
const Finance = lazy(() => import('./pages/Finance.jsx'))
const TransactionDetail = lazy(() => import('./pages/TransactionDetail.jsx'))
const Leads = lazy(() => import('./pages/Leads.jsx'))
const Teachers = lazy(() => import('./pages/Teachers.jsx'))
const TeacherProfile = lazy(() => import('./pages/TeacherProfile.jsx'))
const Timetable = lazy(() => import('./pages/Timetable.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Notes = lazy(() => import('./pages/Notes.jsx'))
const CoursesPricing = lazy(() => import('./pages/CoursesPricing.jsx'))
const PublicLeadForm = lazy(() => import('./pages/PublicLeadForm.jsx'))

// centered, minimal - shown only for the brief moment a route's own chunk is still downloading
const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <Spinner size={28} className='text-accent' />
  </div>
)

// the public lead-intake form (/forms/:slug) is reachable with no admin session at all - it lives
// outside the token gate below, which everything else in this app sits behind
// fixed-corner placement only makes sense pre-login, where there's no sidebar to put it in - once
// authenticated, the toggle lives at the bottom of Sidebar.jsx (above "Chiqish") instead. A fixed
// top-right button on the dashboard collided with whatever page-level "+ Add" button a given page
// happened to have up there (e.g. Students' "+ Talaba qo'shish"), which the sidebar location can't.
const LoginThemeToggle = () => (
  <ThemeToggle className='fixed top-4 right-6 z-50 p-2 bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm cursor-pointer hover:scale-105 transition-all' />
)

const AuthenticatedApp = () => {
  const { token, initialLoading } = useContext(AdminContext)
  const [navOpen, setNavOpen] = useState(false)

  if (!token) {
    return (
      <div className='min-h-screen bg-bg'>
        <LoginThemeToggle />
        <Login />
      </div>
    )
  }

  // the post-login data burst (11 parallel fetches - students, groups, payments, etc) can take a
  // moment on a slow connection or a busy server - showing the shell with empty tables during that
  // window read as broken, so a plain full-page spinner covers it instead
  if (initialLoading) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center'>
        <Spinner size={32} className='text-accent' />
      </div>
    )
  }

  return (
    <NewYearProvider>
      <NewYearSnowLayer />
      <div className='min-h-screen bg-bg flex'>
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <ContentArea navOpen={navOpen} setNavOpen={setNavOpen} />
      </div>
    </NewYearProvider>
  )
}

// split out only so it (and NewYearSnowLayer below) can call useNewYear() - needs to be inside
// NewYearProvider, which wraps this same component's own parent return, so it can't read the
// context at that outer level. The 60px top margin/padding here is what keeps TopBanner.jsx's
// fixed, full-width (deliberately above the sidebar in z-index) banner from covering the mobile
// header's own logo or the top of whatever page is showing - see NewYearSnow.jsx's own comment.
const ContentArea = ({ navOpen, setNavOpen }) => {
  const { enabled: newYearEnabled } = useNewYear()
  return (
    <div className='flex-1 flex flex-col min-w-0 lg:ml-60'>
      <header className='lg:hidden sticky z-30 flex items-center gap-3 bg-bg-elevated border-b border-hairline pt-4 pb-2 px-4'
        style={{ top: newYearEnabled ? 60 : 0, transition: 'top 0.3s ease' }}>
        <button onClick={() => setNavOpen(true)} aria-label='Menu' className='plain text-ink text-2xl leading-none px-1'>☰</button>
        <Logo size={28} />
      </header>
      <main className='flex-1 p-4 sm:p-8' style={{ marginTop: newYearEnabled ? 60 : 0, transition: 'margin-top 0.3s ease' }}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path='/' element={<Students />} />
            <Route path='/students/:id' element={<StudentProfile />} />
            <Route path='/groups' element={<Groups />} />
            <Route path='/groups/:id' element={<GroupDetails />} />
            <Route path='/finance' element={<Navigate to='/finance/payments' replace />} />
            <Route path='/finance/payments/:id' element={<TransactionDetail type='payment' />} />
            <Route path='/finance/expenses/:id' element={<TransactionDetail type='expense' />} />
            <Route path='/finance/:tab' element={<Finance />} />
            <Route path='/leads' element={<Leads />} />
            <Route path='/teachers' element={<Teachers />} />
            <Route path='/teachers/:id' element={<TeacherProfile />} />
            <Route path='/timetable' element={<Timetable />} />
            <Route path='/courses-pricing' element={<CoursesPricing />} />
            <Route path='/profile' element={<Profile />} />
            <Route path='/notes' element={<Notes />} />
            <Route path='*' element={<Navigate to='/' />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

const NewYearSnowLayer = () => {
  const { enabled } = useNewYear()
  return (
    <>
      {enabled && <NewYearSnow />}
      <NewYearMusic enabled={enabled} />
    </>
  )
}

const App = () => {
  return (
    <LanguageProvider>
      <Toaster
        position='top-center'
        duration={2500}
        closeButton
        icons={{
          success: <CheckCircle2 size={20} strokeWidth={1.5} className='text-emerald-500 flex-shrink-0 mt-0.5' />,
          error: <AlertCircle size={20} strokeWidth={1.5} className='text-rose-500 flex-shrink-0 mt-0.5' />,
        }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: 'bg-white/90 dark:bg-[#161F30]/90 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 shadow-xl shadow-slate-200/40 dark:shadow-black/40 rounded-2xl p-4 max-w-sm w-full flex items-start gap-3',
            title: 'text-sm font-medium text-[#1D1D1F] dark:text-[#F8FAFC] leading-snug',
            closeButton: '!bg-white dark:!bg-[#161F30] !border-slate-200/60 dark:!border-slate-800/80 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors',
          },
        }}
      />
      <ConfirmHost />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path='/forms/:slug' element={<PublicLeadForm />} />
          <Route path='/*' element={<AuthenticatedApp />} />
        </Routes>
      </Suspense>
    </LanguageProvider>
  )
}

export default App
