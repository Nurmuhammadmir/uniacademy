import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'

const Courses = () => {
  const { languages, getLanguages, createLanguage, updateLanguage, deleteLanguage, levels, getLevels, createLevel, updateLevel, deleteLevel } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState(null)
  const [languageForm, setLanguageForm] = useState({ code: '', name: '' })

  const [addingLevelFor, setAddingLevelFor] = useState(null)
  const [editingLevel, setEditingLevel] = useState(null)
  const [levelForm, setLevelForm] = useState({ name: '', order: 0, durationDays: 300 })

  useEffect(() => { getLevels() }, [])

  const submitLanguage = async (e) => {
    e.preventDefault()
    const ok = editingLanguage
      ? await updateLanguage(editingLanguage._id, languageForm)
      : await createLanguage(languageForm)
    if (ok) { setShowAddLanguage(false); setEditingLanguage(null); setLanguageForm({ code: '', name: '' }) }
  }

  const openEditLanguage = (language) => {
    setEditingLanguage(language)
    setLanguageForm({ code: language.code, name: language.name })
    setShowAddLanguage(true)
  }

  const submitLevel = async (e) => {
    e.preventDefault()
    if (editingLevel) {
      const ok = await updateLevel(editingLevel._id, levelForm, editingLevel.languageId)
      if (ok) { setEditingLevel(null); setLevelForm({ name: '', order: 0, durationDays: 300 }) }
    } else {
      const ok = await createLevel({ languageId: addingLevelFor, ...levelForm })
      if (ok) { setAddingLevelFor(null); setLevelForm({ name: '', order: 0, durationDays: 300 }) }
    }
  }

  const openEditLevel = (level, languageId) => {
    setEditingLevel({ ...level, languageId })
    setLevelForm({ name: level.name, order: level.order, durationDays: level.durationDays || 300 })
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <p className='font-display text-2xl text-ink'>{t('coursesTitle')}</p>
        <button onClick={() => { setEditingLanguage(null); setLanguageForm({ code: '', name: '' }); setShowAddLanguage(true) }} className='px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium'>
          {t('addLanguage')}
        </button>
      </div>

      <div className='flex flex-col gap-4'>
        {languages.map(lang => (
          <div key={lang._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <div className='flex justify-between items-center mb-3'>
              <div>
                <p className='text-ink font-medium'>{lang.name}</p>
                <p className='text-muted text-xs font-mono'>{lang.code}</p>
              </div>
              <div className='flex gap-3'>
                <button onClick={() => openEditLanguage(lang)} className='text-accent text-xs font-medium'>{t('edit')}</button>
                <button onClick={() => { setAddingLevelFor(lang._id); setLevelForm({ name: '', order: (levels.filter(l => l.languageId === lang._id).length), durationDays: 300 }) }} className='text-accent text-xs font-medium'>{t('addLevel')}</button>
                <button onClick={() => deleteLanguage(lang._id)} className='text-red-500 text-xs font-medium'>{t('delete')}</button>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              {levels.filter(l => l.languageId === lang._id).sort((a, b) => a.order - b.order).map(level => (
                <button key={level._id} onClick={() => openEditLevel(level, lang._id)} className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-sm text-ink hover:border-accent'>
                  {level.name} <span className='text-muted font-mono text-xs'>#{level.order} · {level.durationDays || 300}d</span>
                </button>
              ))}
              {levels.filter(l => l.languageId === lang._id).length === 0 && <p className='text-muted text-sm'>{t('noLevelsYet')}</p>}
            </div>

            {addingLevelFor === lang._id && (
              <form onSubmit={submitLevel} className='flex gap-2 items-end mt-3 pt-3 border-t border-hairline'>
                <input placeholder={t('levelName')} value={levelForm.name} onChange={e => setLevelForm({ ...levelForm, name: e.target.value })}
                  className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                <input placeholder={t('order')} type='number' value={levelForm.order} onChange={e => setLevelForm({ ...levelForm, order: Number(e.target.value) })}
                  className='w-20 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                <input placeholder={t('days')} type='number' min='1' max='300' title={t('durationHint')} value={levelForm.durationDays} onChange={e => setLevelForm({ ...levelForm, durationDays: Number(e.target.value) })}
                  className='w-20 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('add')}</button>
                <button type='button' onClick={() => setAddingLevelFor(null)} className='px-3 py-2 text-muted text-sm'>{t('cancel')}</button>
              </form>
            )}
          </div>
        ))}
        {languages.length === 0 && <p className='text-muted'>{t('noCoursesYet')}</p>}
      </div>

      {showAddLanguage && (
        <Modal title={editingLanguage ? t('editX', { name: editingLanguage.name }) : t('addLanguageTitle')} onClose={() => { setShowAddLanguage(false); setEditingLanguage(null) }}>
          <form onSubmit={submitLanguage} className='flex flex-col gap-3'>
            <input placeholder={t('languageName')} value={languageForm.name} onChange={e => setLanguageForm({ ...languageForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('languageCode')} value={languageForm.code} onChange={e => setLanguageForm({ ...languageForm, code: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{editingLanguage ? t('saveChanges') : t('addLanguageTitle')}</button>
          </form>
        </Modal>
      )}

      {editingLevel && (
        <Modal title={t('editX', { name: editingLevel.name })} onClose={() => setEditingLevel(null)}>
          <form onSubmit={submitLevel} className='flex flex-col gap-3'>
            <input placeholder={t('levelName')} value={levelForm.name} onChange={e => setLevelForm({ ...levelForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('order')} type='number' value={levelForm.order} onChange={e => setLevelForm({ ...levelForm, order: Number(e.target.value) })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <p className='text-xs text-muted'>{t('orderHint')}</p>
            <label className='text-xs text-muted -mb-1'>{t('durationHomeworkDays')}</label>
            <input placeholder={t('durationInDays')} type='number' min='1' max='300' value={levelForm.durationDays} onChange={e => setLevelForm({ ...levelForm, durationDays: Number(e.target.value) })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <p className='text-xs text-muted'>{t('durationHintLong')}</p>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{t('saveChanges')}</button>
            <button type='button'
              onClick={async () => { const ok = await deleteLevel(editingLevel._id, editingLevel.languageId); if (ok) setEditingLevel(null) }}
              className='py-2 text-red-500 text-sm font-medium'>
              {t('deleteLevelBtn')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Courses
