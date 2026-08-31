import React, { useContext, useEffect, useMemo, useState } from 'react'
import { SubDirectorContext } from '../context/SubDirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import Modal from '../components/Modal.jsx'
import { X, Pencil, Check, Search, Plus } from 'lucide-react'

const Courses = () => {
  const {
    languages, getLanguages, createLanguage, updateLanguage, deleteLanguage, levels, getLevels, createLevel, updateLevel, deleteLevel,
    pricing, getPricing, upsertPricing,
    courseCategories, getCourseCategories, createCourseCategory, updateCourseCategory, deleteCourseCategory,
  } = useContext(SubDirectorContext)
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showAddLanguage, setShowAddLanguage] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState(null)
  const [languageForm, setLanguageForm] = useState({ code: '', name: '', categoryIds: [] })
  const [showManageTags, setShowManageTags] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [editingTagId, setEditingTagId] = useState(null)
  const [editingTagName, setEditingTagName] = useState('')

  const [addingLevelFor, setAddingLevelFor] = useState(null)
  const [editingLevel, setEditingLevel] = useState(null)
  const [levelForm, setLevelForm] = useState({ name: '', order: 0, durationDays: 300, hasReading: true })

  // price is set per COURSE (per language), not per level (see server/models/Pricing.js) - editable
  // right here alongside the course itself instead of only on the separate Pricing page. Keyed by
  // languageId so each course card's input is independent; starts empty (falls back to the
  // already-saved price as a placeholder) so an untouched input never re-submits a stale value.
  const [priceDrafts, setPriceDrafts] = useState({})

  useEffect(() => { getLevels(); getPricing(); getCourseCategories() }, [])

  const priceFor = (languageId) => pricing.find(p => String(p.languageId?._id || p.languageId) === String(languageId))?.monthlyPrice ?? null

  const savePrice = async (languageId) => {
    const draft = priceDrafts[languageId]
    if (draft === undefined || draft === '') return
    const ok = await upsertPricing({ languageId, monthlyPrice: Number(draft) })
    if (ok) setPriceDrafts({ ...priceDrafts, [languageId]: undefined })
  }

  const submitLanguage = async (e) => {
    e.preventDefault()
    const ok = editingLanguage
      ? await updateLanguage(editingLanguage._id, languageForm)
      : await createLanguage(languageForm)
    if (ok) { setShowAddLanguage(false); setEditingLanguage(null); setLanguageForm({ code: '', name: '', categoryIds: [] }) }
  }

  const openEditLanguage = (language) => {
    setEditingLanguage(language)
    setLanguageForm({ code: language.code, name: language.name, categoryIds: (language.categoryIds || []).map(c => c._id || c) })
    setShowAddLanguage(true)
  }

  const toggleFormCategory = (id) => {
    setLanguageForm(f => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter(c => c !== id) : [...f.categoryIds, id],
    }))
  }

  const submitNewTag = async (e) => {
    e.preventDefault()
    if (!newTagName.trim()) return
    const ok = await createCourseCategory(newTagName.trim())
    if (ok) setNewTagName('')
  }

  const startEditTag = (tag) => { setEditingTagId(tag._id); setEditingTagName(tag.name) }

  const saveEditTag = async (id) => {
    if (!editingTagName.trim()) return
    const ok = await updateCourseCategory(id, editingTagName.trim())
    if (ok) { setEditingTagId(null); setEditingTagName('') }
  }

  const submitLevel = async (e) => {
    e.preventDefault()
    if (editingLevel) {
      const ok = await updateLevel(editingLevel._id, levelForm, editingLevel.languageId)
      if (ok) { setEditingLevel(null); setLevelForm({ name: '', order: 0, durationDays: 300, hasReading: true }) }
    } else {
      const ok = await createLevel({ languageId: addingLevelFor, ...levelForm })
      if (ok) { setAddingLevelFor(null); setLevelForm({ name: '', order: 0, durationDays: 300, hasReading: true }) }
    }
  }

  const openEditLevel = (level, languageId) => {
    setEditingLevel({ ...level, languageId })
    setLevelForm({ name: level.name, order: level.order, durationDays: level.durationDays || 300, hasReading: level.hasReading !== false })
  }

  // search by name/code, narrow further by tag - once a branch runs dozens of courses, scrolling
  // one flat list stops being practical
  const visibleLanguages = useMemo(() => {
    const q = search.trim().toLowerCase()
    return languages.filter(lang => {
      if (q && !lang.name.toLowerCase().includes(q) && !lang.code.toLowerCase().includes(q)) return false
      if (tagFilter && !(lang.categoryIds || []).some(c => (c._id || c) === tagFilter)) return false
      return true
    })
  }, [languages, search, tagFilter])

  return (
    <div>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5'>
        <div>
          <p className='font-display text-2xl text-ink'>{t('coursesTitle')}</p>
          <p className='text-muted text-sm mt-0.5'>{t('coursesCountLabel', { count: visibleLanguages.length })}</p>
        </div>
        <div className='flex gap-2'>
          <button onClick={() => setShowManageTags(true)} className='px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-ink text-sm font-medium'>
            {t('manageTagsTitle')}
          </button>
          <button onClick={() => { setEditingLanguage(null); setLanguageForm({ code: '', name: '', categoryIds: [] }); setShowAddLanguage(true) }}
            className='flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium'>
            <Plus size={15} strokeWidth={2} /> {t('addLanguage')}
          </button>
        </div>
      </div>

      <div className='flex flex-wrap gap-3 mb-5'>
        <div className='relative flex-1 min-w-[10rem] max-w-sm'>
          <Search size={15} strokeWidth={1.75} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-muted' />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchCoursesPlaceholder')}
            className='w-full pl-9 pr-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm' />
        </div>
        {courseCategories.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className='w-48 px-3 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm'>
            <option value=''>{t('allCategoriesOption')}</option>
            {courseCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
        {(search || tagFilter) && (
          <button onClick={() => { setSearch(''); setTagFilter('') }} className='text-muted text-sm'>{t('clear')}</button>
        )}
      </div>

      <div className='flex flex-col gap-3'>
        {visibleLanguages.map(lang => (
          <div key={lang._id} className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3'>
              <div className='min-w-0'>
                <div className='flex items-baseline gap-2 flex-wrap'>
                  <p className='text-ink font-semibold text-base'>{lang.name}</p>
                  <span className='text-muted text-xs font-mono'>{lang.code}</span>
                </div>
                {(lang.categoryIds || []).length > 0 && (
                  <div className='flex flex-wrap gap-1.5 mt-2'>
                    {lang.categoryIds.map(c => (
                      <span key={c._id} className='text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-soft text-accent'>{c.name}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className='flex gap-4 flex-shrink-0'>
                <button onClick={() => openEditLanguage(lang)} className='text-accent text-xs font-medium'>{t('edit')}</button>
                <button onClick={() => { setAddingLevelFor(lang._id); setLevelForm({ name: '', order: (levels.filter(l => l.languageId === lang._id).length), durationDays: 300, hasReading: true }) }} className='text-accent text-xs font-medium'>{t('addLevel')}</button>
                <button onClick={() => deleteLanguage(lang._id)} className='text-red-500 text-xs font-medium'>{t('delete')}</button>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-hairline'>
              <p className='text-xs text-muted flex-shrink-0'>{t('monthlyPrice')}</p>
              <input type='number' min='0'
                value={priceDrafts[lang._id] ?? (priceFor(lang._id) ?? '')}
                onChange={e => setPriceDrafts({ ...priceDrafts, [lang._id]: e.target.value })}
                placeholder={t('notSetYet')}
                className='w-32 px-2.5 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
              {priceDrafts[lang._id] !== undefined && priceDrafts[lang._id] !== String(priceFor(lang._id) ?? '') && (
                <button onClick={() => savePrice(lang._id)} className='text-accent text-xs font-medium'>{t('save')}</button>
              )}
              {priceFor(lang._id) != null && priceDrafts[lang._id] === undefined && (
                <span className='text-muted text-xs font-mono'>({formatMoney(priceFor(lang._id))})</span>
              )}
            </div>

            <div className='mt-4 pt-4 border-t border-hairline'>
              <div className='flex flex-wrap gap-2'>
                {levels.filter(l => l.languageId === lang._id).sort((a, b) => a.order - b.order).map(level => (
                  <button key={level._id} onClick={() => openEditLevel(level, lang._id)}
                    className='px-3 py-1.5 rounded-lg bg-bg border border-hairline text-sm text-ink hover:border-accent transition-colors'>
                    {level.name} <span className='text-muted font-mono text-xs'>· {level.durationDays || 300} {t('lessonsSuffix')}</span>
                  </button>
                ))}
                {levels.filter(l => l.languageId === lang._id).length === 0 && <p className='text-muted text-sm'>{t('noLevelsYet')}</p>}
              </div>
            </div>

            {addingLevelFor === lang._id && (
              <form onSubmit={submitLevel} className='mt-4 pt-4 border-t border-hairline flex flex-col gap-3'>
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                  <input placeholder={t('levelName')} value={levelForm.name} onChange={e => setLevelForm({ ...levelForm, name: e.target.value })}
                    className='col-span-2 sm:col-span-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                  <input placeholder={t('order')} type='number' value={levelForm.order} onChange={e => setLevelForm({ ...levelForm, order: Number(e.target.value) })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                  <input placeholder={t('days')} type='number' min='1' max='300' title={t('durationHint')} value={levelForm.durationDays} onChange={e => setLevelForm({ ...levelForm, durationDays: Number(e.target.value) })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                  <label className='flex items-center gap-1.5 text-xs text-muted whitespace-nowrap px-1'>
                    <input type='checkbox' checked={levelForm.hasReading} onChange={e => setLevelForm({ ...levelForm, hasReading: e.target.checked })} />
                    {t('hasReadingLabel')}
                  </label>
                </div>
                <div className='flex gap-2'>
                  <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('add')}</button>
                  <button type='button' onClick={() => setAddingLevelFor(null)} className='px-3 py-2 text-muted text-sm'>{t('cancel')}</button>
                </div>
              </form>
            )}
          </div>
        ))}
        {visibleLanguages.length === 0 && (
          <p className='text-muted text-sm text-center py-10'>{languages.length === 0 ? t('noCoursesYet') : t('noCoursesMatchFilters')}</p>
        )}
      </div>

      {showAddLanguage && (
        <Modal title={editingLanguage ? t('editX', { name: editingLanguage.name }) : t('addLanguageTitle')} onClose={() => { setShowAddLanguage(false); setEditingLanguage(null) }}>
          <form onSubmit={submitLanguage} className='flex flex-col gap-3'>
            <input placeholder={t('languageName')} value={languageForm.name} onChange={e => setLanguageForm({ ...languageForm, name: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <input placeholder={t('languageCode')} value={languageForm.code} onChange={e => setLanguageForm({ ...languageForm, code: e.target.value })}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <div>
              <p className='text-xs text-muted mb-1.5'>{t('courseTagsLabel')}</p>
              <div className='flex flex-wrap gap-1.5'>
                {courseCategories.map(c => {
                  const active = languageForm.categoryIds.includes(c._id)
                  return (
                    <button key={c._id} type='button' onClick={() => toggleFormCategory(c._id)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-accent text-white border-accent' : 'bg-bg border-hairline text-ink hover:border-accent'}`}>
                      {c.name}
                    </button>
                  )
                })}
                {courseCategories.length === 0 && <p className='text-muted text-xs'>{t('noTagsYetHint')}</p>}
              </div>
              <p className='text-xs text-muted mt-1.5'>{t('courseTagsHint')}</p>
            </div>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium'>{editingLanguage ? t('saveChanges') : t('addLanguageTitle')}</button>
          </form>
        </Modal>
      )}

      {showManageTags && (
        <Modal title={t('manageTagsTitle')} onClose={() => { setShowManageTags(false); setEditingTagId(null) }}>
          <div className='flex flex-col gap-2 mb-4'>
            {courseCategories.map(c => (
              <div key={c._id} className='flex items-center gap-2 px-3 py-2 rounded-xl bg-bg border border-hairline'>
                {editingTagId === c._id ? (
                  <>
                    <input autoFocus value={editingTagName} onChange={e => setEditingTagName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEditTag(c._id)}
                      className='flex-1 px-2 py-1 rounded-lg bg-bg-elevated border border-hairline text-sm' />
                    <button onClick={() => saveEditTag(c._id)} className='text-accent p-1'><Check size={16} /></button>
                    <button onClick={() => setEditingTagId(null)} className='text-muted p-1'><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <p className='flex-1 text-sm text-ink'>{c.name}</p>
                    <button onClick={() => startEditTag(c)} className='text-muted hover:text-accent p-1'><Pencil size={14} /></button>
                    <button onClick={() => deleteCourseCategory(c._id)} className='text-muted hover:text-red-500 p-1'><X size={16} /></button>
                  </>
                )}
              </div>
            ))}
            {courseCategories.length === 0 && <p className='text-muted text-sm'>{t('noTagsYetHint')}</p>}
          </div>
          <form onSubmit={submitNewTag} className='flex gap-2'>
            <input placeholder={t('addTagPlaceholder')} value={newTagName} onChange={e => setNewTagName(e.target.value)}
              className='flex-1 px-4 py-2.5 rounded-xl bg-bg border border-hairline text-sm' />
            <button type='submit' className='px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium'>{t('add')}</button>
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
            <label className='flex items-center gap-2 text-sm text-ink'>
              <input type='checkbox' checked={levelForm.hasReading} onChange={e => setLevelForm({ ...levelForm, hasReading: e.target.checked })} />
              {t('hasReadingLabel')}
            </label>
            <p className='text-xs text-muted -mt-2'>{t('hasReadingHint')}</p>
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
