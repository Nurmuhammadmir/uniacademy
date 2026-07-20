import React, { useContext, useEffect, useState } from 'react'
import { AdminContext } from '../../context/AdminContext.jsx'
import Modal from '../Modal.jsx'
import FormFieldsEditor from './FormFieldsEditor.jsx'

const DEFAULT_FIELDS = [
  { key: 'name', label: 'Ism va Familiya', type: 'text', required: true, options: [] },
  { key: 'phone', label: 'Telefon', type: 'phone', required: true, options: [] },
  { key: 'comment', label: 'Izoh', type: 'textarea', required: false, options: [] },
]

// doubles as both the "+ Form" creation wizard (formId omitted) and the full "Edit form" builder
// opened from a lead's own panel (formId provided) - same fields, same save action either way
const FormModal = ({ formId, defaultColumnId, columns, subgroups, onClose, onSaved, t }) => {
  const { leadSources, createLeadSource, getLeadForm, createLeadForm, updateLeadForm } = useContext(AdminContext)

  const [loaded, setLoaded] = useState(!formId)
  const [sourceName, setSourceName] = useState('')
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?._id || '')
  const [subgroupId, setSubgroupId] = useState('')
  const [fields, setFields] = useState(DEFAULT_FIELDS)
  const [slug, setSlug] = useState('')
  const [addingSource, setAddingSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!formId) return
    getLeadForm(formId).then(form => {
      if (!form) return
      setSourceName(form.sourceName); setColumnId(form.columnId); setSubgroupId(form.subgroupId || '')
      setFields(form.fields); setSlug(form.slug); setLoaded(true)
    })
  }, [formId])

  const columnSubgroups = subgroups.filter(s => String(s.columnId) === String(columnId))

  const submitNewSource = async (e) => {
    e.preventDefault()
    if (!newSourceName.trim()) return
    const ok = await createLeadSource({ name: newSourceName.trim() })
    if (ok) { setSourceName(newSourceName.trim()); setNewSourceName(''); setAddingSource(false) }
  }

  const save = async (e) => {
    e.preventDefault()
    const payload = { columnId, subgroupId: subgroupId || null, sourceName, fields }
    if (formId) {
      const form = await updateLeadForm(formId, payload)
      if (form) onSaved(form)
    } else {
      const form = await createLeadForm(payload)
      if (form) { setSlug(form.slug); onSaved(form) }
    }
  }

  const publicUrl = slug ? `${window.location.origin}/forms/${slug}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!loaded) return <Modal title={t('formWizardTitle')} onClose={onClose}><p className='text-muted text-sm'>{t('loading')}</p></Modal>

  return (
    <Modal title={formId ? t('editFormTitle') : t('formWizardTitle')} onClose={onClose} wide>
      <form onSubmit={save} className='flex flex-col gap-3'>
        <div>
          <p className='text-xs text-muted mb-1'>{t('formSourceLabel')}</p>
          {addingSource ? (
            <form onSubmit={submitNewSource} className='flex gap-2'>
              <input autoFocus value={newSourceName} onChange={e => setNewSourceName(e.target.value)} placeholder={t('sourceNamePlaceholder')}
                className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              <button type='submit' className='px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('add')}</button>
            </form>
          ) : (
            <div className='flex gap-2'>
              <select value={sourceName} onChange={e => setSourceName(e.target.value)} className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
                <option value=''>{t('selectOption')}</option>
                {leadSources.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
              <button type='button' onClick={() => setAddingSource(true)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-accent text-sm font-medium'>+ {t('addSourceBtn')}</button>
            </div>
          )}
        </div>

        <div className='flex gap-3'>
          <div className='flex-1'>
            <p className='text-xs text-muted mb-1'>{t('formColumnLabel')}</p>
            <select value={columnId} onChange={e => { setColumnId(e.target.value); setSubgroupId('') }} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
              {columns.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className='flex-1'>
            <p className='text-xs text-muted mb-1'>{t('formSubgroupLabel')}</p>
            <select value={subgroupId} onChange={e => setSubgroupId(e.target.value)} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
              <option value=''>{t('generalBucketLabel')}</option>
              {columnSubgroups.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <p className='text-xs text-muted mb-1'>{t('formFieldsLabel')}</p>
          <FormFieldsEditor fields={fields} onChange={setFields} t={t} />
        </div>

        <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>

        {slug && (
          <div className='bg-bg border border-hairline rounded-lg p-3 flex items-center gap-2'>
            <input readOnly value={publicUrl} className='flex-1 px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-xs font-mono' />
            <button type='button' onClick={copyLink} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-xs font-medium whitespace-nowrap'>
              {copied ? t('copiedHint') : t('copyLinkBtn')}
            </button>
          </div>
        )}
      </form>
    </Modal>
  )
}

export default FormModal
