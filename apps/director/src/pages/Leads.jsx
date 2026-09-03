import React, { useContext, useEffect, useRef, useState } from 'react'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Lock, Unlock, Trash2, FileText, Settings, Zap, X, Plus } from 'lucide-react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import Logo from '../components/Logo.jsx'
import SourceManagerModal from '../components/leads/SourceManagerModal.jsx'
import AutoIntakeModal from '../components/leads/AutoIntakeModal.jsx'
import FormModal from '../components/leads/FormModal.jsx'

const GENERAL = 'general'
const ICON_BTN = 'plain text-slate-500 dark:text-[#94A3B8] opacity-40 hover:opacity-100 transition-opacity'
const FIELD = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-200 dark:bg-[#1E293B] dark:border-none text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent'
const ICON_STROKE = 1.75

const bucketKey = (columnId, subgroupId) => `bucket-${columnId}-${subgroupId || GENERAL}`

// unlike the admin version of this same board, a director CAN permanently delete a lead - confirmed
// spec (director needs full management including cleanup; admin stays locked out of this entirely).
// The delete button lives here, in the edit modal, behind no extra confirm step of its own beyond
// what deleteLead's own context function already does (a real confirm() dialog, same as every other
// permanent-delete action in this app).
const LeadEditModal = ({ lead, sources, onSave, onDelete, onEditForm, onClose, t }) => {
  const [form, setForm] = useState({ name: lead.name, phone: lead.phone, source: lead.source, comment: lead.comment })

  const save = async (e) => {
    e.preventDefault()
    const ok = await onSave(lead._id, form)
    if (ok) onClose()
  }

  const remove = async () => {
    const ok = await onDelete(lead._id)
    if (ok) onClose()
  }

  return (
    <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={onClose}>
      <div className='bg-white rounded-2xl shadow-2xl border border-slate-100 dark:bg-[#161F30] dark:border-slate-800/80 p-6 max-w-md w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
        <form onSubmit={save} className='flex flex-col gap-3'>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('leadNamePlaceholder')} className={FIELD} required />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('leadPhonePlaceholder')} className={FIELD} required />
          <Select value={form.source} onChange={(v) => setForm({ ...form, source: v })}
            options={sources.map(s => ({ value: s.name, label: s.name }))} />
          <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder={t('commentPlaceholder')} className={FIELD} rows={2} />
          {lead.answers && Object.keys(lead.answers).length > 0 && (
            <div className='bg-[#f5f5f7] dark:bg-slate-800/40 rounded-xl p-3 flex flex-col gap-1'>
              {Object.entries(lead.answers).map(([k, v]) => (
                <p key={k} className='text-xs text-slate-400 dark:text-slate-600'><span className='text-slate-700 dark:text-slate-300'>{k}:</span> {String(v)}</p>
              ))}
            </div>
          )}
          {lead.formId && (
            <button type='button' onClick={() => onEditForm(lead.formId)} className='text-accent dark:text-[#818CF8] text-xs font-medium text-left'>{t('editFormBtn')}</button>
          )}
          <div className='flex gap-2 mt-2'>
            <button type='button' onClick={remove}
              className='px-4 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-500 text-sm font-medium hover:bg-rose-50 dark:bg-[#1E293B] dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1.5'>
              <Trash2 size={14} strokeWidth={ICON_STROKE} /> {t('deleteLeadBtn')}
            </button>
            <button type='submit' className='flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 transition-colors'>{t('sendBtn')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DEFAULT_DOT_COLOR = '#94A3B8'

const LeadCard = ({ lead, columnId, subgroupId, sources, onSave, onDelete, onEditForm, t, isCompact }) => {
  const [editing, setEditing] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'lead-' + lead._id, data: { type: 'lead', leadId: lead._id, columnId, subgroupId },
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const dotColor = sources.find(s => s.name === lead.source)?.color || DEFAULT_DOT_COLOR

  if (isCompact) {
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        className='bg-white border border-slate-100 dark:bg-[#1E293B] dark:border-slate-800 rounded-xl py-1.5 px-3 mb-1 cursor-grab'>
        <button onClick={() => setEditing(true)} className='plain w-full text-left flex items-center justify-between gap-2'>
          <p className='font-semibold text-slate-700 dark:text-slate-300 text-xs truncate'>{lead.name}</p>
          <span className='w-2 h-2 rounded-full flex-shrink-0' style={{ backgroundColor: dotColor }} />
        </button>
        {editing && (
          <LeadEditModal lead={lead} sources={sources} onSave={onSave} onDelete={onDelete} onEditForm={onEditForm} onClose={() => setEditing(false)} t={t} />
        )}
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style}
      className='bg-white border border-slate-200/60 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 rounded-2xl p-3 mb-2.5'>
      <div className='flex items-start gap-2'>
        <button {...attributes} {...listeners} className='plain text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-[#94A3B8] transition-colors cursor-grab pt-0.5 flex-shrink-0'><GripVertical size={16} strokeWidth={ICON_STROKE} /></button>
        <button onClick={() => setEditing(true)} className='plain flex-1 text-left min-w-0'>
          <div className='flex justify-between items-start gap-2'>
            <p className='text-[#1D1D1F] dark:text-[#F8FAFC] text-sm font-semibold tracking-tight truncate'>{lead.name}</p>
            <span className='text-slate-400 dark:text-slate-600 text-[10px] whitespace-nowrap'>{new Date(lead.createdAt).toLocaleDateString()}</span>
          </div>
          <div className='flex items-center justify-between gap-2 mt-0.5'>
            <p className='text-[#6E6E73] dark:text-[#94A3B8] text-xs truncate'>{lead.phone}</p>
            <span className='inline-block flex-shrink-0 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] dark:bg-[#1E1B4B] dark:text-[#818CF8] dark:border-[#312E81] font-medium px-2 py-0.5 rounded-lg text-[11px]'>{lead.source}</span>
          </div>
        </button>
      </div>

      {editing && (
        <LeadEditModal lead={lead} sources={sources} onSave={onSave} onDelete={onDelete} onEditForm={onEditForm} onClose={() => setEditing(false)} t={t} />
      )}
    </div>
  )
}

const Bucket = ({ columnId, subgroupId, leads, locked, sources, t, onSaveLead, onDeleteLead, onAddLead, onEditForm, isCompact }) => {
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
            onSave={onSaveLead} onDelete={onDeleteLead} onEditForm={onEditForm} t={t} isCompact={isCompact} />
        ))}
      </SortableContext>
      {!locked && (adding ? (
        <form onSubmit={submitAdd} className='bg-white border border-slate-100 shadow-sm rounded-xl p-3 mb-2 flex flex-col gap-2 dark:bg-[#161F30] dark:border-slate-800/80'>
          <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('leadNamePlaceholder')} className={FIELD} required />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('leadPhonePlaceholder')} className={FIELD} required />
          <Select value={form.source} onChange={(v) => setForm({ ...form, source: v })}
            options={sources.map(s => ({ value: s.name, label: s.name }))} />
          <div className='flex gap-2'>
            <button type='submit' className='flex-1 py-1.5 rounded-lg bg-accent text-white text-xs font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('add')}</button>
            <button type='button' onClick={() => setAdding(false)} className='px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs dark:bg-[#1E293B] dark:border-none dark:text-[#94A3B8] dark:hover:bg-slate-800/40'>{t('cancel')}</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className='w-full text-left text-slate-400 text-sm px-3 py-2.5 hover:text-blue-600 dark:text-slate-600 dark:hover:text-blue-400 transition-colors'>+ {t('addLeadBtn')}</button>
      ))}
    </div>
  )
}

const SubgroupBlock = ({ subgroup, columnId, leads, locked, t, onRename, onDelete, onOpenAutoIntake, ...rest }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: 'subgroup-' + subgroup._id, data: { type: 'subgroup', columnId, subgroupId: subgroup._id },
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
      <div className='flex items-center gap-1.5 mb-1.5 px-2 py-1.5 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg'>
        <button {...attributes} {...listeners} className={`${ICON_BTN} cursor-grab flex-shrink-0`}><GripVertical size={14} /></button>
        {editingName ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className='flex-1 px-2 py-1 rounded-lg bg-white border border-slate-200 dark:bg-[#1E293B] dark:border-none text-xs font-medium' />
        ) : (
          <button onClick={() => setEditingName(true)} className='plain flex-1 text-left text-slate-500 dark:text-[#94A3B8] text-xs font-medium px-2 py-1'>{subgroup.name} · {leads.length}</button>
        )}
        {!locked && (
          <>
            <button onClick={() => onOpenAutoIntake(subgroup)} title={t('autoIntakeBtn')} className={`${ICON_BTN} p-1`}><Zap size={14} strokeWidth={ICON_STROKE} /></button>
            <button onClick={() => onDelete(subgroup._id)} className={`${ICON_BTN} p-1`}><X size={14} strokeWidth={ICON_STROKE} /></button>
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
    id: 'column-' + column._id, data: { type: 'column', columnId: column._id },
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
    <div ref={setNodeRef} style={style} className='bg-[#F1F5F9] dark:bg-[#1E293B]/40 rounded-xl p-4 w-[calc(100vw-32px)] md:w-80 flex flex-col max-h-[80vh]'>
      <div className='flex items-center gap-1.5 mb-3 px-1'>
        <button {...attributes} {...listeners} className='plain text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-[#94A3B8] transition-colors cursor-grab flex-shrink-0'><GripVertical size={16} strokeWidth={ICON_STROKE} /></button>
        {editingName ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            className='flex-1 px-2 py-1 rounded-lg bg-white border border-slate-200 dark:bg-[#1E293B] dark:border-none text-sm font-semibold' />
        ) : (
          <button onClick={() => setEditingName(true)} className='plain flex-1 text-left text-[#1D1D1F] dark:text-[#F8FAFC] font-semibold text-sm px-1 py-0.5 truncate'>{column.name}</button>
        )}
        <span className='text-xs font-medium bg-slate-200/60 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 px-2 py-0.5 rounded-full'>{totalCount}</span>
        <button onClick={() => onOpenFormWizard(column._id)} title={t('addFormBtn')} className={`${ICON_BTN} p-1`}><FileText size={15} strokeWidth={ICON_STROKE} /></button>
        <button onClick={() => onToggleLock(column._id, !column.locked)} title={column.locked ? t('unlockColumnHint') : t('lockColumnHint')} className={`${ICON_BTN} p-1`}>
          {column.locked ? <Lock size={15} strokeWidth={ICON_STROKE} /> : <Unlock size={15} strokeWidth={ICON_STROKE} />}
        </button>
        <button onClick={() => onDelete(column._id)} className={`${ICON_BTN} p-1 hover:text-red-500 dark:hover:text-red-400`}><Trash2 size={15} strokeWidth={ICON_STROKE} /></button>
      </div>

      <div className='overflow-y-auto flex-1'>
        {subgroups.length > 0 && (
          <div className='mb-3'>
            <p className='text-slate-400 dark:text-slate-600 text-xs font-medium mb-1.5 px-1'>{t('generalBucketLabel')}</p>
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
              className='flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs' />
            <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs'>{t('add')}</button>
          </form>
        ) : (
          <button onClick={() => setAddingSubgroup(true)} className='mt-2 w-full text-left text-slate-400 text-xs px-3 py-2 hover:text-blue-600 transition-colors'>+ {t('addSubgroupBtn')}</button>
        )
      )}
    </div>
  )
}

// the actual Kanban board, scoped to one branch (see Leads below for the branch picker that wraps
// this) - same shape as the admin app's own board, plus the ability to permanently delete a lead
const LeadsBoard = ({ branchId, t }) => {
  const {
    getLeadsBoard, createLeadColumn, updateLeadColumn, deleteLeadColumn,
    createLeadSubgroup, updateLeadSubgroup, deleteLeadSubgroup,
    createLead, updateLead, deleteLead, leadSources, getLeadSources,
  } = useContext(DirectorContext)

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
  const [formWizard, setFormWizard] = useState(null)
  const [isCompact, setIsCompact] = useState(false)
  const columnRefs = useRef({})

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const boardRef = useRef(null)
  const dragState = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false })
  const [isPanning, setIsPanning] = useState(false)

  const onBoardMouseDown = (e) => {
    if (e.target.closest('button, input, textarea, select, a, [role="button"]')) return
    dragState.current = { active: true, startX: e.pageX, startScrollLeft: boardRef.current.scrollLeft, moved: false }
    setIsPanning(true)
  }
  const stopPanning = () => { dragState.current.active = false; setIsPanning(false) }
  const onBoardMouseMove = (e) => {
    if (!dragState.current.active) return
    e.preventDefault()
    const delta = e.pageX - dragState.current.startX
    if (Math.abs(delta) > 5) dragState.current.moved = true
    boardRef.current.scrollLeft = dragState.current.startScrollLeft - delta
  }
  const onBoardClickCapture = (e) => {
    if (dragState.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      dragState.current.moved = false
    }
  }

  const load = () => getLeadsBoard(branchId).then(data => {
    if (data) { setColumns(data.columns); setSubgroups(data.subgroups); setLeads(data.leads) }
    setLoaded(true)
  })
  useEffect(() => { setLoaded(false); load(); getLeadSources(branchId) }, [branchId])

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
    const matchesSource = !sourceFilter || l.source === sourceFilter
    return matchesSearch && matchesSource
  })

  const onRename = async (id, name) => {
    setColumns(cols => cols.map(c => c._id === id ? { ...c, name } : c))
    await updateLeadColumn(branchId, id, { name })
  }

  const onToggleLock = async (id, locked) => {
    setColumns(cols => cols.map(c => c._id === id ? { ...c, locked } : c))
    await updateLeadColumn(branchId, id, { locked })
  }

  const onDeleteColumn = async (id) => {
    const ok = await deleteLeadColumn(branchId, id)
    if (ok) {
      setColumns(cols => cols.filter(c => c._id !== id))
      setSubgroups(sgs => sgs.filter(s => String(s.columnId) !== String(id)))
      setLeads(ls => ls.filter(l => String(l.columnId) !== String(id)))
    }
  }

  const onAddSubgroup = async (columnId, name) => {
    const subgroup = await createLeadSubgroup(branchId, columnId, name)
    if (subgroup) setSubgroups(sgs => [...sgs, subgroup])
  }

  const onRenameSubgroup = async (id, name) => {
    setSubgroups(sgs => sgs.map(s => s._id === id ? { ...s, name } : s))
    await updateLeadSubgroup(branchId, id, { name })
  }

  const onDeleteSubgroup = async (id) => {
    const ok = await deleteLeadSubgroup(branchId, id)
    if (ok) {
      setSubgroups(sgs => sgs.filter(s => s._id !== id))
      setLeads(ls => ls.map(l => l.subgroupId === id ? { ...l, subgroupId: null } : l))
    }
  }

  const onAutoIntakeSaved = (subgroupId, sourceNames) => {
    setSubgroups(sgs => sgs.map(s => s._id === subgroupId ? { ...s, autoIntakeSourceNames: sourceNames } : s))
  }

  const onAddLead = async (columnId, subgroupId, form) => {
    const lead = await createLead(branchId, { ...form, columnId, subgroupId })
    if (lead) { setLeads(ls => [...ls, lead]); return true }
    return false
  }

  const onSaveLead = async (id, form) => {
    const lead = await updateLead(branchId, id, form)
    if (lead) { setLeads(ls => ls.map(l => l._id === id ? lead : l)); return true }
    return false
  }

  const onDeleteLead = async (id) => {
    const ok = await deleteLead(branchId, id)
    if (ok) { setLeads(ls => ls.filter(l => l._id !== id)); return true }
    return false
  }

  const submitNewColumn = async (e) => {
    e.preventDefault()
    if (!newColumnName.trim()) return
    const column = await createLeadColumn(branchId, newColumnName.trim())
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
      reordered.forEach(c => updateLeadColumn(branchId, c._id, { order: c.order }))
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
      reordered.forEach(s => updateLeadSubgroup(branchId, s._id, { order: s.order }))
      return
    }

    if (type === 'lead') {
      const leadId = active.data.current.leadId
      const overData = over.data.current
      let targetColumnId, targetSubgroupId
      if (overData?.type === 'lead') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else if (overData?.type === 'bucket') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else if (overData?.type === 'subgroup') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else if (overData?.type === 'column') { targetColumnId = overData.columnId; targetSubgroupId = null }
      else return

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

      const saved = await updateLead(branchId, leadId, { columnId: targetColumnId, subgroupId: targetSubgroupId || null, order: orderedIds.indexOf(leadId) })
      if (!saved) load()
    }
  }

  if (!loaded) return <p className='text-muted'>{t('loading')}</p>

  const scrollToColumn = (id) => columnRefs.current[id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })

  return (
    <div>
      <div className='sticky top-[68px] z-20 bg-bg pb-4 mb-2 border-b border-hairline'>
        <div className='flex flex-col md:flex-row gap-2'>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchLeadsPlaceholder')} className={`${FIELD} w-full md:max-w-xs`} />
          <Select className='w-full md:w-40' value={sourceFilter} onChange={setSourceFilter} placeholder={t('anySource')}
            options={[{ value: '', label: t('anySource') }, ...leadSources.map(s => ({ value: s.name, label: s.name }))]} />
          <button onClick={() => setShowSourceManager(true)} className='px-3 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none text-sm font-medium flex items-center justify-center gap-1.5 transition-colors'>
            <Settings size={14} /> {t('manageSourcesBtn')}
          </button>
          <button onClick={() => setIsCompact(v => !v)} title={isCompact ? t('expandCardsHint') : t('compactCardsHint')}
            className='px-3 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none text-sm font-medium flex items-center justify-center gap-1.5 transition-colors'>
            {isCompact ? <Lock size={14} strokeWidth={ICON_STROKE} /> : <Unlock size={14} strokeWidth={ICON_STROKE} />} {t('compactViewBtn')}
          </button>
        </div>

        <div className='md:hidden flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap mt-3'>
          {columns.map(c => (
            <button key={c._id} onClick={() => scrollToColumn(c._id)}
              className='plain flex-shrink-0 px-3 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-300 text-xs font-medium'>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div ref={boardRef}
          onMouseDown={onBoardMouseDown} onMouseMove={onBoardMouseMove}
          onMouseUp={stopPanning} onMouseLeave={stopPanning} onClickCapture={onBoardClickCapture}
          className={`flex gap-4 overflow-x-auto select-none no-scrollbar pb-4 snap-x snap-mandatory md:snap-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}>
          <SortableContext items={columns.map(c => 'column-' + c._id)} strategy={horizontalListSortingStrategy}>
            {columns.map(column => (
              <div key={column._id} ref={el => { columnRefs.current[column._id] = el }} className='snap-center md:snap-align-none flex-shrink-0'>
                <Column column={column}
                  subgroups={subgroups.filter(s => String(s.columnId) === String(column._id)).sort((a, b) => a.order - b.order)}
                  leads={filteredLeads.filter(l => String(l.columnId) === String(column._id))}
                  sources={leadSources}
                  t={t} onRename={onRename} onToggleLock={onToggleLock} onDelete={onDeleteColumn}
                  onAddSubgroup={onAddSubgroup} onRenameSubgroup={onRenameSubgroup} onDeleteSubgroup={onDeleteSubgroup}
                  onOpenAutoIntake={setAutoIntakeSubgroup} onOpenFormWizard={(columnId) => setFormWizard({ columnId })}
                  onSaveLead={onSaveLead} onDeleteLead={onDeleteLead} onAddLead={onAddLead}
                  onEditForm={(formId) => setFormWizard({ formId })} isCompact={isCompact} />
              </div>
            ))}
          </SortableContext>

          <div className='w-[calc(100vw-32px)] md:w-80 flex-shrink-0 snap-center md:snap-align-none'>
            {addingColumn ? (
              <form onSubmit={submitNewColumn} className='bg-[#F1F5F9] rounded-xl p-3 flex gap-2'>
                <input autoFocus value={newColumnName} onChange={e => setNewColumnName(e.target.value)} placeholder={t('columnNamePlaceholder')}
                  className='flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-sm' />
                <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium'>
                  <Plus size={14} />
                </button>
              </form>
            ) : (
              <button onClick={() => setAddingColumn(true)} className='w-full min-h-[100px] md:min-h-0 md:py-3 rounded-2xl md:rounded-xl border-2 md:border border-dashed border-slate-200 text-slate-400 text-sm hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center gap-1.5'>
                <Plus size={14} /> {t('addColumnBtn')}
              </button>
            )}
          </div>
        </div>
      </DndContext>

      {showSourceManager && <SourceManagerModal branchId={branchId} onClose={() => setShowSourceManager(false)} t={t} />}

      {autoIntakeSubgroup && (
        <AutoIntakeModal branchId={branchId} subgroup={autoIntakeSubgroup} onClose={() => setAutoIntakeSubgroup(null)} onSaved={onAutoIntakeSaved} t={t} />
      )}

      {formWizard && (
        <FormModal branchId={branchId} formId={formWizard.formId} defaultColumnId={formWizard.columnId} columns={columns} subgroups={subgroups}
          onClose={() => setFormWizard(null)} onSaved={() => {}} t={t} />
      )}
    </div>
  )
}

// director oversees every branch, unlike admin (who is scoped to their own) - a branch must be
// explicitly picked here before any Leads data can load, same pattern already used by Finance/Timetable
const Leads = () => {
  const { branches, getBranches } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [branchId, setBranchId] = useState('')

  useEffect(() => { getBranches() }, [])
  useEffect(() => {
    if (!branchId && branches.length > 0) setBranchId(branches[0]._id)
  }, [branches])

  return (
    <div>
      <div className='sticky top-0 z-20 bg-bg pb-4 mb-2 border-b border-hairline'>
        <div className='flex items-center justify-between gap-3 flex-wrap mb-3'>
          <div className='flex items-center gap-2.5'>
            <Logo size={28} withWordmark={false} />
            <p className='font-display text-2xl text-ink'>{t('navLeads')}</p>
          </div>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm font-medium'>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {!branchId ? (
        <p className='text-muted text-sm'>{t('noBranchesYet')}</p>
      ) : (
        <LeadsBoard branchId={branchId} t={t} />
      )}
    </div>
  )
}

export default Leads
