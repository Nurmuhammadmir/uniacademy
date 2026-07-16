import React, { useState } from 'react'
import { getFontScale, setFontScale, MIN_SCALE, MAX_SCALE } from '../lib/fontScale.js'

const FontSizeControl = ({ label }) => {
  const [scale, setScale] = useState(getFontScale())

  const onChange = (e) => setScale(setFontScale(Number(e.target.value)))

  return (
    <div>
      <div className='flex justify-between items-center mb-2'>
        <p className='text-muted text-xs'>{label}</p>
        <span className='text-muted text-xs font-mono'>{scale}%</span>
      </div>
      <div className='flex items-center gap-3'>
        <span className='text-xs text-muted'>A</span>
        <input type='range' min={MIN_SCALE} max={MAX_SCALE} step={5} value={scale} onChange={onChange}
          className='flex-1 accent-accent' />
        <span className='text-2xl text-muted leading-none'>A</span>
      </div>
    </div>
  )
}

export default FontSizeControl
