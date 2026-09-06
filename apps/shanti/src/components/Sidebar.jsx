import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { ShoppingCart, TrendingUp, LogOut } from 'lucide-react'
import { ShantiContext } from '../context/ShantiContext.jsx'

const links = [
  { to: '/purchases/list', label: 'Покупки', icon: ShoppingCart },
  { to: '/sales/list', label: 'Продажи', icon: TrendingUp },
]

const Sidebar = ({ open, onClose }) => {
  const { logout } = useContext(ShantiContext)

  return (
    <>
      {open && <div onClick={onClose} className='fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-md transition-all duration-300 lg:hidden' />}

      <aside className={`w-60 fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 p-6 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className='mb-8'>
          <p className='font-display text-xl font-bold text-ink'>LasummaShanti</p>
        </div>
        <nav className='flex flex-col gap-1.5 flex-1 overflow-y-auto'>
          {links.map(link => {
            const Icon = link.icon
            return (
              <NavLink key={link.to} to={link.to} onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors ${isActive
                  ? 'bg-accent-soft text-accent font-semibold tracking-tight'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'}`}>
                <Icon size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
                {link.label}
              </NavLink>
            )
          })}
        </nav>
        <button onClick={logout}
          className='plain flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors'>
          <LogOut size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
          Выйти
        </button>
      </aside>
    </>
  )
}

export default Sidebar
