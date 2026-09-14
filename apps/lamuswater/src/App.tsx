import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminProvider } from './context/AdminContext'
import { ManagerProvider } from './context/ManagerContext'
import { LanguageProvider } from './context/LanguageContext'
import { ConfirmProvider } from './context/ConfirmContext'
import AppLayout from './components/AppLayout'
import Login from './pages/Login'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminOperations from './pages/admin/Operations'
import AdminManagers from './pages/admin/Managers'
import AdminClients from './pages/admin/Clients'
import AdminMapPage from './pages/admin/MapPage'
import AdminFinance from './pages/admin/Finance'
import AdminSettings from './pages/admin/Settings'

// Manager pages
import ManagerDashboard from './pages/manager/Dashboard'
import ManagerClients from './pages/manager/Clients'
import AddClient from './pages/manager/AddClient'
import ManagerOrders from './pages/manager/Orders'
import ManagerMapPage from './pages/manager/MapPage'
import ManagerStock from './pages/manager/Stock'

const Protected = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

const RoleRoutes = () => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  if (user.role === 'admin') {
    return (
      <AdminProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="managers" element={<AdminManagers />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="map" element={<AdminMapPage />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="operations" element={<AdminOperations />} />
          </Route>
        </Routes>
      </AdminProvider>
    )
  }

  return (
    <ManagerProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<ManagerDashboard />} />
          <Route path="clients" element={<ManagerClients />} />
          <Route path="clients/add" element={<AddClient />} />
          <Route path="clients/edit/:id" element={<AddClient />} />
          <Route path="orders" element={<ManagerOrders />} />
          <Route path="orders/new" element={<ManagerOrders />} />
          <Route path="map" element={<ManagerMapPage />} />
          <Route path="stock" element={<ManagerStock />} />
        </Route>
      </Routes>
    </ManagerProvider>
  )
}

const AppRoutes = () => {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard/*" element={<Protected><RoleRoutes /></Protected>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ConfirmProvider>
          <AuthProvider>
            <AppRoutes />
            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar
              newestOnTop
              closeButton={false}
              toastStyle={{ borderRadius: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}
            />
          </AuthProvider>
        </ConfirmProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
