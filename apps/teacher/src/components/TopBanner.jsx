import React, { useEffect, useState } from 'react'

const TILE_SRC = '/images/top-banner-tile.png'

// reads public/images/top-banner-tile.png - same "drop the file, no rebuild" convention Logo.jsx
// and NewYearMusic.jsx already use. A single seamless tile, repeated horizontally via CSS
// (background-repeat: repeat-x, background-size: auto 100%) rather than one giant stretched image -
// works at any viewport width with no empty gutters and no distortion, and is realistically what an
// AI image generator can actually produce well (a small repeating pattern, not one 3000px+ banner).
// A hidden probe <img> is the only way to know the file exists at all before committing to a
// background-image (which has no onError of its own) - shows nothing rather than a broken-image box
// until a real tile is in place.
const TopBanner = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const probe = new Image()
    probe.onload = () => setReady(true)
    probe.onerror = () => setReady(false)
    probe.src = TILE_SRC
  }, [])

  if (!ready) return null

  return (
    <div style={{
      height: '100%',
      backgroundImage: `url(${TILE_SRC})`,
      backgroundRepeat: 'repeat-x',
      backgroundPosition: 'top center',
      backgroundSize: 'auto 100%',
    }} aria-hidden='true' />
  )
}

export default TopBanner
