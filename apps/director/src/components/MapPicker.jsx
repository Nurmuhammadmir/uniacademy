import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useLanguage } from '../i18n/LanguageContext.jsx'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

// most branches are around Nukus, Karakalpakstan, so the map opens there by default instead of a
// random/unrelated city - editing an existing student still flies straight to that student's actual
// pin regardless of this default. Copied verbatim from apps/admin/src/components/MapPicker.jsx (see
// that file's own comments for the button-type-submit bug fix and the onChangeRef staleness fix) -
// director previously had no way to edit a student's address/geo at all, only display it read-only.
const DEFAULT_CENTER = [59.6103, 42.4531] // Nukus
const DEFAULT_ZOOM = 11

// address search (Mapbox Geocoding API) + a draggable pin on a live map. onChange fires with
// { lat, lng, address } every time the pin moves.
const MapPicker = ({ address, lat, lng, onChange }) => {
  const { t } = useLanguage()
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [query, setQuery] = useState(address || '')
  const [suggestions, setSuggestions] = useState([])

  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  const queryRef = useRef(query)
  useEffect(() => { queryRef.current = query }, [query])

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: lat && lng ? [lng, lat] : DEFAULT_CENTER,
      zoom: lat ? 14 : DEFAULT_ZOOM,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    if (lat && lng) placeMarker(lat, lng, false)
    mapRef.current.on('click', (e) => placeMarker(e.lngLat.lat, e.lngLat.lng, true))

    const localizeLabels = () => {
      mapRef.current.getStyle().layers.forEach((layer) => {
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
          mapRef.current.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_uz'], ['get', 'name']])
        }
      })
    }
    mapRef.current.on('load', localizeLabels)

    const neutralizeButtons = () => {
      containerRef.current?.querySelectorAll('button:not([type])').forEach(btn => btn.setAttribute('type', 'button'))
    }
    const observer = new MutationObserver(neutralizeButtons)
    observer.observe(containerRef.current, { childList: true, subtree: true })
    neutralizeButtons()

    return () => {
      observer.disconnect()
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  const placeMarker = (nextLat, nextLng, shouldFly) => {
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: true, color: '#2F6FED' }).setLngLat([nextLng, nextLat]).addTo(mapRef.current)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLngLat()
        onChangeRef.current({ lat: pos.lat, lng: pos.lng, address: queryRef.current })
      })
    } else {
      markerRef.current.setLngLat([nextLng, nextLat])
    }
    if (shouldFly) mapRef.current.flyTo({ center: [nextLng, nextLat], zoom: 15 })
    onChangeRef.current({ lat: nextLat, lng: nextLng, address: queryRef.current })
  }

  const search = async (text) => {
    setQuery(text)
    if (text.length < 3) { setSuggestions([]); return }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${mapboxgl.accessToken}&language=uz&limit=5`)
      const data = await res.json()
      if (!res.ok) {
        console.error('Mapbox geocoding error', res.status, data)
      }
      setSuggestions(data.features || [])
    } catch (error) {
      console.error('Mapbox geocoding request failed', error)
      setSuggestions([])
    }
  }

  const selectSuggestion = (feature) => {
    const [featureLng, featureLat] = feature.center
    setQuery(feature.place_name)
    setSuggestions([])
    placeMarker(featureLat, featureLng, true)
    onChangeRef.current({ lat: featureLat, lng: featureLng, address: feature.place_name })
  }

  return (
    <div>
      <div className='relative mb-2'>
        <input value={query} onChange={(e) => search(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} placeholder={t('searchAddress')}
          className='w-full px-4 py-3 rounded-xl bg-bg border border-hairline' />
        {suggestions.length > 0 && (
          <div className='absolute z-10 w-full bg-bg-elevated border border-hairline rounded-xl mt-1 max-h-48 overflow-y-auto'>
            {suggestions.map(f => (
              <button key={f.id} type='button' onClick={() => selectSuggestion(f)} className='block w-full text-left px-4 py-2 text-sm'>{f.place_name}</button>
            ))}
          </div>
        )}
      </div>
      <div ref={containerRef} className='w-full h-56 rounded-xl border border-hairline' />
      <p className='text-xs text-muted mt-1'>{t('searchOrTapHint')}</p>
    </div>
  )
}

export default MapPicker
