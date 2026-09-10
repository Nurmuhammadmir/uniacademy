import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, TrendingUp, Wallet2, Settings as SettingsIcon } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const Sidebar = ({ open, onClose }) => {
  const { t, lang, setLang } = useLanguage()

  const links = [
    { to: '/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { to: '/purchases/list', label: t('navPurchases'), icon: ShoppingCart },
    { to: '/sales/list', label: t('navSales'), icon: TrendingUp },
    { to: '/finance/list', label: t('navFinance'), icon: Wallet2 },
  ]

  return (
    <>
      {open && <div onClick={onClose} className='fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-md transition-all duration-300 lg:hidden' />}

      <aside className={`w-60 fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 p-6 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavLink to='/dashboard' onClick={onClose} className='plain mb-8 block'>
          <p className='font-logo text-4xl text-[#DC2626] tracking-tight leading-none'>Lamussa</p>
        </NavLink>
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
        <div className='pt-2 mt-2 border-t border-slate-100'>
          <NavLink to='/settings' onClick={onClose}
            className={({ isActive }) => `flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors ${isActive
              ? 'bg-accent-soft text-accent font-semibold tracking-tight'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'}`}>
            <SettingsIcon size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
            {t('navSettings')}
          </NavLink>
        </div>
        <div className='flex bg-slate-100 rounded-xl p-1 mt-3'>
          {['uz', 'ru'].map(code => (
            <button key={code} onClick={() => setLang(code)}
              className={`plain flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase transition-colors ${lang === code ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}>
              {code}
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
