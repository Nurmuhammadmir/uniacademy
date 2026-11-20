import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Users, FolderOpen, CreditCard, Layers, GraduationCap, Calendar, StickyNote, User, Sun, Moon, BookOpen, CloudSnow, Gift } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useNewYear } from '../context/NewYearContext.jsx'
import { GarlandStrip, GarlandPlug } from './SidebarGarland.jsx'
import SantaLetterModal from './SantaLetterModal.jsx'
import Logo from './Logo.jsx'

// below `lg`, this becomes a slide-in drawer (off-canvas by default, toggled by App.jsx's mobile
// top bar) with a tap-to-close backdrop; at `lg` and up it's always the fixed 240px column it always
// was. `open`/`onClose` are only meaningful below `lg` - the lg:translate-x-0/lg:hidden pairs make
// sure neither the transform nor the backdrop ever affects the desktop layout.
const Sidebar = ({ open, onClose }) => {
  const { t } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const { enabled: newYearEnabled, toggle: toggleNewYear } = useNewYear()
  const [showSantaLetter, setShowSantaLetter] = useState(false)

  const links = [
    { to: '/', label: t('navStudents'), icon: Users },
    { to: '/groups', label: t('navGroups'), icon: FolderOpen },
    { to: '/finance', label: t('navFinance'), icon: CreditCard },
    { to: '/leads', label: t('navLeads'), icon: Layers },
    { to: '/teachers', label: t('navTeachers'), icon: GraduationCap },
    { to: '/timetable', label: t('navTimetable'), icon: Calendar },
    { to: '/courses-pricing', label: t('navCoursesPricing'), icon: BookOpen },
    { to: '/notes', label: t('navNotes'), icon: StickyNote },
    { to: '/profile', label: t('navProfile'), icon: User },
  ]

  return (
    <>
      {open && <div onClick={onClose} className='fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 lg:hidden' />}

      <aside className={`w-60 fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#161F30] border-r border-slate-100 dark:border-slate-800/80 p-6 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className='mb-8'><Logo size={60} festive={newYearEnabled} /></div>
        {/* the garland image lives here, not per-button - one continuous strip spanning the real
            (dynamic) height of the 9-item list, instead of hand-measured pixel positions */}
        <nav className='relative flex flex-col gap-1.5 flex-1 overflow-y-auto'>
          <GarlandStrip lit={newYearEnabled} />
          {links.map(link => {
            const Icon = link.icon
            return (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors ${isActive
                  ? 'bg-indigo-50 text-indigo-600 font-semibold tracking-tight dark:bg-[#4F46E5] dark:text-white dark:shadow-md dark:shadow-indigo-500/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#1E293B]'}`}>
                <Icon size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
                {link.label}
              </NavLink>
            )
          })}
        </nav>
        {/* mt-auto lives here (not further down) so this row anchors the bottom-settled group -
            Santa letter, then New Year toggle, then theme - instead of floating in the middle of
            the nav list. The old sign-out button is gone (Profile already has one); this slot was
            repurposed for the Santa letter button instead. */}
        <button onClick={() => setShowSantaLetter(true)}
          className='plain mt-auto flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#1E293B] transition-colors'>
          <Gift size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
          {t('santaLetterNavBtn')}
        </button>
        <button onClick={toggleNewYear}
          className={`plain flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] font-medium transition-colors ${newYearEnabled
            ? 'text-accent bg-indigo-50 dark:bg-[#4F46E5]/20 dark:text-[#818CF8]'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#1E293B]'}`}>
          <CloudSnow size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
          {t('newYearModeBtn')}
        </button>
        <button onClick={toggleTheme}
          className='plain flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#1E293B] transition-colors'>
          {isDark
            ? <Sun size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
            : <Moon size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />}
          {isDark ? t('lightModeBtn') : t('darkModeBtn')}
        </button>
        <div className='absolute bottom-3 left-2.5'><GarlandPlug pluggedIn={newYearEnabled} /></div>
      </aside>
      {showSantaLetter && <SantaLetterModal onClose={() => setShowSantaLetter(false)} />}
    </>
  )
}

export default Sidebar
