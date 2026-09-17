import { useNavigate } from 'react-router-dom'

// A "Back" button that actually returns to wherever the user came from (a group's roster, a
// teacher's profile, a search-filtered list, ...) instead of always jumping to one hardcoded
// route - that hardcoded pattern used to send someone back to the plain unfiltered Students list
// even when they'd drilled in from a specific group's page, losing whatever tab/filter/scroll state
// they were on. react-router's BrowserRouter stamps `history.state.idx` on every entry it pushes
// (0 for the very first entry in this tab) - > 0 means there's real in-app history behind us, so
// navigate(-1) is safe. idx is undefined/0 on a fresh page load (direct link, refresh, new tab),
// where there's nothing in-app to go back to - `fallback` covers that case instead of leaving the
// button dead or exiting the app into whatever the browser's own previous page was.
export const useSafeBack = (fallback = '/') => {
  const navigate = useNavigate()
  return () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate(fallback)
  }
}
