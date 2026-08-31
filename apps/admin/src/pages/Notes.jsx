import React, { useContext, useEffect, useState } from 'react'
import { Calendar, Trash2 } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Spinner from '../components/Spinner.jsx'

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

      <form onSubmit={submitNote} className='max-w-2xl bg-white dark:bg-[#161F30] rounded-2xl border border-slate-200/60 dark:border-slate-800/80 p-5 shadow-sm flex flex-col gap-3'>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t('noteTextPlaceholder')} rows={3}
          className='border-none focus:ring-0 p-0 text-[#1D1D1F] dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-transparent text-sm leading-relaxed resize-none focus:outline-none' />
        <button type='submit' disabled={saving}
          className='bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 rounded-xl px-4 py-2 text-xs font-medium text-white shadow-sm mt-3 ml-auto block transition-colors disabled:opacity-50 flex items-center gap-2'>
          {saving && <Spinner size={14} />} {t('addNoteBtn')}
        </button>
      </form>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8'>
        {(notes || []).map(n => (
          <div key={n._id} className='bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-5 flex flex-col justify-between min-h-[140px]'>
            <p className='text-slate-700 dark:text-slate-300 text-sm font-normal leading-relaxed whitespace-pre-wrap'>{n.text}</p>
            <div className='flex items-center justify-between mt-4 border-t border-slate-50 dark:border-slate-800/80 pt-3'>
              <span className='flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600'>
                <Calendar size={13} strokeWidth={1.5} /> {new Date(n.createdAt).toLocaleString()}
              </span>
              <button onClick={() => handleDelete(n._id)} className='text-slate-400 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors'>
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {notes && notes.length === 0 && <p className='text-muted text-sm mt-8'>{t('noNotesYet')}</p>}
      {!notes && <p className='text-muted text-sm mt-8'>{t('loading')}</p>}
    </div>
  )
}

export default Notes
