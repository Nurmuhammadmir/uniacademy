import { useNavigate } from 'react-router-dom'

// A "Back" button that actually returns to wherever the user came from instead of always jumping
// to one hardcoded route - see apps/admin/src/lib/useSafeBack.js (same fix, same reasoning) for the
// full comment; kept as a duplicate here rather than a shared package since these two apps don't
// share any component/lib code today.
export const useSafeBack = (fallback = '/') => {
  const navigate = useNavigate()
  return () => {
    if (window.history.state && window.history.state.idx > 0) navigate(-1)
    else navigate(fallback)
  }
}
