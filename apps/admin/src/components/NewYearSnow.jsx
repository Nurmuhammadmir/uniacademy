import React, { useMemo } from 'react'

// purely decorative falling snow - CSS-only animation (no JS render loop), so it costs the main
// thread essentially nothing. Fixed-size flake list computed once per mount, never reshuffled by a
// re-render. Skips entirely for prefers-reduced-motion, same as any other motion effect would.
const FLAKE_COUNT = 28

const NewYearSnow = () => {
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const flakes = useMemo(() => Array.from({ length: FLAKE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 4 + Math.random() * 6,
    duration: 9 + Math.random() * 10,
    delay: -(Math.random() * 18), // negative delay starts each flake already mid-fall, not all bunched at the top on mount
    opacity: 0.25 + Math.random() * 0.35,
  })), [])

  if (reduceMotion) return null

  return (
    <div className='fixed inset-0 z-30 overflow-hidden' style={{ pointerEvents: 'none' }} aria-hidden='true'>
      {flakes.map(f => (
        <span key={f.id} className='new-year-snowflake' style={{
          left: `${f.left}%`,
          width: f.size, height: f.size,
          opacity: f.opacity,
          animationDuration: `${f.duration}s`,
          animationDelay: `${f.delay}s`,
        }} />
      ))}
    </div>
  )
}

export default NewYearSnow
