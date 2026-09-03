import React from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Plus } from 'lucide-react'
import Select from '../Select.jsx'

const FIELD_TYPES = ['text', 'phone', 'textarea', 'select']

const FieldRow = ({ field, index, onUpdate, onRemove, t }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.key })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} className='bg-slate-50/70 border border-slate-200/60 rounded-xl p-3 mb-3 flex flex-col gap-2 transition-colors hover:border-slate-300 dark:bg-[#161F30] dark:border-slate-800/80 dark:hover:border-slate-700'>
      <div className='flex items-center gap-3'>
        <button type='button' {...attributes} {...listeners} className='plain text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing flex-shrink-0'>
          <GripVertical size={16} strokeWidth={1.5} />
        </button>
        <input value={field.label} onChange={e => onUpdate(index, { label: e.target.value })} placeholder={t('fieldLabelPlaceholder')}
          className='flex-1 h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent dark:bg-[#1E293B] dark:border-none dark:text-slate-200 dark:placeholder:text-slate-500' />
        <Select className='w-32' value={field.type} onChange={(v) => onUpdate(index, { type: v })}
          options={FIELD_TYPES.map(ty => ({ value: ty, label: t('fieldType_' + ty) }))} />
        <label className='flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap flex-shrink-0'>
          <input type='checkbox' checked={field.required} onChange={e => onUpdate(index, { required: e.target.checked })}
            className='rounded text-accent focus:ring-accent w-4 h-4' />
          {t('requiredLabel')}
        </label>
        <button type='button' onClick={() => onRemove(index)} className='plain text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-600 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors flex-shrink-0'>
          <X size={15} strokeWidth={1.5} />
        </button>
      </div>
      {field.type === 'select' && (
        <input value={field.options.join(', ')} onChange={e => onUpdate(index, { options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) })}
          placeholder={t('fieldOptionsPlaceholder')} className='ml-7 h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent dark:bg-[#1E293B] dark:border-none dark:text-slate-200 dark:placeholder:text-slate-500' />
      )}
    </div>
  )
}

// reusable add/remove/reorder/type/required editor for a LeadForm's `fields` array - used by both
// the form-creation wizard and the full "Edit form" builder opened from a lead's own panel
const FormFieldsEditor = ({ fields, onChange, t }) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const update = (index, patch) => onChange(fields.map((f, i) => i === index ? { ...f, ...patch } : f))
  const remove = (index) => onChange(fields.filter((_, i) => i !== index))

  const addField = () => {
    const key = 'field_' + Date.now()
    onChange([...fields, { key, label: '', type: 'text', required: false, options: [] }])
  }

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex(f => f.key === active.id)
    const newIndex = fields.findIndex(f => f.key === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(fields, oldIndex, newIndex))
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map(f => f.key)} strategy={verticalListSortingStrategy}>
          {fields.map((field, i) => (
            <FieldRow key={field.key} field={field} index={i} onUpdate={update} onRemove={remove} t={t} />
          ))}
        </SortableContext>
      </DndContext>
      <button type='button' onClick={addField} className='plain text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1.5 mt-2 transition-colors'>
        <Plus size={15} strokeWidth={1.5} /> {t('addFieldBtn')}
      </button>
    </div>
  )
}

export default FormFieldsEditor
