import React, { useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL
// tries every common image extension in turn - drop the real file in server/public/ named
// exactly "logoUniacademy.<ext>" (png/jpg/jpeg/svg/webp, any one of them) and it's picked up
// automatically, no code change needed. Falls back to the built-in placeholder mark until then.
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp']

// server.js serves /static with a 7-day maxAge (see server.js's comment on that route) - great for
// vocab/reading photos that never change once uploaded, but it means a *replaced* logo file (same
// filename, same extension) keeps getting served from the browser's own cache for up to 7 days with
// no way to tell it's stale. Computed once per page load (not per render) so it still busts on every
// navigation/refresh without defeating in-page caching for the multiple <Logo> instances a single
// page can render (sidebar + login, etc all share this one value during the same load).
const CACHE_BUST = Date.now()

// New Year mode's one hat-on-the-logo touch (see Sidebar.jsx's `festive` prop) - a simplified red
// Santa hat perched on the top-left corner of the mark, tilted slightly. Pure decoration: sized off
// the logo's own `size` so it scales with it, absolutely positioned so it never affects layout/flow.
const SantaHat = ({ size }) => (
  <svg width={size * 0.62} height={size * 0.62} viewBox='0 0 24 24'
    style={{ position: 'absolute', top: -size * 0.32, left: -size * 0.22, transform: 'rotate(-18deg)', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
    aria-hidden='true'>
    <path d='M4 20c0-9 5-16 13-16 1 0 2 3-1 5-2 1-3 3-1 5 3-2 6 0 6 3 0 4-6 7-11 7-3 0-6-1-6-4z' fill='#D7263D' />
    <ellipse cx='9' cy='19.5' rx='7' ry='3' fill='#FFFFFF' />
    <circle cx='18' cy='5' r='2.4' fill='#FFFFFF' />
  </svg>
)

const PlaceholderMark = ({ size }) => (
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
)

// the shared brand mark - reads server/public/logoUniacademy.<ext> so replacing that one file
// updates the logo across all 6 apps at once, with no rebuild/deploy of app code required. The
// wordmark deliberately uses Clash Display inline rather than the platform's own font-display
// utility (Plus Jakarta Sans, see tailwind-preset) - Clash Display is reserved for the brand name
// alone, not for section headings elsewhere in the UI.
const Logo = ({ size = 32, withWordmark = true, festive = false }) => {
  const [extIndex, setExtIndex] = useState(0)
  const [exhausted, setExhausted] = useState(false)

  const handleError = () => {
    if (extIndex < EXTENSIONS.length - 1) setExtIndex(i => i + 1)
    else setExhausted(true)
  }

  return (
    <div className='flex items-center gap-2.5'>
      <div style={{ position: 'relative' }}>
        {festive && <SantaHat size={size} />}
        {exhausted ? (
          <PlaceholderMark size={size} />
        ) : (
          <img
            src={`${backendUrl}/static/logoUniacademy.${EXTENSIONS[extIndex]}?v=${CACHE_BUST}`}
            alt='UniAcademy' width={size} height={size}
            style={{ objectFit: 'contain', borderRadius: 8 }}
            onError={handleError}
          />
        )}
      </div>
      {withWordmark && <span className='text-lg text-ink leading-none' style={{ fontFamily: '"Clash Display", sans-serif' }}>UniAcademy</span>}
    </div>
  )
}

export default Logo
