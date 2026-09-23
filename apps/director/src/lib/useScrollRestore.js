import { useEffect, useRef } from 'react'

// Confirmed real annoyance: with 100+ rows, opening one row's detail page then going back used to
// always land back at the very top of the list, forcing a long re-scroll to find where you were.
// Continuously remembers scroll position while on the list page (sessionStorage, so it only survives
// this tab/session, not forever) and restores it once `ready` (the list has something to scroll to)
// - after coming back from a detail page, or after a fresh page load/refresh. See
// apps/admin/src/lib/useScrollRestore.js for the same fix in that app.
export const useScrollRestore = (key, ready) => {
  const restoredRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => sessionStorage.setItem(key, String(window.scrollY))
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [key])

  useEffect(() => {
    if (restoredRef.current || !ready) return
    const saved = sessionStorage.getItem(key)
    if (saved) {
      restoredRef.current = true
      requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    }
  }, [ready])
}
