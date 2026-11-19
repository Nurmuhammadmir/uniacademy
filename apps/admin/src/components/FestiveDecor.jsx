import React from 'react'

// small decorative SVGs for the festive sidebar nav buttons (Sidebar.jsx) - every one of these is
// positioned by its caller (absolute, in a corner), never affects layout/flow, and is tiny enough
// (a few path/circle nodes each) that rendering all of them for all 9 buttons is not a perf concern.

export const SnowCap = ({ className }) => (
  <svg viewBox='0 0 120 16' preserveAspectRatio='none' className={className} aria-hidden='true'>
    <path d='M0 16 Q 10 2 20 10 T 40 9 T 60 11 T 80 8 T 100 11 T 120 9 V16 Z' fill='#FFFFFF' opacity='0.92' />
  </svg>
)

export const PineBranch = ({ className }) => (
  <svg viewBox='0 0 32 32' className={className} aria-hidden='true'>
    <path d='M16 30 L16 10' stroke='#2D6A4F' strokeWidth='1.5' />
    <path d='M16 12 L6 6 M16 16 L4 12 M16 20 L6 18 M16 12 L26 6 M16 16 L28 12 M16 20 L26 18' stroke='#40916C' strokeWidth='2.4' strokeLinecap='round' />
    <circle cx='6' cy='6' r='1.6' fill='#D7263D' />
    <circle cx='26' cy='18' r='1.6' fill='#D4AF37' />
  </svg>
)

export const BellBow = ({ className }) => (
  <svg viewBox='0 0 32 32' className={className} aria-hidden='true'>
    <path d='M12 10 Q16 2 20 10 Z' fill='#B91C2B' />
    <circle cx='16' cy='9' r='2.2' fill='#B91C2B' />
    <circle cx='12' cy='20' r='6' fill='#D4AF37' />
    <circle cx='12' cy='20' r='6' fill='none' stroke='#9A7B1E' strokeWidth='0.8' />
    <circle cx='12' cy='25.4' r='1.3' fill='#9A7B1E' />
    <circle cx='21' cy='18' r='5' fill='#D4AF37' />
    <circle cx='21' cy='18' r='5' fill='none' stroke='#9A7B1E' strokeWidth='0.8' />
    <circle cx='21' cy='22.6' r='1.1' fill='#9A7B1E' />
  </svg>
)

export const ChristmasSock = ({ className }) => (
  <svg viewBox='0 0 32 32' className={className} aria-hidden='true'>
    <path d='M12 2 H20 V16 Q20 20 26 22 Q30 23.5 29 27 Q27 30 20 29 Q12 28 12 20 Z' fill='#D7263D' />
    <rect x='11' y='1' width='10' height='5' rx='2.5' fill='#FFFFFF' />
    <circle cx='26' cy='24' r='1.6' fill='#FFFFFF' />
  </svg>
)

// short strip of garland dots for a button's own top/bottom edge - same visual idea as the
// page-wide .new-year-garland strip, just small enough to size to one nav item
export const GarlandStrip = ({ className }) => (
  <svg viewBox='0 0 120 10' preserveAspectRatio='none' className={className} aria-hidden='true'>
    <path d='M0 2 Q15 8 30 2 T 60 2 T 90 2 T 120 2' stroke='rgba(255,255,255,0.5)' strokeWidth='1' fill='none' />
    {[8, 36, 64, 92].map((x, i) => (
      <circle key={i} cx={x} cy={i % 2 === 0 ? 4 : 5} r='2.6' fill={['#D7263D', '#D4AF37', '#2D6A4F', '#D4AF37'][i % 4]} />
    ))}
  </svg>
)
