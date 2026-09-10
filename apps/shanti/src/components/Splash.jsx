import React, { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const WORD = 'Lamussa'
const LETTER_STEP = 90 // ms between each letter's entrance
const WELCOME_DELAY = WORD.length * LETTER_STEP + 500
const TOTAL_DURATION = WELCOME_DELAY + 1100

// Plays once on every full page load - the wordmark's letters step in one at a time, then a
// welcome line fades in, then this unmounts and the real app (already rendered underneath) shows.
const Splash = ({ onDone }) => {
  const { t } = useLanguage()
  const [showWelcome, setShowWelcome] = useState(false)
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const welcomeTimer = setTimeout(() => setShowWelcome(true), WELCOME_DELAY)
    const hideTimer = setTimeout(() => setHiding(true), TOTAL_DURATION)
    const doneTimer = setTimeout(onDone, TOTAL_DURATION + 400)
    return () => { clearTimeout(welcomeTimer); clearTimeout(hideTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    // z-[100] - strictly above the sidebar's own z-50 (both are `fixed`, so equal z-index would
    // otherwise leave stacking order to DOM position and let the sidebar bleed through on desktop)
    <div className={`fixed inset-0 z-[100] bg-bg flex flex-col items-center justify-center transition-opacity duration-400 ${hiding ? 'opacity-0' : 'opacity-100'}`}>
      <p className='font-logo text-6xl sm:text-7xl md:text-[9vw] text-[#DC2626] tracking-tight leading-none'>
        {WORD.split('').map((letter, i) => (
          <span key={i} className='shanti-letter' style={{ animationDelay: `${i * LETTER_STEP}ms` }}>{letter}</span>
        ))}
      </p>
      {/* always mounted (space reserved from the very first frame) and just fades via opacity -
          conditionally mounting it instead would grow the centered flex column's height when it
          appears, which recenters the whole group and makes the logo visibly jump upward */}
      <p className={`text-sm md:text-lg text-muted tracking-wide mt-4 md:mt-8 transition-opacity duration-500 ${showWelcome ? 'opacity-100' : 'opacity-0'}`}>
        {t('welcomeMessage')}
      </p>
    </div>
  )
}

export default Splash
