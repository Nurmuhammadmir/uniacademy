import { useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useConfirm } from '../context/ConfirmContext'
import LanguageSwitcher from './LanguageSwitcher'
import InstallAppButton from './InstallAppButton'
import PullToRefresh from './PullToRefresh'
import {
  Droplets, LayoutDashboard, Users, MapPin, ClipboardList,
  Package, LogOut, Menu, ChevronRight, Activity, UserCog, Wallet, Navigation, Settings
} from 'lucide-react'

const AppLayout = () => {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const confirm = useConfirm()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const managerNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { to: '/dashboard/clients', icon: Users, label: t('nav.clients') },
    { to: '/dashboard/orders', icon: ClipboardList, label: t('nav.orders') },
    { to: '/dashboard/map', icon: MapPin, label: t('nav.map') },
    { to: '/dashboard/stock', icon: Package, label: t('nav.stock') },
  ]

  const adminNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { to: '/dashboard/finance', icon: Wallet, label: t('nav.finance') },
    { to: '/dashboard/managers', icon: Users, label: t('nav.managers') },
    { to: '/dashboard/clients', icon: UserCog, label: t('nav.clients') },
    { to: '/dashboard/map', icon: MapPin, label: t('nav.map') },
    { to: '/dashboard/settings', icon: Settings, label: t('nav.settings') },
    { to: '/dashboard/operations', icon: Activity, label: t('nav.operations') },
  ]

  const navItems = user?.role === 'admin' ? adminNav : managerNav

  const handleLogout = async () => {
    const ok = await confirm({ message: t('confirm.signOutMessage'), confirmLabel: t('nav.signOut'), danger: true })
    if (!ok) return
    logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Droplets className="text-[#0066CC]" size={22} strokeWidth={1.5} />
          <span className="font-display text-[#0066CC] text-xl italic tracking-wide">Lamus</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full
            ${user?.role === 'admin' ? 'bg-[#0066CC] text-white' : 'bg-gray-100 text-gray-500'}`}>
            {user?.role === 'admin' ? t('login.admin') : t('login.manager')}
          </span>
        </div>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-[#0066CC] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.75} />
                <span>{label}</span>
                {isActive && <ChevronRight size={13} className="ml-auto opacity-50" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-5 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0
            ${user?.role === 'admin' ? 'bg-[#0066CC] text-white' : 'bg-[#0066CC]/10 text-[#0066CC]'}`}>
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
            <div className="text-[11px] text-gray-400 truncate">{user?.email}</div>
          </div>
        </div>
        {user?.role === 'manager' && (
          <div className="flex items-center gap-2 px-3 py-2 mb-1 text-[11px] text-gray-400">
            <Navigation size={12} className="flex-shrink-0" />
            <span>{t('location.sharedNote')}</span>
          </div>
        )}
        <InstallAppButton />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
        >
          <LogOut size={15} />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 bg-white border-r border-gray-100 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/20 modal-backdrop" />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-white shadow-xl z-50 sidebar-drawer-in" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-gray-500">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Droplets className="text-[#0066CC]" size={18} strokeWidth={1.5} />
            <span className="font-display text-[#0066CC] text-lg italic">Lamus</span>
          </div>
          <div className="w-8" />
        </div>

        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <PullToRefresh containerRef={mainRef} />
          <div key={location.pathname} className="page-transition h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
