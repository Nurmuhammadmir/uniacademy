import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { Users, FolderOpen, CreditCard, Layers, GraduationCap, Calendar, StickyNote, User, LogOut, Sun, Moon, BookOpen, CloudSnow } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useNewYear } from '../context/NewYearContext.jsx'
import { SnowCap, PineBranch, BellBow, ChristmasSock, GarlandStrip } from './FestiveDecor.jsx'
import Logo from './Logo.jsx'

// New Year mode's 9 main nav buttons, each a distinct color+ornament combo (confirmed spec: no two
// alike) - cycles 5 base colors and varies which corner ornaments each gets, same order as `links`
// below. Kept as plain data (not computed) so which button looks like what is easy to eyeball/tweak
// here without touching the render logic itself.
const FESTIVE_LINK_STYLE = [
  { color: 'festive-nav-red', decor: ['bellbow-tl', 'snowcap'] }, // Students
  { color: 'festive-nav-green', decor: ['pine-bl', 'pine-br'] }, // Groups
  { color: 'festive-nav-gold', decor: ['garland-top', 'bellbow-tr'] }, // Finance
  { color: 'festive-nav-orange', decor: ['sock-br', 'snowcap'] }, // Leads
  { color: 'festive-nav-burgundy', decor: ['bellbow-r', 'pine-bl'] }, // Teachers
  { color: 'festive-nav-green', decor: ['snowcap', 'garland-top'] }, // Timetable
  { color: 'festive-nav-red', decor: ['pine-tl', 'pine-tr', 'sock-bl'] }, // Courses/Pricing
  { color: 'festive-nav-gold', decor: ['snowcap', 'bellbow-tl'] }, // Notes
  { color: 'festive-nav-burgundy', decor: ['garland-top'] }, // Profile
]

// one small ornament, positioned in a corner/edge by `type` - never affects layout (always
// absolute), never covers the icon+label in the middle (every position hugs an edge/corner only).
const FestiveDecorPiece = ({ type, decorKey }) => {
  switch (type) {
    case 'snowcap': return <SnowCap key={decorKey} className='absolute -top-px left-1 right-1 h-3 festive-decor-corner' />
    case 'garland-top': return <GarlandStrip key={decorKey} className='absolute -top-px left-2 right-2 h-2.5 festive-decor-corner festive-decor-glow' />
    case 'bellbow-tl': return <BellBow key={decorKey} className='absolute -top-2 left-2 w-6 h-6 festive-decor-corner festive-decor-wiggle' />
    case 'bellbow-tr': return <BellBow key={decorKey} className='absolute -top-2 right-2 w-6 h-6 festive-decor-corner festive-decor-wiggle' />
    case 'bellbow-r': return <BellBow key={decorKey} className='absolute top-1/2 -translate-y-1/2 -right-1 w-6 h-6 festive-decor-corner festive-decor-wiggle' />
    case 'pine-bl': return <PineBranch key={decorKey} className='absolute -bottom-1 -left-1 w-6 h-6 festive-decor-corner' />
    case 'pine-br': return <PineBranch key={decorKey} className='absolute -bottom-1 -right-1 w-6 h-6 festive-decor-corner' style={{ transform: 'scaleX(-1)' }} />
    case 'pine-tl': return <PineBranch key={decorKey} className='absolute -top-1 -left-1 w-5 h-5 festive-decor-corner' style={{ transform: 'rotate(180deg)' }} />
    case 'pine-tr': return <PineBranch key={decorKey} className='absolute -top-1 -right-1 w-5 h-5 festive-decor-corner' style={{ transform: 'rotate(180deg) scaleX(-1)' }} />
    case 'sock-br': return <ChristmasSock key={decorKey} className='absolute -bottom-2 right-3 w-5 h-5 festive-decor-corner festive-decor-wiggle' />
    case 'sock-bl': return <ChristmasSock key={decorKey} className='absolute -bottom-2 left-3 w-5 h-5 festive-decor-corner festive-decor-wiggle' style={{ transform: 'scaleX(-1)' }} />
    default: return null
  }
}

// below `lg`, this becomes a slide-in drawer (off-canvas by default, toggled by App.jsx's mobile
// top bar) with a tap-to-close backdrop; at `lg` and up it's always the fixed 240px column it always
// was. `open`/`onClose` are only meaningful below `lg` - the lg:translate-x-0/lg:hidden pairs make
// sure neither the transform nor the backdrop ever affects the desktop layout.
const Sidebar = ({ open, onClose }) => {
  const { logout } = useContext(AdminContext)
  const { t } = useLanguage()
  const { isDark, toggleTheme } = useTheme()
  const { enabled: newYearEnabled, toggle: toggleNewYear } = useNewYear()

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
        <nav className='flex flex-col gap-1.5 flex-1 overflow-y-auto'>
          {links.map((link, i) => {
            const Icon = link.icon
            const festive = newYearEnabled ? FESTIVE_LINK_STYLE[i] : null
            return (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={onClose}
                className={({ isActive }) => festive
                  ? `festive-nav-btn ${festive.color} flex items-center gap-3 py-3 px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${isActive ? 'active' : ''}`
                  : `flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors ${isActive
                    ? 'bg-indigo-50 text-indigo-600 font-semibold tracking-tight dark:bg-[#4F46E5] dark:text-white dark:shadow-md dark:shadow-indigo-500/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-[#1E293B]'}`}>
                {festive?.decor.map((type, di) => <FestiveDecorPiece key={di} type={type} decorKey={di} />)}
                <Icon size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0 relative z-10' />
                <span className='relative z-10'>{link.label}</span>
              </NavLink>
            )
          })}
        </nav>
        {/* mt-auto lives here (not on the logout button below) so this row sits directly above
            "Chiqish" as one settled-in group at the bottom, instead of floating in the middle of the
            nav list or sitting in the page's own top-right corner where it collided with page-level
            "+ Add" buttons on narrower layouts */}
        <button onClick={toggleNewYear}
          className={`plain mt-auto flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] font-medium transition-colors ${newYearEnabled
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
        <button onClick={logout}
          className='plain flex items-center gap-3 py-3 px-4 rounded-xl text-[15px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition-colors'>
          <LogOut size={20} strokeWidth={1.75} className='w-5 h-5 flex-shrink-0' />
          {t('signOut')}
        </button>
      </aside>
    </>
  )
}

export default Sidebar
