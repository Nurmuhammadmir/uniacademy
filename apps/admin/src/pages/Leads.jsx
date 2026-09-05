import React, { useContext, useEffect, useRef, useState } from 'react'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  useDroppable,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Lock, Unlock, Trash2, FileText, Settings, Zap, X, Plus, CheckSquare, Calendar, UserPlus, GraduationCap } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import Logo from '../components/Logo.jsx'
import DatePicker from '../components/DatePicker.jsx'
import SourceManagerModal from '../components/leads/SourceManagerModal.jsx'
import AutoIntakeModal from '../components/leads/AutoIntakeModal.jsx'
import FormModal from '../components/leads/FormModal.jsx'
import ConvertLeadModal from '../components/leads/ConvertLeadModal.jsx'

const GENERAL = 'general'
// column-level action icons (lock, delete, add-form) stay near-invisible until hovered, Apple-style
// "chrome that gets out of the way" rather than a row of always-loud icon buttons
const ICON_BTN = 'plain text-slate-500 dark:text-[#94A3B8] opacity-40 hover:opacity-100 transition-opacity'
const FIELD = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-200 dark:bg-[#1E293B] dark:border-none text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent'
const ICON_STROKE = 1.75

const bucketKey = (columnId, subgroupId) => `bucket-${columnId}-${subgroupId || GENERAL}`

// editing a lead used to expand a full form INSIDE the small kanban card itself - inputs mashed
// together and the delete button could end up scrolled off-screen once a card in a narrow column
// grew tall enough. Editing now opens a proper centered modal instead; the card itself always stays
// the plain, minimal display (name/phone/source/call) no matter what.
const LeadEditModal = ({ lead, sources, onSave, onEditForm, onConvert, onViewStudent, onClose, t }) => {
  const [form, setForm] = useState({ name: lead.name, phone: lead.phone, source: lead.source, comment: lead.comment })

  const save = async (e) => {
    e.preventDefault()
    const ok = await onSave(lead._id, form)
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
          {lead.convertedStudentId ? (
            <button type='button' onClick={() => onViewStudent(lead.convertedStudentId)}
              className='flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-sm font-medium transition-colors'>
              <GraduationCap size={15} strokeWidth={1.75} /> {t('viewConvertedStudentBtn')}
            </button>
          ) : (
            <button type='button' onClick={() => onConvert(lead)}
              className='flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 text-sm font-medium transition-colors'>
              <UserPlus size={15} strokeWidth={1.75} /> {t('convertToStudentBtn')}
            </button>
          )}
          {/* confirmed spec: a lead can never be deleted, only moved/edited - so there's no delete
              action here at all, not even hidden behind a confirm step */}
          <button type='submit' className='px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium mt-2 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 transition-colors'>{t('sendBtn')}</button>
        </form>
      </div>
    </div>
  )
}

const DEFAULT_DOT_COLOR = '#94A3B8'

const LeadCard = ({ lead, columnId, subgroupId, sources, onSave, onEditForm, onConvert, onViewStudent, t, isCompact, selectMode, selected, onToggleSelect }) => {
  const [editing, setEditing] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'lead-' + lead._id, data: { type: 'lead', leadId: lead._id, columnId, subgroupId }, disabled: selectMode,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const dotColor = sources.find(s => s.name === lead.source)?.color || DEFAULT_DOT_COLOR

  // select mode replaces the drag handle / open-on-click behavior with a plain checkbox - dragging
  // is disabled above (via useSortable's own `disabled`) so a click here can never be misread as
  // the start of a drag gesture
  const checkbox = selectMode && (
    <input type='checkbox' checked={selected} onChange={() => onToggleSelect(lead._id)} onClick={e => e.stopPropagation()}
      className='w-4 h-4 flex-shrink-0 accent-accent' />
  )

  // compact mode is a straight conditional render, not an animated collapse - a grid-template-rows
  // tween looked "smooth" but silently depended on `min-h-0` sizing quirks that didn't hold up once
  // this was actually tested with real data, and the owner explicitly wants an instant toggle
  // anyway, not a transition - so there's nothing left for that trick to buy us.
  if (isCompact) {
    return (
      <div ref={setNodeRef} style={style} {...(selectMode ? {} : { ...attributes, ...listeners })}
        className={`bg-white border dark:bg-[#1E293B] rounded-xl py-1.5 px-3 mb-1 flex items-center gap-2 ${selectMode ? 'border-slate-100 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800 cursor-grab'} ${selected ? 'ring-2 ring-accent' : ''}`}>
        {checkbox}
        {/* attributes/listeners live on this outer div (no separate grip handle in compact mode) -
            the sortable PointerSensor's activationConstraint (5px) still lets a plain tap open the
            edit modal below; only a real drag gesture past that threshold hijacks the pointer */}
        <button onClick={() => selectMode ? onToggleSelect(lead._id) : setEditing(true)} className='plain flex-1 min-w-0 text-left flex items-center justify-between gap-2'>
          <p className='font-semibold text-slate-700 dark:text-slate-300 text-xs truncate'>{lead.name}</p>
          {lead.convertedStudentId ? <GraduationCap size={13} strokeWidth={2} className='flex-shrink-0 text-emerald-500 dark:text-emerald-400' /> : (
            <span className='w-2 h-2 rounded-full flex-shrink-0' style={{ backgroundColor: dotColor }} />
          )}
        </button>
        {editing && (
          <LeadEditModal lead={lead} sources={sources} onSave={onSave} onEditForm={onEditForm} onConvert={onConvert} onViewStudent={onViewStudent} onClose={() => setEditing(false)} t={t} />
        )}
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white border shadow-sm dark:bg-[#1E293B] rounded-2xl p-3 mb-2.5 ${selected ? 'border-accent ring-2 ring-accent' : 'border-slate-200/60 dark:border-slate-800'}`}>
      <div className='flex items-start gap-2'>
        {selectMode ? checkbox : (
          <button {...attributes} {...listeners} className='plain text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-[#94A3B8] transition-colors cursor-grab pt-0.5 flex-shrink-0'><GripVertical size={16} strokeWidth={ICON_STROKE} /></button>
        )}
        <button onClick={() => selectMode ? onToggleSelect(lead._id) : setEditing(true)} className='plain flex-1 text-left min-w-0'>
          <div className='flex justify-between items-start gap-2'>
            <p className='text-[#1D1D1F] dark:text-[#F8FAFC] text-sm font-semibold tracking-tight truncate'>{lead.name}</p>
            <span className='text-slate-400 dark:text-slate-600 text-[10px] whitespace-nowrap'>{new Date(lead.createdAt).toLocaleDateString('en-GB')}</span>
          </div>
          <div className='flex items-center justify-between gap-2 mt-0.5'>
            <p className='text-[#6E6E73] dark:text-[#94A3B8] text-xs truncate'>{lead.phone}</p>
            <span className='flex items-center gap-1 flex-shrink-0'>
              {lead.convertedStudentId && (
                <span className='inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-lg text-[11px]'>
                  <GraduationCap size={11} strokeWidth={2} /> {t('convertedBadge')}
                </span>
              )}
              <span className='inline-block bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] dark:bg-[#1E1B4B] dark:text-[#818CF8] dark:border-[#312E81] font-medium px-2 py-0.5 rounded-lg text-[11px]'>{lead.source}</span>
            </span>
          </div>
        </button>
      </div>

      {editing && (
        <LeadEditModal lead={lead} sources={sources} onSave={onSave} onEditForm={onEditForm} onConvert={onConvert} onViewStudent={onViewStudent} onClose={() => setEditing(false)} t={t} />
      )}
    </div>
  )
}

const Bucket = ({ columnId, subgroupId, leads, locked, sources, t, onSaveLead, onAddLead, onEditForm, onConvert, onViewStudent, isCompact, selectMode, selectedIds, onToggleSelect }) => {
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
            onSave={onSaveLead} onEditForm={onEditForm} onConvert={onConvert} onViewStudent={onViewStudent} t={t} isCompact={isCompact}
            selectMode={selectMode} selected={selectedIds?.has(lead._id)} onToggleSelect={onToggleSelect} />
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

const SubgroupBlock = ({ subgroup, columnId, leads, locked, t, onRename, onDelete, onOpenAutoIntake, selectMode, selectedIds, onSelectMany, ...rest }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: 'subgroup-' + subgroup._id, data: { type: 'subgroup', columnId, subgroupId: subgroup._id }, disabled: selectMode,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(subgroup.name)

  const saveName = async () => {
    setEditingName(false)
    if (name.trim() && name !== subgroup.name) await onRename(subgroup._id, name.trim())
  }

  const allSelected = leads.length > 0 && leads.every(l => selectedIds?.has(l._id))

  return (
    <div ref={setNodeRef} style={style} className='mb-3'>
      <div className='flex items-center gap-1.5 mb-1.5 px-2 py-1.5 bg-slate-100/70 dark:bg-slate-800/40 rounded-lg'>
        {selectMode ? (
          <input type='checkbox' checked={allSelected} onChange={() => onSelectMany(leads.map(l => l._id), !allSelected)}
            title={t('selectAllInSubgroupHint')} className='w-4 h-4 flex-shrink-0 accent-accent' />
        ) : (
          <button {...attributes} {...listeners} className={`${ICON_BTN} cursor-grab flex-shrink-0`}><GripVertical size={14} /></button>
        )}
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
      <Bucket columnId={columnId} subgroupId={subgroup._id} leads={leads} locked={locked} t={t} selectMode={selectMode} selectedIds={selectedIds} {...rest} />
    </div>
  )
}

const Column = ({
  column, subgroups, leads, sources, t, onRename, onToggleLock, onDelete, onAddSubgroup, onRenameSubgroup, onDeleteSubgroup,
  onOpenAutoIntake, onOpenFormWizard, selectMode, selectedIds, onSelectMany, ...rest
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: 'column-' + column._id, data: { type: 'column', columnId: column._id }, disabled: selectMode,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(column.name)
  const [addingSubgroup, setAddingSubgroup] = useState(false)
  const [subgroupName, setSubgroupName] = useState('')

  const generalLeads = leads.filter(l => !l.subgroupId).sort((a, b) => a.order - b.order)
  const totalCount = leads.length
  const allSelected = leads.length > 0 && leads.every(l => selectedIds?.has(l._id))

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
        {selectMode ? (
          <input type='checkbox' checked={allSelected} onChange={() => onSelectMany(leads.map(l => l._id), !allSelected)}
            title={t('selectAllInColumnHint')} className='w-4 h-4 flex-shrink-0 accent-accent' />
        ) : (
          <button {...attributes} {...listeners} className='plain text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-[#94A3B8] transition-colors cursor-grab flex-shrink-0'><GripVertical size={16} strokeWidth={ICON_STROKE} /></button>
        )}
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
        {/* always rendered, even when currently empty - dropping a card here (rather than exactly
            on another card) needs a real droppable target to land on. Previously this only mounted
            once it already had a lead in it, so a column with subgroups but zero un-grouped leads
            had NO drop target for its own general area at all - drags into it silently did nothing. */}
        {subgroups.length > 0 && (
          <div className='mb-3'>
            <p className='text-slate-400 dark:text-slate-600 text-xs font-medium mb-1.5 px-1'>{t('generalBucketLabel')}</p>
            <Bucket columnId={column._id} subgroupId={null} leads={generalLeads} locked={column.locked} sources={sources} t={t}
              selectMode={selectMode} selectedIds={selectedIds} {...rest} />
          </div>
        )}
        {subgroups.length === 0 && (
          <Bucket columnId={column._id} subgroupId={null} leads={generalLeads} locked={column.locked} sources={sources} t={t}
            selectMode={selectMode} selectedIds={selectedIds} {...rest} />
        )}

        <SortableContext items={subgroups.map(s => 'subgroup-' + s._id)} strategy={verticalListSortingStrategy}>
          {subgroups.map(sg => (
            <SubgroupBlock key={sg._id} subgroup={sg} columnId={column._id}
              leads={leads.filter(l => String(l.subgroupId) === String(sg._id)).sort((a, b) => a.order - b.order)}
              locked={column.locked} sources={sources} t={t} onRename={onRenameSubgroup} onDelete={onDeleteSubgroup}
              onOpenAutoIntake={onOpenAutoIntake} selectMode={selectMode} selectedIds={selectedIds} onSelectMany={onSelectMany} {...rest} />
          ))}
        </SortableContext>
      </div>

      {!column.locked && (
        addingSubgroup ? (
          <form onSubmit={submitSubgroup} className='flex gap-2 mt-2'>
            <input autoFocus value={subgroupName} onChange={e => setSubgroupName(e.target.value)} placeholder={t('subgroupNamePlaceholder')}
              className='flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 dark:bg-[#1E293B] dark:border-none text-xs dark:text-slate-200' />
            <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA]'>{t('add')}</button>
          </form>
        ) : (
          <button onClick={() => setAddingSubgroup(true)} className='mt-2 w-full text-left text-slate-400 dark:text-slate-600 text-xs px-3 py-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors'>+ {t('addSubgroupBtn')}</button>
        )
      )}
    </div>
  )
}

const Leads = () => {
  const {
    getLeadsBoard, createLeadColumn, updateLeadColumn, deleteLeadColumn,
    createLeadSubgroup, updateLeadSubgroup, deleteLeadSubgroup,
    createLead, updateLead, bulkMoveLeads, leadSources, getLeadSources,
  } = useContext(AdminContext)
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [convertingLead, setConvertingLead] = useState(null)
  const [showConvertedOnly, setShowConvertedOnly] = useState(false)

  const handleConverted = (leadId, student) => {
    setLeads(ls => ls.map(l => l._id === leadId ? { ...l, convertedStudentId: student._id } : l))
    setConvertingLead(null)
  }

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
  const [isCompact, setIsCompact] = useState(false)
  const columnRefs = useRef({})

  // bulk select/move - plain component state only, never persisted, so leaving the page or
  // reloading always comes back with nothing selected and select mode off
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkTargetColumn, setBulkTargetColumn] = useState('')
  const [bulkMoving, setBulkMoving] = useState(false)

  // date-added filter - deliberately plain useState with no persistence (sessionStorage/localStorage)
  // at all, per confirmed spec: it must always start OFF on a fresh page load/reload and only ever
  // turn on when the admin explicitly opens it and picks a range - never silently carried over
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFilterFrom, setDateFilterFrom] = useState('')
  const [dateFilterTo, setDateFilterTo] = useState('')

  const toggleSelectMode = () => {
    setSelectMode(v => !v)
    setSelectedIds(new Set())
  }

  const onToggleSelect = (leadId) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(leadId)) next.delete(leadId)
      else next.add(leadId)
      return next
    })
  }

  const onSelectMany = (leadIds, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      leadIds.forEach(id => checked ? next.add(id) : next.delete(id))
      return next
    })
  }

  const submitBulkMove = async () => {
    if (!bulkTargetColumn || selectedIds.size === 0 || bulkMoving) return
    setBulkMoving(true)
    const movedCount = await bulkMoveLeads([...selectedIds], bulkTargetColumn, null)
    setBulkMoving(false)
    if (movedCount > 0) {
      setLeads(ls => ls.map(l => selectedIds.has(l._id) ? { ...l, columnId: bulkTargetColumn, subgroupId: null } : l))
      setSelectedIds(new Set())
      setBulkTargetColumn('')
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // click-and-drag panning for the board itself (desktop mice have no horizontal scroll gesture,
  // unlike a trackpad) - separate from dnd-kit's own PointerSensor above, which only ever engages
  // on an actual sortable handle/card. dragState lives in a ref (not state) so onMouseMove can
  // update scrollLeft every frame without triggering a re-render; isPanning is state purely to
  // toggle the cursor-grabbing class.
  const boardRef = useRef(null)
  const dragState = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false })
  const [isPanning, setIsPanning] = useState(false)

  const onBoardMouseDown = (e) => {
    // a drag that starts on a button/input/link/dnd-kit handle (role="button") is someone using
    // that control, not panning the board - only empty background should start a pan
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
  // a real pan gesture that happened to end on top of a card/button would otherwise still fire
  // that element's click right after mouseup - swallow exactly one click when the gesture actually
  // moved past the threshold, so panning never accidentally opens/deletes a lead
  const onBoardClickCapture = (e) => {
    if (dragState.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      dragState.current.moved = false
    }
  }

  const load = () => getLeadsBoard().then(data => {
    if (data) { setColumns(data.columns); setSubgroups(data.subgroups); setLeads(data.leads) }
    setLoaded(true)
  })
  useEffect(() => { load(); getLeadSources() }, [])

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search)
    const matchesSource = !sourceFilter || l.source === sourceFilter
    // strictly optional - showDateFilter defaults to false and dateFilterFrom/To default to '',
    // so a fresh/reloaded page always shows every lead regardless of date until the admin turns
    // this on themselves
    const createdDate = l.createdAt.slice(0, 10)
    const matchesDateFrom = !dateFilterFrom || createdDate >= dateFilterFrom
    const matchesDateTo = !dateFilterTo || createdDate <= dateFilterTo
    const matchesConverted = !showConvertedOnly || !!l.convertedStudentId
    return matchesSearch && matchesSource && matchesDateFrom && matchesDateTo && matchesConverted
  })
  const convertedCount = leads.filter(l => l.convertedStudentId).length

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
      // every possible drop target resolves to a definite bucket now - previously anything that
      // wasn't precisely a lead card or a bucket's own (sometimes tiny/empty) dropzone silently did
      // nothing, which is exactly what "dragging into a column doesn't move the card" looks like.
      // Dropping on a column's own header/body (empty space) lands in that column's general bucket;
      // dropping on a subgroup's header lands in that subgroup's own bucket.
      if (overData?.type === 'lead') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else if (overData?.type === 'bucket') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else if (overData?.type === 'subgroup') { targetColumnId = overData.columnId; targetSubgroupId = overData.subgroupId }
      else if (overData?.type === 'column') { targetColumnId = overData.columnId; targetSubgroupId = null }
      else return

      // lock only ever restricts adding/editing leads directly in a column now - it no longer
      // blocks drag-and-drop; a locked column (e.g. a terminal "Won"/"Lost" stage) should still be
      // able to receive/release cards by dragging, that was never the point of locking it

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

  const scrollToColumn = (id) => columnRefs.current[id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })

  return (
    <div>
      <div className='sticky top-0 z-20 bg-bg pb-4 mb-2 border-b border-hairline'>
        <div className='flex items-center gap-2.5 mb-3 flex-wrap'>
          <Logo size={28} withWordmark={false} />
          <p className='font-display text-2xl text-ink'>{t('navLeads')}</p>
          <span className='text-sm font-medium text-muted'>{t('totalLeadsCountLabel', { count: leads.length })}</span>
          <button onClick={() => setShowConvertedOnly(v => !v)}
            className={`text-sm font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-colors ${showConvertedOnly ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'}`}>
            <GraduationCap size={13} strokeWidth={2} /> {t('convertedLeadsCountLabel', { count: convertedCount })}
          </button>
        </div>
        <div className='flex flex-col md:flex-row gap-2'>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchLeadsPlaceholder')} className={`${FIELD} w-full md:max-w-xs`} />
          <Select className='w-full md:w-40' value={sourceFilter} onChange={setSourceFilter} placeholder={t('anySource')}
            options={[{ value: '', label: t('anySource') }, ...leadSources.map(s => ({ value: s.name, label: s.name }))]} />
          <button onClick={() => setShowDateFilter(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${showDateFilter || dateFilterFrom || dateFilterTo ? 'bg-accent text-white dark:bg-[#4F46E5]' : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200'}`}>
            <Calendar size={14} strokeWidth={ICON_STROKE} /> {t('dateAddedFilterBtn')}
          </button>
          <button onClick={() => setShowSourceManager(true)} className='px-3 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none text-sm font-medium flex items-center justify-center gap-1.5 transition-colors'>
            <Settings size={14} /> {t('manageSourcesBtn')}
          </button>
          <button onClick={() => setIsCompact(v => !v)} title={isCompact ? t('expandCardsHint') : t('compactCardsHint')}
            className='px-3 py-2 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200 dark:border-none text-sm font-medium flex items-center justify-center gap-1.5 transition-colors'>
            {isCompact ? <Lock size={14} strokeWidth={ICON_STROKE} /> : <Unlock size={14} strokeWidth={ICON_STROKE} />} {t('compactViewBtn')}
          </button>
          <button onClick={toggleSelectMode}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${selectMode ? 'bg-accent text-white dark:bg-[#4F46E5]' : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-slate-200'}`}>
            <CheckSquare size={14} strokeWidth={ICON_STROKE} /> {selectMode ? t('exitSelectModeBtn') : t('selectLeadsBtn')}
          </button>
        </div>

        {showDateFilter && (
          <div className='flex flex-wrap items-end gap-2 mt-2'>
            <div>
              <p className='text-xs text-muted mb-1'>{t('dateFromLabel')}</p>
              <DatePicker value={dateFilterFrom} onChange={setDateFilterFrom} />
            </div>
            <div>
              <p className='text-xs text-muted mb-1'>{t('dateToLabel')}</p>
              <DatePicker value={dateFilterTo} onChange={setDateFilterTo} />
            </div>
            {(dateFilterFrom || dateFilterTo) && (
              <button onClick={() => { setDateFilterFrom(''); setDateFilterTo('') }} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-muted text-sm font-medium'>{t('clearFilterBtn')}</button>
            )}
          </div>
        )}

        {selectMode && (
          <div className='flex flex-wrap items-center gap-2 mt-2 bg-accent-soft dark:bg-[#1E1B4B] rounded-xl p-2.5'>
            <span className='text-sm font-medium text-ink px-1'>{t('leadsSelectedCountLabel', { count: selectedIds.size })}</span>
            <Select className='w-48' value={bulkTargetColumn} onChange={setBulkTargetColumn} placeholder={t('moveToColumnPlaceholder')}
              options={columns.map(c => ({ value: c._id, label: c.name }))} />
            <button onClick={submitBulkMove} disabled={!bulkTargetColumn || selectedIds.size === 0 || bulkMoving}
              className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50 dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA]'>
              {bulkMoving ? t('applyingDiscountBtn') : t('moveSelectedBtn')}
            </button>
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-muted text-sm font-medium'>{t('clearSelectionBtn')}</button>
            )}
          </div>
        )}

        {/* jump-to-column tabs, mobile only - the board itself scrolls one full-width column at a
            time (snap-x below), so these give a sense of "which column, how many" without needing
            page dots */}
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
                  onSaveLead={onSaveLead} onAddLead={onAddLead}
                  onEditForm={(formId) => setFormWizard({ formId })} isCompact={isCompact}
                  onConvert={setConvertingLead} onViewStudent={(studentId) => navigate('/students/' + studentId)}
                  selectMode={selectMode} selectedIds={selectedIds} onToggleSelect={onToggleSelect} onSelectMany={onSelectMany} />
              </div>
            ))}
          </SortableContext>

          <div className='w-[calc(100vw-32px)] md:w-80 flex-shrink-0 snap-center md:snap-align-none'>
            {addingColumn ? (
              <form onSubmit={submitNewColumn} className='bg-[#F1F5F9] dark:bg-[#1E293B]/40 rounded-xl p-3 flex gap-2'>
                <input autoFocus value={newColumnName} onChange={e => setNewColumnName(e.target.value)} placeholder={t('columnNamePlaceholder')}
                  className='flex-1 px-2 py-1.5 rounded-lg bg-white border border-slate-200 dark:bg-[#1E293B] dark:border-none text-sm dark:text-slate-200' />
                <button type='submit' className='px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA]'>
                  <Plus size={14} />
                </button>
              </form>
            ) : (
              <button onClick={() => setAddingColumn(true)} className='w-full min-h-[100px] md:min-h-0 md:py-3 rounded-2xl md:rounded-xl border-2 md:border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 text-sm hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex items-center justify-center gap-1.5'>
                <Plus size={14} /> {t('addColumnBtn')}
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

      {convertingLead && (
        <ConvertLeadModal lead={convertingLead} onClose={() => setConvertingLead(null)} onConverted={handleConverted} t={t} />
      )}
    </div>
  )
}

export default Leads
