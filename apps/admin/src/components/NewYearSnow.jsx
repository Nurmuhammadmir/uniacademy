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

  return (
    <>
      {/* a thin strip of garland lights across the very top of the viewport - one fixed element,
          pure CSS background pattern (see .new-year-garland), so it shows up above every page in
          every one of these 3 apps without touching each page's own header markup */}
      <div className='new-year-garland fixed top-0 left-0 right-0 z-40' style={{ pointerEvents: 'none' }} aria-hidden='true' />
      {!reduceMotion && (
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
      )}
    </>
  )
}

export default NewYearSnow
