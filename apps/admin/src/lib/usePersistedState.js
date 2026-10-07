import { useState } from 'react'

// Drop-in replacement for useState (same [value, setValue] shape, setValue accepts a function
// updater too) that remembers its value in an in-memory module-level store under `key` - so a
// filter/search/tab choice on a list page survives navigating away (to a profile, another page)
// and back, instead of resetting to its default every time the component remounts. Deliberately
// NOT sessionStorage: that also survived a real page reload/refresh, which was the actual
// complaint ("перезагрузить страницу - фильтры должны сбрасываться") - a hard reload re-executes
// this module from scratch and clears the store automatically, while in-app navigation (no reload)
// keeps it alive, which is exactly the split we want.
// initialValue may be a plain value or a lazy () => value initializer, same as useState itself.
const store = new Map()

export const usePersistedState = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    if (store.has(key)) return store.get(key)
    return typeof initialValue === 'function' ? initialValue() : initialValue
  })
  const setPersisted = (next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      store.set(key, resolved)
      return resolved
    })
  }
  return [value, setPersisted]
}
