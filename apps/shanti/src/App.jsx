import React, { lazy, Suspense, useContext, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { CheckCircle2, AlertCircle, Menu as MenuIcon } from 'lucide-react'
import { ShantiContext } from './context/ShantiContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Spinner from './components/Spinner.jsx'
import Login from './pages/Login.jsx'

const Purchases = lazy(() => import('./pages/Purchases.jsx'))
const Sales = lazy(() => import('./pages/Sales.jsx'))

const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <Spinner size={28} className='text-accent' />
  </div>
)

const AuthenticatedApp = () => {
  const { token, initialLoading } = useContext(ShantiContext)
  const [navOpen, setNavOpen] = useState(false)

  if (!token) {
    return <div className='min-h-screen bg-bg'><Login /></div>
  }

  if (initialLoading) {
    return (
      <div className='min-h-screen bg-bg flex items-center justify-center'>
        <Spinner size={32} className='text-accent' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-bg flex'>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className='flex-1 flex flex-col min-w-0 lg:ml-60'>
        <header className='lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-bg-elevated border-b border-hairline pt-4 pb-2 px-4'>
          <button onClick={() => setNavOpen(true)} aria-label='Меню' className='plain text-ink text-2xl leading-none px-1'><MenuIcon size={24} /></button>
          <p className='font-display text-lg font-bold text-ink'>LasummaShanti</p>
        </header>
        <main className='flex-1 p-4 sm:p-8'>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path='/' element={<Navigate to='/purchases/list' replace />} />
              <Route path='/purchases/:tab' element={<Purchases />} />
              <Route path='/sales/:tab' element={<Sales />} />
              <Route path='*' element={<Navigate to='/purchases/list' replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

const App = () => {
  return (
    <>
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
            toast: 'bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-xl shadow-slate-200/40 rounded-2xl p-4 max-w-sm w-full flex items-start gap-3',
            title: 'text-sm font-medium text-[#1D1D1F] leading-snug',
            closeButton: '!bg-white !border-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors',
          },
        }}
      />
      <ConfirmHost />
      <AuthenticatedApp />
    </>
  )
}

export default App
