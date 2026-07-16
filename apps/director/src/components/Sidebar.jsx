import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Logo from './Logo.jsx'

const Sidebar = () => {
  const { logout } = useContext(DirectorContext)
  const { t } = useLanguage()

  const links = [
    { to: '/', label: t('navOverview') },
    { to: '/branches', label: t('navBranches') },
    { to: '/students', label: t('navStudents') },
    { to: '/admins', label: t('navAdmins') },
    { to: '/teachers', label: t('navTeachers') },
    { to: '/groups', label: t('navGroups') },
    { to: '/courses', label: t('navCourses') },
    { to: '/homework', label: t('navHomework') },
    { to: '/attendance', label: t('navAttendance') },
    { to: '/pricing', label: t('navPricing') },
    { to: '/settings', label: t('navSettings') },
  ]

  return (
    <aside className='w-60 fixed inset-y-0 left-0 bg-bg-elevated border-r border-hairline p-6 flex flex-col'>
      <div className='mb-1'><Logo size={30} /></div>
      <p className='text-xs mb-8 ml-10' style={{ color: '#C9A15C' }}>{t('directorLabel')}</p>
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
