import React, { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'uniacademy_director_dark_mode_v1'

// the actual `dark` class is already applied synchronously by the inline script in index.html,
// before React even mounts - so there's no flash of the wrong theme on load. This just reads that
// same decision back as the initial state and takes over reactively (toggle button, persistence)
// from here on. Light is always the default unless the user has explicitly chosen dark before -
// see index.html's script for why this never follows the OS/browser's own color-scheme preference.
const getInitial = () => document.documentElement.classList.contains('dark')

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(getInitial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem(KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
