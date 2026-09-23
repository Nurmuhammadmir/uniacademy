import { useState } from 'react'

// Drop-in replacement for useState (same [value, setValue] shape, setValue accepts a function
// updater too) that remembers its value in sessionStorage under `key` - so a filter/search/tab
// choice on a list page survives navigating away (to a profile, another page) and back, instead of
// resetting to its default every time the component remounts. sessionStorage on purpose: scoped to
// this browser tab, not a permanent cross-device account setting - matches the same storage this
// app already uses for list scroll position (see useScrollRestore.js). See
// apps/admin/src/lib/usePersistedState.js for the same fix in that app - kept as a duplicate here
// rather than a shared package since these two apps don't share any component/lib code today.
// initialValue may be a plain value or a lazy () => value initializer, same as useState itself.
export const usePersistedState = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const saved = sessionStorage.getItem(key)
      if (saved !== null) return JSON.parse(saved)
    } catch { /* fall through to initialValue */ }
    return typeof initialValue === 'function' ? initialValue() : initialValue
  })
  const setPersisted = (next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      try { sessionStorage.setItem(key, JSON.stringify(resolved)) } catch { /* storage unavailable (private mode, quota) - state still works in-memory for this render */ }
      return resolved
    })
  }
  return [value, setPersisted]
}
