import React, { useContext, useEffect, useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import SourceManagerModal from '../components/leads/SourceManagerModal.jsx'
import AutoIntakeModal from '../components/leads/AutoIntakeModal.jsx'
import FormModal from '../components/leads/FormModal.jsx'

const GENERAL = 'general'

const bucketKey = (columnId, subgroupId) => `bucket-${columnId}-${subgroupId || GENERAL}`

const LeadCard = ({ lead, columnId, subgroupId, sources, onSave, onDelete, onEditForm, t }) => {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: lead.name, phone: lead.phone, source: lead.source, comment: lead.comment })
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'lead-' + lead._id, data: { type: 'lead', leadId: lead._id, columnId, subgroupId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const save = async (e) => {
    e.preventDefault()
    const ok = await onSave(lead._id, form)
    if (ok) setOpen(false)
  }

  return (
    <div ref={setNodeRef} style={style} className='bg-bg border border-hairline rounded-lg p-4 mb-4'>
      <div className='flex items-start gap-2'>
        <button {...attributes} {...listeners} className='plain text-muted cursor-grab pt-0.5 text-lg leading-none'>⠿</button>
        <button onClick={() => setOpen(o => !o)} className='plain flex-1 text-left'>
          <p className='text-ink text-sm font-medium'>{lead.name}</p>
          <p className='text-muted text-xs font-mono'>{lead.phone}</p>
          <span className='inline-block mt-1 text-xs px-3 py-1.5 rounded-full bg-accent-soft text-accent'>{lead.source}</span>
        </button>
      </div>
      {open && (
        <form onSubmit={save} className='mt-2 flex flex-col gap-2'>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('leadNamePlaceholder')}
            className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm' required />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('leadPhonePlaceholder')}
            className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm' required />
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm'>
            {sources.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
          </select>
          <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder={t('commentPlaceholder')}
            className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm' rows={2} />
          {lead.answers && Object.keys(lead.answers).length > 0 && (
            <div className='bg-bg-elevated border border-hairline rounded-lg p-2 flex flex-col gap-1'>
              {Object.entries(lead.answers).map(([k, v]) => (
                <p key={k} className='text-xs text-muted'><span className='text-ink'>{k}:</span> {String(v)}</p>
              ))}
            </div>
          )}
          <div className='flex gap-2'>
            <button type='submit' className='flex-1 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('sendBtn')}</button>
            <button type='button' onClick={() => onDelete(lead._id)} className='px-3 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-muted text-xs'>{t('removeBtn')}</button>
          </div>
          {lead.formId && (
            <button type='button' onClick={() => onEditForm(lead.formId)} className='text-accent text-xs font-medium text-left'>{t('editFormBtn')}</button>
          )}
        </form>
      )}
    </div>
  )
}

const Bucket = ({ columnId, subgroupId, leads, locked, sources, t, onSaveLead, onDeleteLead, onAddLead, onEditForm }) => {
  const { setNodeRef } = useDroppable({ id: bucketKey(columnId, subgroupId), data: { type: 'bucket', columnId, subgroupId } })
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', source: sources[0]?.name || 'Other', comment: '' })

  const submitAdd = async (e) => {
    e.preventDefault()
    const ok = await onAddLead(columnId, subgroupId, form)
    if (ok) { setForm({ name: '', phone: '', source: sources[0]?.name || 'Other', comment: '' }); setAdding(false) }
  }

  return (
    <div ref={setNodeRef} className='min-h-[40px]'>
      <SortableContext items={leads.map(l => 'lead-' + l._id)} strategy={verticalListSortingStrategy}>
        {leads.map(lead => (
          <LeadCard key={lead._id} lead={lead} columnId={columnId} subgroupId={subgroupId} sources={sources}
            onSave={onSaveLead} onDelete={onDeleteLead} onEditForm={onEditForm} t={t} />
        ))}
      </SortableContext>
      {!locked && (adding ? (
        <form onSubmit={submitAdd} className='bg-bg border border-hairline rounded-xl p-3 mb-2 flex flex-col gap-2'>
          <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('leadNamePlaceholder')}
            className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm' required />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('leadPhonePlaceholder')}
            className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm' required />
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className='px-2 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-sm'>
            {sources.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
          </select>
          <div className='flex gap-2'>
            <button type='submit' className='flex-1 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
            <button type='button' onClick={() => setAdding(false)} className='px-3 py-1.5 rounded-lg bg-bg-elevated border border-hairline text-muted text-xs'>{t('cancel')}</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className='w-full text-left text-muted text-sm px-3 py-2.5 hover:text-accent'>+ {t('addLeadBtn')}</button>
      ))}
    </div>
  )
}

const SubgroupBlock = ({ subgroup, columnId, leads, locked, t, onRename, onDelete, onOpenAutoIntake, ...rest }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: 'subgroup-' + subgroup._id, data: { type: 'subgroup', columnId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(subgroup.name)

  const saveName = async () => {
    setEditingName(false)
    if (name.trim() && name !== subgroup.name) await onRename(subgroup._id, name.trim())
  }

  return (
    <div ref={setNodeRef} style={style} className='mb-3'>
      <div className='flex items-center gap-1.5 mb-1 px-2 py-1.5 bg-bg rounded-lg'>
        <button {...attributes} {...listeners} className='plain text-muted cursor-grab text-base leading-none'>⠿</button>
        {editingName ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className='flex-1 px-2 py-1 rounded-lg bg-bg-elevated border border-hairline text-xs font-medium' />
        ) : (
          <button onClick={() => setEditingName(true)} className='plain flex-1 text-left text-muted text-xs font-medium px-2 py-1'>{subgroup.name} · {leads.length}</button>
        )}
        {!locked && (
          <>
            <button onClick={() => onOpenAutoIntake(subgroup)} title={t('autoIntakeBtn')} className='plain text-muted text-base leading-none px-1'>⋮</button>
            <button onClick={() => onDelete(subgroup._id)} className='plain text-muted text-lg leading-none px-1'>×</button>
          </>
        )}
      </div>
      <Bucket columnId={columnId} subgroupId={subgroup._id} leads={leads} locked={locked} t={t} {...rest} />
    </div>
  )
}

const Column = ({
  column, subgroups, leads, sources, t, onRename, onToggleLock, onDelete, onAddSubgroup, onRenameSubgroup, onDeleteSubgroup,
  onOpenAutoIntake, onOpenFormWizard, ...rest
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: 'column-' + column._id, data: { type: 'column' },
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(column.name)
  const [addingSubgroup, setAddingSubgroup] = useState(false)
  const [subgroupName, setSubgroupName] = useState('')

  const generalLeads = leads.filter(l => !l.subgroupId).sort((a, b) => a.order - b.order)
  const totalCount = leads.length

  const saveName = async () => {
    setEditingName(false)
    if (name.trim() && name !== column.name) await onRename(column._id, name.trim())
  }

  const submitSubgroup = async (e) => {
    e.preventDefault()
    if (!subgroupName.trim()) return
    await onAddSubgroup(column._id, subgroupName.trim())
    setSubgroupName(''); setAddingSubgroup(false)
  }

  return (
    <div ref={setNodeRef} style={style} className='bg-bg-elevated border border-hairline rounded-2xl p-4 w-72 flex-shrink-0 flex flex-col max-h-[75vh]'>
      <div className='flex items-center gap-1.5 mb-3 px-2 py-1.5 bg-bg rounded-lg'>
        <button {...attributes} {...listeners} className='plain text-muted cursor-grab text-xl leading-none'>⠿⠿</button>
        {editingName ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className='flex-1 px-2 py-1 rounded-lg bg-bg-elevated border border-hairline text-sm font-medium' />
        ) : (
          <button onClick={() => setEditingName(true)} className='plain flex-1 text-left text-ink font-medium text-sm px-1 py-0.5'>{column.name}</button>
        )}
        <span className='text-xs text-muted font-mono px-1'>{totalCount}</span>
        <button onClick={() => onOpenFormWizard(column._id)} title={t('addFormBtn')} className='plain text-muted text-lg leading-none px-1'>📝</button>
        <button onClick={() => onToggleLock(column._id, !column.locked)} title={column.locked ? t('unlockColumnHint') : t('lockColumnHint')} className='plain text-lg leading-none px-1'>
          {column.locked ? '🔒' : '🔓'}
        </button>
        <button onClick={() => onDelete(column._id)} className='plain text-lg leading-none px-1'>🗑️</button>
      </div>

      <div className='overflow-y-auto flex-1'>
        {subgroups.length > 0 && generalLeads.length > 0 && (
          <div className='mb-3'>
            <p className='text-muted text-xs font-medium mb-1'>{t('generalBucketLabel')}</p>
            <Bucket columnId={column._id} subgroupId={null} leads={generalLeads} locked={column.locked} sources={sources} t={t} {...rest} />
          </div>
        )}
        {subgroups.length === 0 && (
          <Bucket columnId={column._id} subgroupId={null} leads={generalLeads} locked={column.locked} sources={sources} t={t} {...rest} />
        )}

        <SortableContext items={subgroups.map(s => 'subgroup-' + s._id)} strategy={verticalListSortingStrategy}>
          {subgroups.map(sg => (
            <SubgroupBlock key={sg._id} subgroup={sg} columnId={column._id}
              leads={leads.filter(l => String(l.subgroupId) === String(sg._id)).sort((a, b) => a.order - b.order)}
              locked={column.locked} sources={sources} t={t} onRename={onRenameSubgroup} onDelete={onDeleteSubgroup}
              onOpenAutoIntake={onOpenAutoIntake} {...rest} />
          ))}
        </SortableContext>
      </div>

      {!column.locked && (
        addingSubgroup ? (
          <form onSubmit={submitSubgroup} className='flex gap-2 mt-2'>
            <input autoFocus value={subgroupName} onChange={e => setSubgroupName(e.target.value)} placeholder={t('subgroupNamePlaceholder')}
              className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs' />
            <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs'>{t('add')}</button>
          </form>
        ) : (
          <button onClick={() => setAddingSubgroup(true)} className='mt-2 w-full text-left text-muted text-xs px-3 py-2 hover:text-accent'>+ {t('addSubgroupBtn')}</button>
        )
      )}
    </div>
  )
}

const Leads = () => {
  const {
    getLeadsBoard, createLeadColumn, updateLeadColumn, deleteLeadColumn,
    createLeadSubgroup, updateLeadSubgroup, deleteLeadSubgroup,
    createLead, updateLead, deleteLead, leadSources, getLeadSources,
  } = useContext(AdminContext)
  const { t } = useLanguage()

  const [columns, setColumns] = useState([])
  const [subgroups, setSubgroups] = useState([])
  const [leads, setLeads] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [showSourceManager, setShowSourceManager] = useState(false)
  const [autoIntakeSubgroup, setAutoIntakeSubgroup] = useState(null)
  const [formWizard, setFormWizard] = useState(null) // { columnId } or { formId } or null

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = () => getLeadsBoard().then(data => {
    if (data) { setColumns(data.columns); setSubgroups(data.subgroups); setLeads(data.leads) }
    setLoaded(true)
  })
  useEffect(() => { load(); getLeadSources() }, [])

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
    const matchesSource = !sourceFilter || l.source === sourceFilter
    return matchesSearch && matchesSource
  })

  const onRename = async (id, name) => {
    setColumns(cols => cols.map(c => c._id === id ? { ...c, name } : c))
    await updateLeadColumn(id, { name })
  }

  const onToggleLock = async (id, locked) => {
    setColumns(cols => cols.map(c => c._id === id ? { ...c, locked } : c))
    await updateLeadColumn(id, { locked })
  }

  const onDeleteColumn = async (id) => {
    const ok = await deleteLeadColumn(id)
    if (ok) {
      setColumns(cols => cols.filter(c => c._id !== id))
      setSubgroups(sgs => sgs.filter(s => String(s.columnId) !== String(id)))
      setLeads(ls => ls.filter(l => String(l.columnId) !== String(id)))
    }
  }

  const onAddSubgroup = async (columnId, name) => {
    const subgroup = await createLeadSubgroup(columnId, name)
    if (subgroup) setSubgroups(sgs => [...sgs, subgroup])
  }

  const onRenameSubgroup = async (id, name) => {
    setSubgroups(sgs => sgs.map(s => s._id === id ? { ...s, name } : s))
    await updateLeadSubgroup(id, { name })
  }

  const onDeleteSubgroup = async (id) => {
    const ok = await deleteLeadSubgroup(id)
    if (ok) {
      setSubgroups(sgs => sgs.filter(s => s._id !== id))
      setLeads(ls => ls.map(l => l.subgroupId === id ? { ...l, subgroupId: null } : l))
    }
  }

  const onAutoIntakeSaved = (subgroupId, sourceNames) => {
    setSubgroups(sgs => sgs.map(s => s._id === subgroupId ? { ...s, autoIntakeSourceNames: sourceNames } : s))
  }

  const onAddLead = async (columnId, subgroupId, form) => {
    const lead = await createLead({ ...form, columnId, subgroupId })
    if (lead) { setLeads(ls => [...ls, lead]); return true }
    return false
  }

  const onSaveLead = async (id, form) => {
    const lead = await updateLead(id, form)
    if (lead) { setLeads(ls => ls.map(l => l._id === id ? lead : l)); return true }
    return false
  }

  const onDeleteLead = async (id) => {
    const ok = await deleteLead(id)
    if (ok) setLeads(ls => ls.filter(l => l._id !== id))
  }

  const submitNewColumn = async (e) => {
    e.preventDefault()
    if (!newColumnName.trim()) return
    const column = await createLeadColumn(newColumnName.trim())
    if (column) { setColumns(cols => [...cols, column]); setNewColumnName(''); setAddingColumn(false) }
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    if (!over) return
    const type = active.data.current?.type

    if (type === 'column') {
      if (active.id === over.id) return
      const oldIndex = columns.findIndex(c => 'column-' + c._id === active.id)
      const newIndex = columns.findIndex(c => 'column-' + c._id === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }))
      setColumns(reordered)
      reordered.forEach(c => updateLeadColumn(c._id, { order: c.order }))
      return
    }

    if (type === 'subgroup') {
      const columnId = active.data.current.columnId
      const columnSubgroups = subgroups.filter(s => String(s.columnId) === String(columnId))
      const oldIndex = columnSubgroups.findIndex(s => 'subgroup-' + s._id === active.id)
      const newIndex = columnSubgroups.findIndex(s => 'subgroup-' + s._id === over.id)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
      const reordered = arrayMove(columnSubgroups, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }))
      const others = subgroups.filter(s => String(s.columnId) !== String(columnId))
      setSubgroups([...others, ...reordered])
      reordered.forEach(s => updateLeadSubgroup(s._id, { order: s.order }))
      return
    }

    if (type === 'lead') {
      const leadId = active.data.current.leadId
      const sourceColumnId = active.data.current.columnId
      const sourceSubgroupId = active.data.current.subgroupId
      const overData = over.data.current
      let targetColumnId, targetSubgroupId
      if (overData?.type === 'lead') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else if (overData?.type === 'bucket') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else return

      const targetColumn = columns.find(c => c._id === targetColumnId)
      const sourceColumn = columns.find(c => c._id === sourceColumnId)
      if (targetColumn?.locked || sourceColumn?.locked) return

      const bucketLeads = leads.filter(l => l._id !== leadId && String(l.columnId) === String(targetColumnId) && String(l.subgroupId || '') === String(targetSubgroupId || ''))
        .sort((a, b) => a.order - b.order)
      let insertIndex = bucketLeads.length
      if (overData?.type === 'lead') {
        const idx = bucketLeads.findIndex(l => l._id === overData.leadId)
        if (idx !== -1) insertIndex = idx
      }
      const orderedIds = [...bucketLeads.slice(0, insertIndex).map(l => l._id), leadId, ...bucketLeads.slice(insertIndex).map(l => l._id)]

      setLeads(ls => ls.map(l => {
        const idx = orderedIds.indexOf(l._id)
        if (idx === -1) return l
        return { ...l, columnId: targetColumnId, subgroupId: targetSubgroupId || null, order: idx }
      }))

      const saved = await updateLead(leadId, { columnId: targetColumnId, subgroupId: targetSubgroupId || null, order: orderedIds.indexOf(leadId) })
      if (!saved) load()
    }
  }

  if (!loaded) return <p className='text-muted'>{t('loading')}</p>

  return (
    <div>
      <div className='sticky top-0 z-20 bg-bg pb-4 mb-2 border-b border-hairline'>
        <p className='font-display text-2xl text-ink mb-3'>{t('navLeads')}</p>
        <div className='flex gap-2'>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchLeadsPlaceholder')}
            className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' />
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm'>
            <option value=''>{t('anySource')}</option>
            {leadSources.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
          </select>
          <button onClick={() => setShowSourceManager(true)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-muted text-sm font-medium'>⚙️ {t('manageSourcesBtn')}</button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className='flex gap-4 overflow-x-auto pb-4'>
          <SortableContext items={columns.map(c => 'column-' + c._id)} strategy={horizontalListSortingStrategy}>
            {columns.map(column => (
              <Column key={column._id} column={column}
                subgroups={subgroups.filter(s => String(s.columnId) === String(column._id)).sort((a, b) => a.order - b.order)}
                leads={filteredLeads.filter(l => String(l.columnId) === String(column._id))}
                sources={leadSources}
                t={t} onRename={onRename} onToggleLock={onToggleLock} onDelete={onDeleteColumn}
                onAddSubgroup={onAddSubgroup} onRenameSubgroup={onRenameSubgroup} onDeleteSubgroup={onDeleteSubgroup}
                onOpenAutoIntake={setAutoIntakeSubgroup} onOpenFormWizard={(columnId) => setFormWizard({ columnId })}
                onSaveLead={onSaveLead} onDeleteLead={onDeleteLead} onAddLead={onAddLead}
                onEditForm={(formId) => setFormWizard({ formId })} />
            ))}
          </SortableContext>

          <div className='w-72 flex-shrink-0'>
            {addingColumn ? (
              <form onSubmit={submitNewColumn} className='bg-bg-elevated border border-hairline rounded-2xl p-3 flex gap-2'>
                <input autoFocus value={newColumnName} onChange={e => setNewColumnName(e.target.value)} placeholder={t('columnNamePlaceholder')}
                  className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-sm' />
                <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>{t('add')}</button>
              </form>
            ) : (
              <button onClick={() => setAddingColumn(true)} className='w-full py-3 rounded-2xl border border-dashed border-hairline text-muted text-sm hover:text-accent hover:border-accent'>
                + {t('addColumnBtn')}
              </button>
            )}
          </div>
        </div>
      </DndContext>

      {showSourceManager && <SourceManagerModal onClose={() => setShowSourceManager(false)} t={t} />}

      {autoIntakeSubgroup && (
        <AutoIntakeModal subgroup={autoIntakeSubgroup} onClose={() => setAutoIntakeSubgroup(null)} onSaved={onAutoIntakeSaved} t={t} />
      )}

      {formWizard && (
        <FormModal formId={formWizard.formId} defaultColumnId={formWizard.columnId} columns={columns} subgroups={subgroups}
          onClose={() => setFormWizard(null)} onSaved={() => {}} t={t} />
      )}
    </div>
  )
}

export default Leads
