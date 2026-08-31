import React, { useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link as LinkIcon, Copy, Plus } from 'lucide-react'
import { AdminContext } from '../../context/AdminContext.jsx'
import Modal from '../Modal.jsx'
import Select from '../Select.jsx'
import FormFieldsEditor from './FormFieldsEditor.jsx'

const DEFAULT_FIELDS = [
  { key: 'name', label: 'Ism va Familiya', type: 'text', required: true, options: [] },
  { key: 'phone', label: 'Telefon', type: 'phone', required: true, options: [] },
  { key: 'comment', label: 'Izoh', type: 'textarea', required: false, options: [] },
]
const LABEL = 'text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1 block'
const FIELD = 'w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent dark:bg-[#1E293B] dark:border-none dark:text-slate-200 dark:placeholder:text-slate-500'

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
    if (!sourceName || !columnId) { toast.error(t('selectSourceRequiredWarning')); return }
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
          <label className={LABEL}>{t('formSourceLabel')}</label>
          {addingSource ? (
            <form onSubmit={submitNewSource} className='flex gap-2'>
              <input autoFocus value={newSourceName} onChange={e => setNewSourceName(e.target.value)} placeholder={t('sourceNamePlaceholder')} className={FIELD} />
              <button type='submit' className='h-10 px-3 rounded-lg bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-white text-sm font-medium flex-shrink-0'>{t('add')}</button>
            </form>
          ) : (
            <div className='flex gap-2'>
              <Select className='flex-1' value={sourceName} onChange={setSourceName} placeholder={t('selectOption')}
                options={leadSources.map(s => ({ value: s.name, label: s.name }))} />
              <button type='button' onClick={() => setAddingSource(true)}
                className='h-10 px-3 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none text-sm font-medium flex items-center justify-center gap-1.5 flex-shrink-0 transition-colors'>
                <Plus size={14} strokeWidth={1.5} /> {t('addSourceBtn')}
              </button>
            </div>
          )}
        </div>

        <div className='flex gap-3'>
          <div className='flex-1'>
            <label className={LABEL}>{t('formColumnLabel')}</label>
            <Select value={columnId} onChange={(v) => { setColumnId(v); setSubgroupId('') }}
              options={columns.map(c => ({ value: c._id, label: c.name }))} />
          </div>
          <div className='flex-1'>
            <label className={LABEL}>{t('formSubgroupLabel')}</label>
            <Select value={subgroupId} onChange={setSubgroupId} placeholder={t('generalBucketLabel')}
              options={[{ value: '', label: t('generalBucketLabel') }, ...columnSubgroups.map(s => ({ value: s._id, label: s.name }))]} />
          </div>
        </div>

        <div>
          <label className={LABEL}>{t('formFieldsLabel')}</label>
          <FormFieldsEditor fields={fields} onChange={setFields} t={t} />
        </div>

        {slug ? (
          <div className='border-t border-slate-100 dark:border-slate-800/80 pt-5 mt-2 flex items-center gap-2'>
            <div className='flex-1 relative'>
              <LinkIcon size={14} strokeWidth={1.5} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600' />
              <input readOnly value={publicUrl} className='w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 dark:bg-[#1E293B] dark:border-none dark:text-slate-200' />
            </div>
            <button type='button' onClick={copyLink}
              className='h-10 px-3 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none text-xs font-medium flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 transition-colors'>
              <Copy size={13} strokeWidth={1.5} /> {copied ? t('copiedHint') : t('copyLinkBtn')}
            </button>
            <button type='submit' className='h-10 px-5 rounded-xl bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-white text-sm font-medium flex-shrink-0 transition-colors'>{t('save')}</button>
          </div>
        ) : (
          <button type='submit' className='py-2.5 rounded-xl bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-white text-sm font-medium transition-colors'>{t('save')}</button>
        )}
      </form>
    </Modal>
  )
}

export default FormModal
