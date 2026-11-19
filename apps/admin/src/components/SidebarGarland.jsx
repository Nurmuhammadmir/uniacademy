import React from 'react'

// a real string-of-lights garland threaded down the sidebar's own left margin (Sidebar.jsx) -
// always rendered (unlike every other New Year decoration, which unmounts entirely when the mode
// is off): confirmed spec is that this one stays physically in place and just "unplugs" - bulbs go
// dark/matte and the plug pulls slightly out of its outlet - rather than disappearing.
const BULB_COLORS = ['#F59E0B', '#D4AF37', '#DC6B6B', '#2D9D78']

export const GarlandWire = () => (
  <div className='sidebar-garland-wire' aria-hidden='true' />
)

// one bulb, meant to be rendered as an absolutely-positioned child of each nav row (so its
// vertical position tracks that row automatically, no hand-tuned pixel math) - `uid` only exists
// to keep each bulb's own SVG gradient id unique in the DOM, never rendered itself.
export const GarlandBulb = ({ uid, lit }) => {
  const color = BULB_COLORS[uid % BULB_COLORS.length]
  const gradId = `sidebarBulbGrad-${uid}`
  return (
    <span className={`sidebar-garland-bulb ${lit ? 'lit' : 'unlit'}`} style={{ color, animationDelay: `${(uid % 5) * 0.35}s` }} aria-hidden='true'>
      <svg viewBox='0 0 16 24' width='13' height='19'>
        <defs>
          <radialGradient id={gradId} cx='35%' cy='28%' r='75%'>
            <stop offset='0%' stopColor='#ffffff' stopOpacity='0.95' />
            <stop offset='45%' stopColor={color} />
            <stop offset='100%' stopColor={color} stopOpacity='0.85' />
          </radialGradient>
        </defs>
        <rect x='6' y='0' width='4' height='4' rx='1' fill='#8a8a8a' />
        <path d='M8 4 C3 6 2 12 4 17 C5.5 21 10.5 21 12 17 C14 12 13 6 8 4 Z' fill={`url(#${gradId})`} />
        <ellipse cx='6' cy='9' rx='1.3' ry='2' fill='#ffffff' opacity='0.65' />
      </svg>
    </span>
  )
}

// outlet + plug, sits near the bottom of the sidebar - `pluggedIn` (== New Year mode on) slides
// the plug body fully into the socket; off slides it a few px out, same "physically unplugged, not
// removed" idea as the bulbs going dark instead of vanishing.
export const GarlandPlug = ({ pluggedIn }) => (
  <div className={`sidebar-garland-plug ${pluggedIn ? 'plugged' : 'unplugged'}`} aria-hidden='true'>
    <svg viewBox='0 0 40 24' width='32' height='19'>
      <rect x='18' y='2' width='20' height='20' rx='3' fill='#E5E7EB' stroke='#9CA3AF' strokeWidth='1' />
      <circle cx='25' cy='9' r='1.3' fill='#6B7280' />
      <circle cx='31' cy='9' r='1.3' fill='#6B7280' />
      <path d='M25 15 Q28 17 31 15' stroke='#6B7280' strokeWidth='1.3' fill='none' strokeLinecap='round' />
      <g className='sidebar-garland-plug-body'>
        <rect x='2' y='8' width='16' height='8' rx='2' fill='#2F2F2F' />
        <rect x='14' y='10' width='4' height='1.6' fill='#C0C0C0' />
        <rect x='14' y='13.4' width='4' height='1.6' fill='#C0C0C0' />
      </g>
    </svg>
  </div>
)
