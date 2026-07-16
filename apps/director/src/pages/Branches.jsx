import React, { useContext, useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import BranchProfileModal from '../components/BranchProfileModal.jsx'
import Modal from '../components/Modal.jsx'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const PALETTE = ['#4B4FE0', '#C9A15C', '#2F9E5C', '#EF6A44', '#2F6FED', '#A83279']

// most branches are around Nukus, Karakalpakstan, so the map opens there instead of a random city -
// it still auto-fits to every actual student pin once the data loads (see fitBounds below)
const DEFAULT_CENTER = [59.6103, 42.4531] // Nukus
const DEFAULT_ZOOM = 11

const Branches = () => {
  const { mapData, branches, getBranchProfile, createBranch, updateBranch } = useContext(DirectorContext)
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
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      // 'streets' instead of the bare 'light' style - roads, place labels, and points of interest
      // (airports, landmarks) give the map something to actually orient against
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
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

    const entries = Object.entries(mapData)
    const bounds = new mapboxgl.LngLatBounds()
    let hasPoints = false

    entries.forEach(([branchId, studentsInBranch], i) => {
      const color = PALETTE[i % PALETTE.length]
      studentsInBranch.forEach(student => {
        if (!student.geo?.lat || !student.geo?.lng) return
        const marker = new mapboxgl.Marker({ color })
          .setLngLat([student.geo.lng, student.geo.lat])
          .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`${student.name} · ${branchName(branchId)}`))
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
      <div className='flex justify-between items-center mb-1'>
        <p className='font-display text-2xl text-ink'>{t('branchesMapTitle')}</p>
        <button onClick={() => { setEditingBranch(null); setBranchNameInput(''); setShowAddBranch(true) }} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>
          {t('addBranch')}
        </button>
      </div>
      <p className='text-muted mb-4'>{t('branchesMapSubtitle')}</p>

      <div className='flex flex-wrap gap-2 mb-6'>
        {branches.map(b => (
          <button
            key={b._id}
            onClick={() => { setEditingBranch(b); setBranchNameInput(b.name); setShowAddBranch(true) }}
            className='px-3 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm text-ink hover:border-accent'
          >
            {b.name}
          </button>
        ))}
      </div>

      <div ref={containerRef} className='w-full h-[480px] rounded-2xl border border-hairline mb-6' />
      <div className='flex flex-wrap gap-3'>
        {entries.map(([branchId], i) => (
          <button key={branchId} onClick={() => setViewingBranchId(branchId)} className='inline-flex items-center gap-2 text-sm text-ink hover:underline'>
            <span className='w-3 h-3 rounded-full' style={{ background: PALETTE[i % PALETTE.length] }} />
            {branchName(branchId)} · {mapData[branchId].length}
          </button>
        ))}
        {entries.length === 0 && <p className='text-muted'>{t('noStudentLocationsYet')}</p>}
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
