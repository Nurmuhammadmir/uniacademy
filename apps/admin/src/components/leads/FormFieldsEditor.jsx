import React from 'react'

const FIELD_TYPES = ['text', 'phone', 'textarea', 'select']

// reusable add/remove/reorder/type/required editor for a LeadForm's `fields` array - used by both
// the form-creation wizard and the full "Edit form" builder opened from a lead's own panel
const FormFieldsEditor = ({ fields, onChange, t }) => {
  const update = (index, patch) => onChange(fields.map((f, i) => i === index ? { ...f, ...patch } : f))

  const remove = (index) => onChange(fields.filter((_, i) => i !== index))

  const move = (index, dir) => {
    const target = index + dir
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const addField = () => {
    const key = 'field_' + Date.now()
    onChange([...fields, { key, label: '', type: 'text', required: false, options: [] }])
  }

  return (
    <div className='flex flex-col gap-2'>
      {fields.map((field, i) => (
        <div key={field.key} className='bg-bg border border-hairline rounded-lg p-2 flex flex-col gap-1.5'>
          <div className='flex gap-1.5 items-center'>
            <div className='flex flex-col'>
              <button type='button' onClick={() => move(i, -1)} disabled={i === 0} className='text-muted text-xs leading-none disabled:opacity-30'>▲</button>
              <button type='button' onClick={() => move(i, 1)} disabled={i === fields.length - 1} className='text-muted text-xs leading-none disabled:opacity-30'>▼</button>
            </div>
            <input value={field.label} onChange={e => update(i, { label: e.target.value })} placeholder={t('fieldLabelPlaceholder')}
              className='flex-1 px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm' />
            <select value={field.type} onChange={e => update(i, { type: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-xs'>
              {FIELD_TYPES.map(ty => <option key={ty} value={ty}>{t('fieldType_' + ty)}</option>)}
            </select>
            <label className='flex items-center gap-1 text-xs text-muted whitespace-nowrap'>
              <input type='checkbox' checked={field.required} onChange={e => update(i, { required: e.target.checked })} />
              {t('requiredLabel')}
            </label>
            <button type='button' onClick={() => remove(i)} className='text-muted text-xl leading-none px-1'>×</button>
          </div>
          {field.type === 'select' && (
            <input value={field.options.join(', ')} onChange={e => update(i, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
              placeholder={t('fieldOptionsPlaceholder')} className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-xs' />
          )}
        </div>
      ))}
      <button type='button' onClick={addField} className='text-accent text-sm font-medium text-left'>+ {t('addFieldBtn')}</button>
    </div>
  )
}

export default FormFieldsEditor
