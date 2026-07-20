import React, { useContext, useState } from 'react'
import { AdminContext } from '../../context/AdminContext.jsx'
import Modal from '../Modal.jsx'

const SourceManagerModal = ({ onClose, t }) => {
  const { leadSources, createLeadSource, updateLeadSource, deleteLeadSource } = useContext(AdminContext)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', color: '#7A7266' })

  const submitNew = async (e) => {
    e.preventDefault()
    if (!newSource.name.trim()) return
    const ok = await createLeadSource(newSource)
    if (ok) { setNewSource({ name: '', color: '#7A7266' }); setAdding(false) }
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    await updateLeadSource(editing._id, { name: editing.name, color: editing.color })
    setEditing(null)
  }

  return (
    <Modal title={t('manageSourcesBtn')} onClose={onClose}>
      <div className='flex flex-col gap-2 mb-3'>
        {leadSources.map(s => (
          <div key={s._id} className='flex items-center justify-between bg-bg border border-hairline rounded-lg px-3 py-2'>
            {editing?._id === s._id ? (
              <form onSubmit={submitEdit} className='flex gap-2 items-center flex-1'>
                <input type='color' value={editing.color} onChange={e => setEditing({ ...editing, color: e.target.value })} className='w-7 h-7 rounded' />
                <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className='flex-1 px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm' />
                <button type='submit' className='text-accent text-sm font-medium'>{t('save')}</button>
              </form>
            ) : (
              <>
                <span className='flex items-center gap-2'>
                  <span className='w-3 h-3 rounded-full' style={{ backgroundColor: s.color }} />
                  <span className='text-ink text-sm'>{s.name}</span>
                </span>
                <span className='flex gap-3'>
                  <button onClick={() => setEditing(s)} className='text-accent text-sm font-medium'>{t('edit')}</button>
                  {s.name !== 'Other' && <button onClick={() => deleteLeadSource(s._id)} className='text-muted text-sm font-medium'>{t('removeBtn')}</button>}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      {adding ? (
        <form onSubmit={submitNew} className='flex gap-2 items-center'>
          <input type='color' value={newSource.color} onChange={e => setNewSource({ ...newSource, color: e.target.value })} className='w-7 h-7 rounded' />
          <input autoFocus value={newSource.name} onChange={e => setNewSource({ ...newSource, name: e.target.value })} placeholder={t('sourceNamePlaceholder')}
            className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
          <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium'>{t('add')}</button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className='text-accent text-sm font-medium'>+ {t('addSourceBtn')}</button>
      )}
    </Modal>
  )
}

export default SourceManagerModal
