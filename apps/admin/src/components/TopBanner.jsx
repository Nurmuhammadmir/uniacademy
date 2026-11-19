import React, { useState } from 'react'

// reads public/images/top-banner.png - same "drop the file, no rebuild" convention Logo.jsx and
// NewYearMusic.jsx already use for logoUniacademy.<ext> / newYearMusic.mp3. Nothing shows until
// that file actually exists (onError hides the whole strip instead of a broken-image icon) -
// height:100% + width:auto means it's shown at its own real aspect ratio, centered, never
// stretched/distorted to fit; on a viewport wider than the image itself, the page's own background
// just shows through at the edges rather than the image being stretched to cover them.
const TopBanner = () => {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img src='/images/top-banner.png' alt='' aria-hidden='true' onError={() => setFailed(true)}
      style={{ height: '100%', width: 'auto', display: 'block', margin: '0 auto' }} />
  )
}

export default TopBanner
