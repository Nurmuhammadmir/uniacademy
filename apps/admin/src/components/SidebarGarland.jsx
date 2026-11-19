import React from 'react'

const TILE_SRC = '/images/sidebar-garland-tile.png'

// a real string-of-lights garland threaded down the sidebar's own left margin (Sidebar.jsx) - one
// image (public/images/sidebar-garland-tile.png), vertically tiled via CSS (background-repeat:
// repeat-y), not individual per-button bulbs. Always rendered (unlike every other New Year
// decoration, which unmounts entirely when the mode is off): confirmed spec is that this one stays
// physically in place and just "unplugs" - the `lit`/`unlit` class dims+desaturates the whole strip
// via CSS filter rather than unmounting it, so the sidebar always carries the same ornament, only
// its lit state changes with the toggle.
export const GarlandStrip = ({ lit }) => (
  <div className={`sidebar-garland-strip ${lit ? 'lit' : 'unlit'}`}
    style={{ backgroundImage: `url(${TILE_SRC})` }} aria-hidden='true' />
)

// outlet + plug, sits near the bottom of the sidebar - `pluggedIn` (== New Year mode on) slides
// the plug body fully into the socket; off slides it a few px out, same "physically unplugged, not
// removed" idea as the strip going dark instead of vanishing.
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
