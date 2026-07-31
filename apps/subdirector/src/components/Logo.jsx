import React, { useState } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL
// tries every common image extension in turn - drop the real file in server/public/ named
// exactly "logoUniacademy.<ext>" (png/jpg/jpeg/svg/webp, any one of them) and it's picked up
// automatically, no code change needed. Falls back to the built-in placeholder mark until then.
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg', 'webp']

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
// updates the logo across all 5 apps at once, with no rebuild/deploy of app code required
const Logo = ({ size = 32, withWordmark = true }) => {
  const [extIndex, setExtIndex] = useState(0)
  const [exhausted, setExhausted] = useState(false)

  const handleError = () => {
    if (extIndex < EXTENSIONS.length - 1) setExtIndex(i => i + 1)
    else setExhausted(true)
  }

  return (
    <div className='flex items-center gap-2.5'>
      {exhausted ? (
        <PlaceholderMark size={size} />
      ) : (
        <img
          src={`${backendUrl}/static/logoUniacademy.${EXTENSIONS[extIndex]}`}
          alt='UniAcademy' width={size} height={size}
          style={{ objectFit: 'contain', borderRadius: 8 }}
          onError={handleError}
        />
      )}
      {withWordmark && <span className='font-display text-lg text-ink leading-none'>UniAcademy</span>}
    </div>
  )
}

export default Logo
