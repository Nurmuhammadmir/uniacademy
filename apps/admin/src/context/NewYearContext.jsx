import React, { createContext, useContext, useEffect, useState } from 'react'

const NewYearContext = createContext(null)
const KEY = 'uniacademy_admin_new_year_v1'
const CHIME_SRC = '/sounds/sleigh-bells.mp3'

export const NewYearProvider = ({ children }) => {
  // on by default for everyone, until a person explicitly turns it off themselves - only an
  // explicit stored '0' (a real past toggle-off) ever starts it disabled; "nothing stored yet"
  // (a brand new browser/profile) defaults to on, not off.
  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored === null ? true : stored === '1'
    } catch { return true }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, enabled ? '1' : '0') } catch { /* private window etc - just won't persist */ }
  }, [enabled])

  const toggle = () => {
    setEnabled(prev => {
      const next = !prev
      // chime only on the OFF->ON flip, triggered directly by this click (satisfies every
      // browser's autoplay-needs-a-user-gesture rule) - never loops, never repeats on its own
      if (next) new Audio(CHIME_SRC).play().catch(() => {})
      return next
    })
  }

  return (
    <NewYearContext.Provider value={{ enabled, toggle }}>
      {children}
    </NewYearContext.Provider>
  )
}

export const useNewYear = () => useContext(NewYearContext)
