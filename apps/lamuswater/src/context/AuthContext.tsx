import { createContext, useContext, useState, type ReactNode } from 'react'
import axios from 'axios'
import { useLanguage } from './LanguageContext'

export type Role = 'admin' | 'manager'

export interface AuthUser {
  _id: string
  name: string
  email: string
  role: Role
  avatar?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string, role: Role) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  backendUrl: string
}

const AuthContext = createContext<AuthContextType | null>(null)

// If VITE_BACKEND_URL points at localhost but the app itself isn't being
// viewed from localhost (e.g. opened on a phone via the PC's LAN IP,
// http://192.168.x.x:8443), "localhost" on that device means the device
// itself — the backend request would silently target nothing and fail
// with a generic network error. Swap in whatever host the page was loaded
// from instead, since the backend runs alongside the frontend in dev.
const resolveBackendUrl = () => {
  const configured = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
  const pageHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const isLocalConfigured = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured)
  const pageIsLocal = pageHost === 'localhost' || pageHost === '127.0.0.1'
  if (isLocalConfigured && !pageIsLocal) {
    return configured.replace(/localhost|127\.0\.0\.1/, pageHost)
  }
  return configured
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const backendUrl = resolveBackendUrl()
  const { tError } = useLanguage()
  // Read synchronously (not in a useEffect) so `user` is correct on the very
  // first render — otherwise a hard reload on a nested route (e.g. an F5 on
  // /dashboard/clients/add) briefly sees user=null, gets redirected to
  // /login by <Protected>, then redirected again to the /dashboard root
  // once the effect catches up, losing the page the user was actually on.
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('lamussa_user')
    if (!stored) return null
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  })
  // Set the axios default header synchronously during the first render (not
  // in a useEffect): React commits child effects before parent effects, so
  // ManagerContext/AdminContext's own data-loading effects — which run as
  // soon as `token` is truthy — could otherwise fire their first request
  // before this provider's effect had set the header, hitting "Not
  // authorized" on every hard reload.
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('lamussa_token')
    if (stored) axios.defaults.headers.common['token'] = stored
    return stored
  })

  const login = async (email: string, password: string, role: Role) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/lamus/${role}/login`, { email, password })
      if (!data.success) return { success: false, message: data.message }
      setUser(data.user)
      setToken(data.token)
      axios.defaults.headers.common['token'] = data.token
      localStorage.setItem('lamussa_token', data.token)
      localStorage.setItem('lamussa_user', JSON.stringify(data.user))
      return { success: true }
    } catch (error: any) {
      return { success: false, message: tError(error, backendUrl) }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    delete axios.defaults.headers.common['token']
    localStorage.removeItem('lamussa_token')
    localStorage.removeItem('lamussa_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, backendUrl }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
