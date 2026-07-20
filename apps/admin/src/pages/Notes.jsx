import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const Notes = () => {
  const { getMyNotes, createMyNote, deleteMyNote } = useContext(AdminContext)
  const { t } = useLanguage()
  const [notes, setNotes] = useState(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = () => getMyNotes().then(setNotes)
  useEffect(() => { reload() }, [])

  const submitNote = async (e) => {
    e.preventDefault()
    if (!text.trim() || saving) return
    setSaving(true)
    const ok = await createMyNote(text)
    setSaving(false)
    if (ok) { setText(''); reload() }
  }

  const handleDelete = async (id) => {
    const ok = await deleteMyNote(id)
    if (ok) reload()
  }

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-6'>{t('navNotes')}</p>

      <form onSubmit={submitNote} className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-6 flex flex-col gap-3'>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('noteTextPlaceholder')} rows={3}
          className='px-4 py-3 rounded-xl bg-bg border border-hairline text-sm' />
        <button type='submit' disabled={saving} className='self-start px-5 py-2 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {t('addNoteBtn')}
        </button>
      </form>

      <div className='flex flex-col gap-3'>
        {(notes || []).map(n => (
          <div key={n._id} className='bg-bg-elevated border border-hairline rounded-xl p-4 flex justify-between items-start gap-3'>
            <div>
              <p className='text-ink text-sm whitespace-pre-wrap'>{n.text}</p>
              <p className='text-muted text-xs mt-1'>{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            <button onClick={() => handleDelete(n._id)} className='px-2.5 py-1 rounded-lg bg-bg border border-hairline text-muted text-xs font-medium flex-shrink-0'>{t('removeBtn')}</button>
          </div>
        ))}
        {notes && notes.length === 0 && <p className='text-muted text-sm'>{t('noNotesYet')}</p>}
        {!notes && <p className='text-muted text-sm'>{t('loading')}</p>}
      </div>
    </div>
  )
}

export default Notes
