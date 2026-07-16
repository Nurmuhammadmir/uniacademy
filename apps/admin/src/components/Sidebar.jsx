import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Logo from './Logo.jsx'

const Sidebar = () => {
  const { logout } = useContext(AdminContext)
  const { t } = useLanguage()

  const links = [
    { to: '/', label: t('navStudents') },
    { to: '/groups', label: t('navGroups') },
    { to: '/payments', label: t('navPayments') },
    { to: '/teachers', label: t('navTeachers') },
    { to: '/profile', label: t('navProfile') },
  ]

  return (
    <aside className='w-60 fixed inset-y-0 left-0 bg-bg-elevated border-r border-hairline p-6 flex flex-col'>
      <div className='mb-8'><Logo size={30} /></div>
      <nav className='flex flex-col gap-1 flex-1'>
        {links.map(link => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'}
            className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-accent-soft text-accent' : 'text-muted'}`}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <button onClick={logout} className='text-sm text-muted text-left px-3 py-2'>{t('signOut')}</button>
    </aside>
  )
}

export default Sidebar
