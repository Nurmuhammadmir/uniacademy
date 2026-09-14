import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useLanguage } from '../context/LanguageContext'

export interface LatLng {
  lat: number
  lng: number
}

export const useMyLocation = (options?: { auto?: boolean }) => {
  const { t } = useLanguage()
  const [position, setPosition] = useState<LatLng | null>(null)
  const [loading, setLoading] = useState(false)

  const locate = (onFound?: (pos: LatLng) => void) => {
    // Geolocation (like the service worker/install APIs) is only exposed in
    // a secure context — HTTPS, or localhost. Opening the app via a plain
    // http://<lan-ip> address (e.g. from a phone on the same WiFi) silently
    // has no navigator.geolocation at all, which used to fail with no
    // explanation. Tell the user exactly why instead of just not showing
    // a location.
    if (!window.isSecureContext) {
      toast.error(t('map.geoInsecure'))
      return
    }
    if (!navigator.geolocation) {
      toast.error(t('map.geoUnsupported'))
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude }
        setPosition(next)
        setLoading(false)
        onFound?.(next)
      },
      (error) => {
        setLoading(false)
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(t('map.geoDenied'))
        } else if (error.code === error.TIMEOUT) {
          toast.error(t('map.geoTimeout'))
        } else {
          toast.error(t('map.geoUnavailable'))
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    if (options?.auto) locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { position, locate, loading }
}
