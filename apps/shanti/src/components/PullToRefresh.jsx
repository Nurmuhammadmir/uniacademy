import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const THRESHOLD = 100 // logical (damped) pixels the indicator must reach
const MAX_PULL = 110
const DEAD_ZONE = 12 // raw finger px ignored before the indicator appears at all
const RESISTANCE = 0.45 // finger has to travel further than the visual pull suggests

// Mobile-only gesture: pull down from the top of the page to reload and jump back to the
// dashboard - a safety net for whenever the app gets into a bad state, mirroring the pull-to-refresh
// users already know from native apps. No-op on desktop since it only listens for touch events.
// Shanti's pages scroll at the window/document level (no nested scroll container), so this reads
// window.scrollY rather than a container ref's scrollTop.
//
// Damped like native implementations (Twitter/Gmail etc.): a small dead zone plus resistance mean an
// ordinary scroll flick that starts at scrollY 0 doesn't reach the threshold, only a deliberate
// sustained pull does. A fired-once guard stops a lingering finger from re-triggering mid-navigation.
const PullToRefresh = () => {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pullRef = useRef(0)
  const firedRef = useRef(false)

  useEffect(() => {
    const onTouchStart = (e) => {
      if (firedRef.current) return
      const target = e.target
      if (target.closest('[data-no-pull-refresh]')) { startY.current = null; return }
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null
    }

    const onTouchMove = (e) => {
      if (firedRef.current || startY.current === null || window.scrollY > 0) return
      const raw = e.touches[0].clientY - startY.current
      if (raw <= DEAD_ZONE) {
        if (pullRef.current !== 0) { pullRef.current = 0; setPull(0) }
        return
      }
      const damped = Math.min((raw - DEAD_ZONE) * RESISTANCE, MAX_PULL)
      pullRef.current = damped
      setPull(damped)
    }

    const onTouchEnd = () => {
      if (!firedRef.current && pullRef.current >= THRESHOLD) {
        firedRef.current = true
        setRefreshing(true)
        setTimeout(() => { window.location.href = '/dashboard' }, 250)
      } else if (!firedRef.current) {
        pullRef.current = 0
        setPull(0)
      }
      startY.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  if (pull === 0 && !refreshing) return null

  const height = refreshing ? 48 : pull
  const armed = pull >= THRESHOLD

  return (
    <div className='flex items-center justify-center overflow-hidden transition-[height] duration-150' style={{ height }}>
      <RefreshCw size={18} className={`text-accent ${refreshing || armed ? 'animate-spin' : ''}`}
        style={refreshing ? undefined : { transform: `rotate(${pull * 2.5}deg)`, opacity: Math.min(pull / THRESHOLD, 1) }} />
    </div>
  )
}

export default PullToRefresh
