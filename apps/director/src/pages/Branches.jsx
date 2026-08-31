import React, { useContext, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Plus, GraduationCap } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import BranchProfileModal from '../components/BranchProfileModal.jsx'
import Modal from '../components/Modal.jsx'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

// most branches are around Nukus, Karakalpakstan, so the map opens there instead of a random city -
// it still auto-fits to every actual student pin once the data loads (see fitBounds below)
const DEFAULT_CENTER = [59.6103, 42.4531] // Nukus
const DEFAULT_ZOOM = 11
// navigation-day/night instead of the plain light-v11/dark-v11 monochrome styles - those hid every
// POI icon and most place labels, so the map had nothing to visually orient by (no parks, no
// landmarks, barely any street names). The navigation styles are Mapbox's own "glanceable while
// driving" styles - still clean and modern, not the loud saturated default streets-v12, but they
// keep road names, parks, water, and points-of-interest legible, closer to how Google Maps reads.
const LIGHT_STYLE = 'mapbox://styles/mapbox/navigation-day-v1'
const DARK_STYLE = 'mapbox://styles/mapbox/navigation-night-v1'

// raw HTML, not JSX - mapboxgl.Marker takes a real DOM element, so this is lucide's own
// GraduationCap path data inlined directly rather than pulling react-dom/client just to mount one
// tiny icon per marker
const GRAD_CAP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>'

// white disc + indigo ring, same icon for every student regardless of branch - a uniform marker
// style reads calmer at a glance than the old per-branch rainbow of solid pin colors, and the
// branch is still one click away via the popup this attaches to
const createMarkerEl = (isDark) => {
  const el = document.createElement('div')
  el.className = `w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
    isDark
      ? 'bg-[#161F30] border-2 border-[#818CF8] shadow-[0_0_10px_rgba(129,140,248,0.5)] text-[#818CF8]'
      : 'bg-white border-2 border-indigo-600 shadow-md text-indigo-600'
  }`
  el.innerHTML = GRAD_CAP_SVG
  return el
}

const Branches = () => {
  const { mapData, branches, getBranchProfile, createBranch, updateBranch, deleteBranch } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [viewingBranchId, setViewingBranchId] = useState(null)
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [editingBranch, setEditingBranch] = useState(null)
  const [branchNameInput, setBranchNameInput] = useState('')
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const branchName = (id) => branches.find(b => b._id === id)?.name || t('unassigned')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    // reads the same `dark` class convention the admin app's ThemeContext already owns - this app
    // doesn't have its own toggle yet, so this only ever matters once one exists; until then it's
    // simply always false and the map stays on the light style.
    const isDark = document.documentElement.classList.contains('dark')
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      // light-v11 / dark-v11 instead of the old streets-v12 - a plain monochrome basemap that stays
      // out of the way of our own UI, instead of streets-v12's saturated greens/yellows fighting
      // the app's own palette
      style: isDark ? DARK_STYLE : LIGHT_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // the default style prefers `name_en` for place/street/POI labels, which is why everything (even
    // inside Uzbekistan) was rendering in English. Mapbox's own documented fix
    // (docs.mapbox.com/mapbox-gl-js/example/language-switch) is to rewrite every symbol layer's
    // text-field to prefer `name_uz` and fall back to the tileset's local `name` field - for places
    // inside Uzbekistan that local name IS Uzbek (occasionally Russian), so even where the tileset
    // has no explicit `name_uz` entry the fallback still gets us off English.
    mapRef.current.on('load', () => {
      mapRef.current.getStyle().layers.forEach((layer) => {
        if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
          mapRef.current.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_uz'], ['get', 'name']])
        }
      })
    })
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !mapData) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    const isDark = document.documentElement.classList.contains('dark')

    const entries = Object.entries(mapData)
    const bounds = new mapboxgl.LngLatBounds()
    let hasPoints = false

    entries.forEach(([branchId, studentsInBranch]) => {
      studentsInBranch.forEach(student => {
        if (!student.geo?.lat || !student.geo?.lng) return
        const marker = new mapboxgl.Marker({ element: createMarkerEl(isDark) })
          .setLngLat([student.geo.lng, student.geo.lat])
          .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(`${student.name} · ${branchName(branchId)}`))
          .addTo(mapRef.current)
        markersRef.current.push(marker)
        bounds.extend([student.geo.lng, student.geo.lat])
        hasPoints = true
      })
    })

    if (hasPoints) mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 13 })
  }, [mapData, branches])

  if (!mapData) return <p className='text-muted'>{t('loadingMapData')}</p>
  const entries = Object.entries(mapData)

  return (
    <div>
      {/* mobile-only header - the floating sidebar (branch list, add/rename/delete) is desktop-only
          below (a 320px overlay would eat almost an entire phone screen and leave no room for the
          map itself), so the essentials - title, add branch, and the manage-branches chip list -
          get their own compact bar here instead */}
      <div className='md:hidden flex flex-col gap-3 mb-3'>
        <div className='flex items-center justify-between'>
          <p className='text-lg font-bold text-ink'>{t('branchesMapTitle')}</p>
          <button onClick={() => { setEditingBranch(null); setBranchNameInput(''); setShowAddBranch(true) }}
            className='flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4B4FE0] text-white text-xs font-semibold'>
            <Plus size={14} strokeWidth={2} /> {t('addBranch')}
          </button>
        </div>
        <div className='flex flex-wrap gap-1.5'>
          {branches.map(b => (
            <span key={b._id} className='inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-bg-elevated border border-hairline text-xs'>
              <button onClick={() => { setEditingBranch(b); setBranchNameInput(b.name); setShowAddBranch(true) }} className='plain text-muted'>{b.name}</button>
              <button onClick={() => deleteBranch(b._id)} className='plain text-muted hover:text-rose-500 px-1 leading-none' title={t('remove')}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div className='w-full h-[70vh] md:h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-sm relative flex'>
        {/* left sidebar - branch list, floats on top of the map itself rather than sitting above it
            as a separate block, so the map gets the full remaining width instead of being squeezed
            down by a fixed-height header. Desktop only - see the mobile header above. */}
        <div className='hidden md:flex w-80 h-full bg-white/90 dark:bg-[#131B2E]/90 backdrop-blur-md border-r border-slate-200/60 dark:border-slate-800 p-5 flex-col gap-4 z-10 overflow-y-auto'>
          <div className='flex items-center justify-between'>
            <p className='text-lg font-bold text-slate-800 dark:text-white tracking-tight'>{t('branchesMapTitle')}</p>
          </div>
          <button onClick={() => { setEditingBranch(null); setBranchNameInput(''); setShowAddBranch(true) }}
            className='w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4B4FE0] hover:bg-[#3D40C7] text-white text-sm font-semibold transition-colors shadow-sm'>
            <Plus size={15} strokeWidth={2} /> {t('addBranch')}
          </button>

          <div className='flex flex-col gap-2 mt-1'>
            {entries.map(([branchId]) => (
              <button key={branchId} onClick={() => setViewingBranchId(branchId)}
                className='w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors'>
                <span className='text-slate-800 dark:text-slate-100 font-semibold text-sm truncate'>{branchName(branchId)}</span>
                <span className='flex-shrink-0 ml-2 px-2 py-0.5 rounded-full bg-[#E6E6FB] dark:bg-[#1E1B4B] text-[#4B4FE0] dark:text-[#818CF8] text-xs font-semibold'>
                  {mapData[branchId].length}
                </span>
              </button>
            ))}
            {entries.length === 0 && <p className='text-muted text-sm'>{t('noStudentLocationsYet')}</p>}
          </div>

          <div className='mt-auto pt-3 border-t border-slate-100 dark:border-slate-800'>
            <p className='text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5'>{t('branchesMapTitle')}</p>
            <div className='flex flex-wrap gap-1.5'>
              {branches.map(b => (
                <span key={b._id} className='inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-slate-100 dark:bg-slate-800/60 text-xs'>
                  <button onClick={() => { setEditingBranch(b); setBranchNameInput(b.name); setShowAddBranch(true) }}
                    className='plain text-slate-600 dark:text-slate-300 hover:text-[#4B4FE0] dark:hover:text-[#818CF8]'>
                    {b.name}
                  </button>
                  <button onClick={() => deleteBranch(b._id)} className='plain text-slate-400 dark:text-slate-600 hover:text-rose-500 px-1 leading-none' title={t('remove')}>×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* map itself fills whatever's left */}
        <div className='flex-1 relative'>
          {/* floating quick-jump chips, sitting on top of the map to the right of the sidebar -
              left-[336px] clears the w-80 (320px) sidebar plus a small gap, not a stock Tailwind step.
              The sidebar is desktop-only, so this starts flush at the left edge on mobile instead. */}
          <div className='absolute top-4 left-4 md:left-[336px] right-4 z-10 flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar'>
            {branches.map(b => (
              <button key={b._id} onClick={() => { const id = Object.keys(mapData).find(bid => bid === b._id); if (id) setViewingBranchId(id) }}
                className='flex-shrink-0 bg-white/80 dark:bg-[#131B2E]/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm hover:bg-white dark:hover:bg-[#1E293B] transition-all cursor-pointer'>
                {b.name}
              </button>
            ))}
          </div>
          <div ref={containerRef} className='w-full h-full' />
        </div>
      </div>

      {viewingBranchId && (
        <BranchProfileModal branchId={viewingBranchId} getBranchProfile={getBranchProfile} onClose={() => setViewingBranchId(null)} />
      )}

      {showAddBranch && (
        <Modal title={editingBranch ? t('editX', { name: editingBranch.name }) : t('addNewBranch')} onClose={() => { setShowAddBranch(false); setEditingBranch(null) }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const ok = editingBranch ? await updateBranch(editingBranch._id, branchNameInput) : await createBranch(branchNameInput)
              if (ok) { setShowAddBranch(false); setEditingBranch(null); setBranchNameInput('') }
            }}
            className='flex flex-col gap-3'
          >
            <input placeholder={t('branchName')} value={branchNameInput} onChange={e => setBranchNameInput(e.target.value)}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{editingBranch ? t('saveChanges') : t('addNewBranch')}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Branches
