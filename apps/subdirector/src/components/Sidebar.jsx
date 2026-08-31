import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { SubDirectorContext } from '../context/SubDirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import Logo from './Logo.jsx'

// below `lg`, this becomes a slide-in drawer (off-canvas by default, toggled by App.jsx's mobile
// top bar) with a tap-to-close backdrop; at `lg` and up it's always the fixed 240px column it always
// was. `open`/`onClose` are only meaningful below `lg` - the lg:translate-x-0/lg:hidden pairs make
// sure neither the transform nor the backdrop ever affects the desktop layout.
const Sidebar = ({ open, onClose }) => {
  const { logout, branches } = useContext(SubDirectorContext)
  const { t } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
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
    <>
      {open && <div onClick={onClose} className='fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 lg:hidden' />}

      <aside className={`w-60 fixed inset-y-0 left-0 z-50 bg-bg-elevated border-r border-hairline p-6 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className='mb-1'><Logo size={60} /></div>
        <p className='text-xs mb-8 ml-10' style={{ color: '#C9A15C' }}>
          {t('subDirectorLabel')}{branchName ? ` · ${branchName}` : ''}
        </p>
        <nav className='flex flex-col gap-1 flex-1 overflow-y-auto'>
          {links.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/students'} onClick={onClose}
              className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-accent-soft text-accent dark:bg-[#1E1B4B] dark:text-[#818CF8]' : 'text-muted'}`}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        {/* mt-auto lives here (not on the logout button below) so this row sits directly above
            the sign-out button as one settled-in group at the bottom - same placement convention
            as the admin app's ThemeContext rollout */}
        <button onClick={toggleTheme} className='plain mt-auto flex items-center gap-2 text-sm text-muted text-left px-3 py-2'>
          {isDark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
          {isDark ? t('lightModeBtn') : t('darkModeBtn')}
        </button>
        <button onClick={logout} className='plain text-sm text-muted text-left px-3 py-2'>{t('signOut')}</button>
      </aside>
    </>
  )
}

export default Sidebar
