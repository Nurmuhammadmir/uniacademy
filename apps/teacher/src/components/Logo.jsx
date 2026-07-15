import React from 'react'

// the shared brand mark - three overlapping rounded squares with a subtle gradient and drop shadow,
// meant to read as a small stack/cube rather than a flat emoji-style icon. Used consistently across
// all 4 apps regardless of each app's own accent color, so the brand itself stays recognizable.
const Logo = ({ size = 32, withWordmark = true }) => (
  <div className='flex items-center gap-2.5'>
    <svg width={size} height={size} viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg' style={{ filter: 'drop-shadow(0 2px 4px rgba(75,79,224,0.35))' }}>
      <defs>
        <linearGradient id='logoGradBack' x1='4' y1='4' x2='30' y2='30' gradientUnits='userSpaceOnUse'>
          <stop stopColor='#8B8FF0' />
          <stop offset='1' stopColor='#4B4FE0' />
        </linearGradient>
        <linearGradient id='logoGradMid' x1='8' y1='8' x2='34' y2='34' gradientUnits='userSpaceOnUse'>
          <stop stopColor='#6367E8' />
          <stop offset='1' stopColor='#2F32B0' />
        </linearGradient>
        <linearGradient id='logoGradFront' x1='10' y1='10' x2='36' y2='36' gradientUnits='userSpaceOnUse'>
          <stop stopColor='#4B4FE0' />
          <stop offset='1' stopColor='#1F2299' />
        </linearGradient>
      </defs>
      <rect x='2' y='2' width='22' height='22' rx='7' fill='url(#logoGradBack)' opacity='0.55' />
      <rect x='9' y='9' width='22' height='22' rx='7' fill='url(#logoGradMid)' opacity='0.8' />
      <rect x='16' y='16' width='22' height='22' rx='7' fill='url(#logoGradFront)' />
    </svg>
    {withWordmark && <span className='font-display text-lg text-ink leading-none'>UniAcademy</span>}
  </div>
)

export default Logo
