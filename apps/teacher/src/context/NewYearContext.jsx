import React, { createContext, useContext, useEffect, useState } from 'react'

const NewYearContext = createContext(null)
const KEY = 'uniacademy_teacher_new_year_v1'
const CHIME_SRC = '/sounds/sleigh-bells.mp3'

export const NewYearProvider = ({ children }) => {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
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
