import React, { useEffect, useRef } from 'react'

const backendUrl = import.meta.env.VITE_BACKEND_URL
// same "drop the file on the server, no rebuild needed" convention Logo.jsx already uses for
// logoUniacademy.<ext> - an admin can swap the track by replacing server/public/newYearMusic.webm,
// no redeploy of either app. No cache-busting query param on purpose, unlike Logo's: this file is
// large and worth letting the browser cache for real across sessions (server.js's /static route
// already sets a 7-day maxAge) - bump the filename itself if the track is ever replaced and old
// caches need busting.
//
// WebM/Opus only (confirmed spec) - smaller than MP3 at the same quality (2.36MB vs 5.3MB for this
// track), at the cost of Safari's WebM support being unreliable; no MP3 fallback, so a browser that
// can't play this simply plays nothing, by choice.
const MUSIC_SRC_WEBM = `${backendUrl}/static/newYearMusic.webm`
const POSITION_KEY = 'uniacademy_director_new_year_music_position_v1'
const SAVE_INTERVAL_SECONDS = 4

// plays like a radio left on in the background: picks up from wherever it was, not from 0:00,
// every time it starts. A plain HTML5 <audio> element is what makes this cheap regardless of file
// size - the browser streams/buffers it off the main thread, nothing here touches it frame-by-
// frame, so a large track costs bandwidth once, not CPU.
const NewYearMusic = ({ enabled }) => {
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!enabled) {
      audio.pause()
      return
    }

    const resume = () => {
      const saved = Number(localStorage.getItem(POSITION_KEY))
      if (Number.isFinite(saved) && saved > 0 && saved < (audio.duration || Infinity)) audio.currentTime = saved
      audio.play().catch(() => {
        // most browsers block audio-with-sound until the page has had a real user gesture this
        // session - not an error, just means it starts on the very next click anywhere instead of
        // immediately. Never retries on a timer (that would just be the same blocked call again).
        const onFirstInteraction = () => { audio.play().catch(() => {}) }
        window.addEventListener('pointerdown', onFirstInteraction, { once: true })
        return () => window.removeEventListener('pointerdown', onFirstInteraction)
      })
    }

    if (audio.readyState >= 1) resume()
    else audio.addEventListener('loadedmetadata', resume, { once: true })

    let lastSaved = 0
    const savePosition = () => {
      const now = audio.currentTime
      if (Math.abs(now - lastSaved) < SAVE_INTERVAL_SECONDS) return
      lastSaved = now
      try { localStorage.setItem(POSITION_KEY, String(now)) } catch { /* private window etc */ }
    }
    audio.addEventListener('timeupdate', savePosition)
    window.addEventListener('pagehide', savePosition)

    return () => {
      audio.removeEventListener('loadedmetadata', resume)
      audio.removeEventListener('timeupdate', savePosition)
      window.removeEventListener('pagehide', savePosition)
    }
  }, [enabled])

  return <audio ref={audioRef} src={MUSIC_SRC_WEBM} loop preload={enabled ? 'auto' : 'none'} style={{ display: 'none' }} />
}

export default NewYearMusic
