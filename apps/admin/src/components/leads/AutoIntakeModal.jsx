import React, { useContext, useState } from 'react'
import { AdminContext } from '../../context/AdminContext.jsx'
import Modal from '../Modal.jsx'

// a source can only usefully auto-route to one subgroup at a time - toggling it on here for THIS
// subgroup is expected to also remove it from wherever else it was bound, which the backend leaves
// to the admin to manage manually since it doesn't enforce single-ownership itself
const AutoIntakeModal = ({ subgroup, onClose, onSaved, t }) => {
  const { leadSources, updateLeadSubgroup } = useContext(AdminContext)
  const [selected, setSelected] = useState(subgroup.autoIntakeSourceNames || [])

  const toggle = (name) => setSelected(s => s.includes(name) ? s.filter(n => n !== name) : [...s, name])

  const save = async () => {
    const ok = await updateLeadSubgroup(subgroup._id, { autoIntakeSourceNames: selected })
    if (ok) { onSaved(subgroup._id, selected); onClose() }
  }

  return (
    <Modal title={t('autoIntakeSettingsTitle', { name: subgroup.name })} onClose={onClose}>
      <p className='text-muted text-sm mb-3'>{t('autoIntakeHint')}</p>
      <div className='flex flex-col gap-2 mb-4'>
        {leadSources.map(s => (
          <label key={s._id} className='flex items-center gap-2 bg-bg border border-hairline rounded-lg px-3 py-2 cursor-pointer'>
            <input type='checkbox' checked={selected.includes(s.name)} onChange={() => toggle(s.name)} className='w-4 h-4' />
            <span className='w-3 h-3 rounded-full' style={{ backgroundColor: s.color }} />
            <span className='text-ink text-sm'>{s.name}</span>
          </label>
        ))}
      </div>
      <button onClick={save} className='w-full py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
    </Modal>
  )
}

export default AutoIntakeModal
