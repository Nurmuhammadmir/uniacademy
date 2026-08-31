import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'

// Sun/Moon swap - shows the icon for the theme a click would switch TO, matching most premium
// dashboards' convention, rather than the theme currently active.
const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type='button'
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`plain flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors ${className}`}
    >
      {isDark
        ? <Sun size={20} strokeWidth={1.5} className='w-5 h-5' />
        : <Moon size={20} strokeWidth={1.5} className='w-5 h-5' />}
    </button>
  )
}

export default ThemeToggle
