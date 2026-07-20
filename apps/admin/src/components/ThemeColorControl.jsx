import React, { useState } from 'react'
import { THEMES, getTheme, setTheme } from '../lib/theme.js'

const ThemeColorControl = ({ label }) => {
  const [active, setActive] = useState(getTheme())

  const onPick = (name) => setActive(setTheme(name))

  return (
    <div>
      <p className='text-muted text-xs mb-2'>{label}</p>
      <div className='flex flex-wrap gap-3'>
        {Object.entries(THEMES).map(([key, theme]) => (
          <button key={key} onClick={() => onPick(key)} title={theme.label}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${active === key ? 'ring-2 ring-offset-2 ring-ink' : ''}`}
            style={{ backgroundColor: theme.accent }}>
            {active === key && <span className='text-white text-sm'>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ThemeColorControl
