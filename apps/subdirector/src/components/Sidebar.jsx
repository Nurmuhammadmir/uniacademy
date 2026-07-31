import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { SubDirectorContext } from '../context/SubDirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Logo from './Logo.jsx'

const Sidebar = () => {
  const { logout, branches } = useContext(SubDirectorContext)
  const { t } = useLanguage()
  const branchName = branches[0]?.name

  const links = [
    { to: '/students', label: t('navStudents') },
    { to: '/admins', label: t('navAdmins') },
    { to: '/teachers', label: t('navTeachers') },
    { to: '/groups', label: t('navGroups') },
    { to: '/courses', label: t('navCourses') },
    { to: '/attendance', label: t('navAttendance') },
    { to: '/timetable', label: t('navTimetable') },
    { to: '/finance', label: t('navFinance') },
    { to: '/pricing', label: t('navPricing') },
    { to: '/settings', label: t('navSettings') },
  ]

  return (
    <aside className='w-60 fixed inset-y-0 left-0 bg-bg-elevated border-r border-hairline p-6 flex flex-col'>
      <div className='mb-1'><Logo size={60} /></div>
      <p className='text-xs mb-8 ml-10' style={{ color: '#C9A15C' }}>
        {t('subDirectorLabel')}{branchName ? ` · ${branchName}` : ''}
      </p>
      <nav className='flex flex-col gap-1 flex-1'>
        {links.map(link => (
          <NavLink key={link.to} to={link.to} end={link.to === '/students'}
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
