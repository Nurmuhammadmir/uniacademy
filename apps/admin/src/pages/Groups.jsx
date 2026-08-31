import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Popover } from '@headlessui/react'
import { FolderOpen, Search, SlidersHorizontal, Eye, MoreHorizontal, Pencil, UserPlus, Archive, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Modal from '../components/Modal.jsx'
import TeacherProfileModal from '../components/TeacherProfileModal.jsx'
import Select from '../components/Select.jsx'
import TimePicker from '../components/TimePicker.jsx'
import DatePicker from '../components/DatePicker.jsx'
import { groupLabel, scheduleDaysLabel, formatMoney } from '../lib/format.js'

const SCHEDULES = ['MON_WED_FRI', 'TUE_THU_SAT']
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MENU_ITEM = 'plain w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors'
// the fixed-pattern picker options (Select dropdowns) - scheduleDaysLabel needs a whole group
// object, this is the same translation but keyed directly off the raw pattern value for use here
const scheduleLabel = (pattern, t) => pattern === 'MON_WED_FRI' ? t('oddDaysTab') : pattern === 'TUE_THU_SAT' ? t('evenDaysTab') : pattern

const formatDMY = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`

// endDate is only ever explicit when an admin overrode it - otherwise it's implied by the level's
// own duration, same fallback recalculateCourseBilling-adjacent group logic already uses elsewhere
const dateRangeLabel = (g) => {
  if (!g.startDate) return '—'
  const start = new Date(g.startDate)
  const end = g.endDate ? new Date(g.endDate) : new Date(start.getTime() + (g.levelId?.durationDays || 30) * 86400000)
  return `${formatDMY(start)} — ${formatDMY(end)}`
}

// one badge per row - "ending soon" is based on the group's real, admin-set endDate (the actual
// course/billing window - see Group.js), NOT the lesson-day counter (that's homework-only pacing
// now, unrelated to the group's real calendar duration). Purely a visual heads-up - confirmed spec:
// the system never touches a group's own status automatically, ever, so this never does anything
// but change color; archiving a group is always the admin's own manual call.
const EndingSoonBadge = ({ g, t }) => {
  if (!g.endDate) return null
  const remaining = Math.ceil((new Date(g.endDate) - new Date()) / 86400000)
  if (remaining > 7) return null
  // red from 1 day out through however long it's been sitting past its end date, amber for the
  // gentler 2-7 day heads-up window before that
  const isUrgent = remaining <= 1
  const label = remaining < 0 ? t('endedDaysAgoBadge', { days: -remaining }) : t('endingSoonBadge', { days: remaining })
  return (
    <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap ${isUrgent
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'}`}>
      {label}
    </span>
  )
}

const GroupRowMenu = ({ group, statusTab, onAddStudent, onEdit, onArchive, onReactivate, onDeletePermanently, t }) => (
  <Menu as='div' className='relative inline-block text-left' onClick={e => e.stopPropagation()}>
    <Menu.Button className='plain p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 transition-colors'>
      <MoreHorizontal size={18} strokeWidth={1.5} />
    </Menu.Button>
    <Menu.Items anchor='bottom end' transition
      className='w-48 rounded-xl bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800/80 shadow-xl dark:shadow-black/40 p-1.5 focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px]'>
      {statusTab === 'active' && (
        <>
          <Menu.Item>{({ active }) => <button onClick={() => onAddStudent(group)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><UserPlus size={14} strokeWidth={1.5} /> {t('addStudentBtn')}</button>}</Menu.Item>
          <Menu.Item>{({ active }) => <button onClick={() => onEdit(group)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><Pencil size={14} strokeWidth={1.5} /> {t('edit')}</button>}</Menu.Item>
          <Menu.Item>{({ active }) => <button onClick={() => onArchive(group._id)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><Archive size={14} strokeWidth={1.5} /> {t('archiveBtn')}</button>}</Menu.Item>
        </>
      )}
      {statusTab === 'archived' && (
        <Menu.Item>{({ active }) => <button onClick={() => onReactivate(group._id)} className={`${MENU_ITEM} text-slate-700 dark:text-slate-300 ${active ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}><RotateCcw size={14} strokeWidth={1.5} /> {t('reactivateBtn')}</button>}</Menu.Item>
      )}
      <Menu.Item>{({ active }) => <button onClick={() => onDeletePermanently(group._id)} className={`${MENU_ITEM} text-rose-600 dark:text-rose-400 ${active ? 'bg-rose-50 dark:bg-rose-500/10' : ''}`}><Trash2 size={14} strokeWidth={1.5} /> {t('deletePermanentlyBtn')}</button>}</Menu.Item>
    </Menu.Items>
  </Menu>
)

// "Ustunlar" (columns) - a compact popover of checkboxes for the three denser/least-essential
// columns, so a smaller screen or a director who only cares about roster counts can declutter
// without losing the data entirely (still one click away)
const ColumnsPopover = ({ visibleCols, onToggle, t }) => (
  <Popover className='relative'>
    <Popover.Button className='plain h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 transition-colors'>
      <Eye size={15} strokeWidth={1.75} /> {t('columnsBtn')}
    </Popover.Button>
    <Popover.Panel transition
      className='absolute z-20 mt-2 right-0 bg-white dark:bg-[#161F30] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800/80 p-3 w-52 flex flex-col gap-1 transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'>
      {[['dates', 'colDatesLabel'], ['room', 'colRoomLabel']].map(([key, labelKey]) => (
        <label key={key} className='flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer'>
          <input type='checkbox' checked={visibleCols[key]} onChange={() => onToggle(key)} />
          {t(labelKey)}
        </label>
      ))}
    </Popover.Panel>
  </Popover>
)

const Groups = () => {
  const {
    groups, getGroups, createGroup, updateGroup, deleteGroup, permanentlyDeleteGroup, unarchiveGroup,
    teachers, languages, levels, getLevels, rooms, pricingList,
    students, addStudentToGroup, removeStudentFromGroup, suggestGroup,
    getTeacherProfile,
  } = useContext(AdminContext)
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [statusTab, setStatusTab] = useState('active')
  const [nameSearch, setNameSearch] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [daysFilter, setDaysFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [visibleCols, setVisibleCols] = useState({ dates: true, room: true })

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [addingTo, setAddingTo] = useState(null)
  const [viewingTeacherId, setViewingTeacherId] = useState(null)
  const [form, setForm] = useState({ name: '', languageId: '', levelId: '', teacherId: '', roomId: '', schedulePattern: SCHEDULES[0], customDays: [], time: '18:00', startDate: '', endDate: '' })
  // narrows the course picker below by category first - purely a UI filter, never sent to the
  // server (createGroup only ever needs languageId). Once a branch runs 40+ courses, scanning one
  // flat list by eye stops being practical.
  const [courseCategory, setCourseCategory] = useState('')
  const [editForm, setEditForm] = useState({ name: '', teacherId: '', schedulePattern: '', time: '', capacity: 20, startDate: '', endDate: '' })
  const [studentId, setStudentId] = useState('')
  const [suggestion, setSuggestion] = useState(null)

  useEffect(() => { if (form.languageId) getLevels(form.languageId) }, [form.languageId])

  // price is set per COURSE (per language), not per level - shown as a reference the moment a
  // language is picked, so the admin knows what this group's price will be before submitting (it's
  // locked onto the group automatically server-side, same number, not manually typed here)
  const coursePriceFor = (languageId) => pricingList.find(p => String(p.languageId?._id || p.languageId) === String(languageId))?.monthlyPrice ?? null

  // director-managed tags (see Language.categoryIds/CourseCategory.js) - a course can carry several,
  // so this filter matches any course that has the selected tag attached. Only actually useful once
  // there are enough distinct tags to bother narrowing by.
  const courseCategories = Object.values(
    languages.reduce((acc, l) => {
      for (const c of (l.categoryIds || [])) acc[c._id] = c
      return acc
    }, {})
  ).sort((a, b) => a.name.localeCompare(b.name))
  const languagesForPicker = courseCategory
    ? languages.filter(l => (l.categoryIds || []).some(c => c._id === courseCategory))
    : languages

  const toggleCol = (key) => setVisibleCols(v => ({ ...v, [key]: !v[key] }))

  const visibleGroups = groups.filter(g => {
    if (g.status !== statusTab) return false
    if (nameSearch && !groupLabel(g).toLowerCase().includes(nameSearch.trim().toLowerCase())) return false
    if (teacherFilter && g.teacherId?._id !== teacherFilter) return false
    if (languageFilter && g.languageId?._id !== languageFilter) return false
    if (daysFilter && g.schedulePattern !== daysFilter) return false
    if (dateFromFilter && (!g.startDate || g.startDate.slice(0, 10) < dateFromFilter)) return false
    if (dateToFilter && (!g.startDate || g.startDate.slice(0, 10) > dateToFilter)) return false
    return true
  })

  const submitCreate = async (e) => {
    e.preventDefault()
    // Select/TimePicker/DatePicker below replace native <select>/<input required> fields, which lets
    // a required-but-empty value slip past HTML5's own validation - guard here instead, with a
    // specific toast naming exactly which field is missing rather than just silently doing nothing.
    // Level is only required when this course actually HAS levels defined (levels here is already
    // scoped to form.languageId - see the useEffect above) - a course can legitimately have zero levels.
    const levelRequired = levels.length > 0
    if (!form.languageId) { toast.error(t('noCourseSelectedWarning')); return }
    if (levelRequired && !form.levelId) { toast.error(t('noLevelSelectedWarning')); return }
    if (!form.teacherId) { toast.error(t('noTeacherSelectedWarning')); return }
    if (!form.roomId) { toast.error(t('noRoomSelectedWarning')); return }
    if (!form.time) { toast.error(t('noTimeSelectedWarning')); return }
    if (!form.startDate) { toast.error(t('noStartDateSelectedWarning')); return }
    if (!form.endDate) { toast.error(t('noEndDateSelectedWarning')); return }
    const ok = await createGroup({ ...form, customDays: form.schedulePattern === 'CUSTOM' ? form.customDays : [] })
    if (ok) {
      setShowCreate(false)
      setForm({ name: '', languageId: '', levelId: '', teacherId: '', roomId: '', schedulePattern: SCHEDULES[0], customDays: [], time: '18:00', startDate: '', endDate: '' })
      setCourseCategory('')
    }
  }

  const toggleCustomDay = (d) => setForm(f => ({ ...f, customDays: f.customDays.includes(d) ? f.customDays.filter(x => x !== d) : [...f.customDays, d] }))

  const openEdit = (group) => {
    setEditing(group)
    setEditForm({
      name: group.name || '', teacherId: group.teacherId?._id, schedulePattern: group.schedulePattern, time: group.time, capacity: group.capacity,
      startDate: group.startDate ? group.startDate.slice(0, 10) : '', endDate: group.endDate ? group.endDate.slice(0, 10) : '',
    })
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateGroup(editing._id, editForm)
    if (ok) setEditing(null)
  }

  const openAdd = async (group) => {
    setAddingTo(group)
    const s = await suggestGroup(group.languageId._id || group.languageId, group.levelId?._id || group.levelId)
    setSuggestion(s)
  }

  const submitAdd = async (e) => {
    e.preventDefault()
    if (!studentId) return
    const ok = await addStudentToGroup(addingTo._id, studentId)
    if (ok) { setAddingTo(null); setStudentId('') }
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-5'>
        <div className='flex items-baseline gap-3'>
          <p className='text-2xl font-bold text-slate-900 dark:text-white'>{t('groupsTitle')}</p>
          <span className='text-sm font-medium text-slate-400 dark:text-slate-600'>
            {t('groupsCountLabel', { count: visibleGroups.length })}
          </span>
        </div>
        <button onClick={() => setShowCreate(true)}
          className='bg-[#0066CC] hover:bg-[#0055B3] dark:bg-[#4F46E5] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm'>
          {t('newGroup')}
        </button>
      </div>

      <div className='flex gap-2 mb-4'>
        {[{ key: 'active', label: t('activeTab') }, { key: 'archived', label: t('archivedTab') }].map(s => (
          <button key={s.key} onClick={() => setStatusTab(s.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${statusTab === s.key ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg-elevated border border-hairline text-muted'}`}>{s.label}</button>
        ))}
      </div>

      <div className='flex gap-2 mb-4'>
        <div className='relative flex-1 max-w-xs'>
          <Search size={15} strokeWidth={1.5} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600' />
          <input value={nameSearch} onChange={e => setNameSearch(e.target.value)} placeholder={t('groupNameSearchPlaceholder')}
            className='w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent dark:text-slate-200' />
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilters ? 'bg-blue-50 text-blue-700 dark:bg-[#1E1B4B] dark:text-[#818CF8]' : 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300'}`}>
          <SlidersHorizontal size={15} strokeWidth={1.75} /> {t('filterBtn')}
        </button>
        <ColumnsPopover visibleCols={visibleCols} onToggle={toggleCol} t={t} />
      </div>

      {showFilters && (
        <div className='flex flex-wrap gap-3 mb-5 bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4'>
          <div className='w-44'>
            <p className='text-xs text-muted mb-1'>{t('teacherFilterLabel')}</p>
            <Select value={teacherFilter} onChange={setTeacherFilter} placeholder={t('anyTeacher')}
              options={[{ value: '', label: t('anyTeacher') }, ...teachers.map(t2 => ({ value: t2._id, label: t2.name }))]} />
          </div>
          <div className='w-44'>
            <p className='text-xs text-muted mb-1'>{t('courseFilterLabel')}</p>
            <Select value={languageFilter} onChange={setLanguageFilter} placeholder={t('anyCourse')}
              options={[{ value: '', label: t('anyCourse') }, ...languages.map(l => ({ value: l._id, label: l.name }))]} />
          </div>
          <div className='w-44'>
            <p className='text-xs text-muted mb-1'>{t('daysFilterLabel')}</p>
            <Select value={daysFilter} onChange={setDaysFilter} placeholder={t('anyDays')}
              options={[{ value: '', label: t('anyDays') }, ...SCHEDULES.map(s => ({ value: s, label: scheduleLabel(s, t) })), { value: 'CUSTOM', label: t('otherDaysTab') }]} />
          </div>
          <div className='w-40'>
            <p className='text-xs text-muted mb-1'>{t('startDateFilterLabel')}</p>
            <DatePicker value={dateFromFilter} onChange={setDateFromFilter} />
          </div>
          <div className='w-40'>
            <p className='text-xs text-muted mb-1'>{t('endDateFilterLabel')}</p>
            <DatePicker value={dateToFilter} onChange={setDateToFilter} />
          </div>
        </div>
      )}

      <div className='hidden md:block bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left border-b border-slate-100 dark:border-slate-800/80'>
              <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('groupCol')}</th>
              <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('courseCol')}</th>
              <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('teacherCol')}</th>
              <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('daysCol')}</th>
              {visibleCols.dates && <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('lessonDatesCol')}</th>}
              {visibleCols.room && <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('roomCol')}</th>}
              <th className='px-5 py-3 font-medium text-slate-400 dark:text-slate-600 text-xs tracking-wider uppercase'>{t('studentsColShort')}</th>
              <th className='px-5 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {visibleGroups.map(g => (
              <tr key={g._id} onClick={() => navigate('/groups/' + g._id)}
                className='border-b border-slate-100 dark:border-slate-800/80 last:border-0 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors'>
                <td className='px-5 py-4 align-middle'>
                  <p className='font-semibold text-slate-800 dark:text-slate-100'>{groupLabel(g)}</p>
                  <EndingSoonBadge g={g} t={t} />
                </td>
                <td className='px-5 py-4 align-middle text-slate-600 dark:text-slate-300'>{g.languageId?.name}{g.levelId?.name ? ` · ${g.levelId.name}` : ''}</td>
                <td className='px-5 py-4 align-middle text-slate-600 dark:text-slate-300'>{g.teacherId?.name}</td>
                <td className='px-5 py-4 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap'>{scheduleDaysLabel(g, t)} · {g.time}</td>
                {visibleCols.dates && <td className='px-5 py-4 align-middle text-slate-600 dark:text-slate-300 whitespace-nowrap'>{dateRangeLabel(g)}</td>}
                {visibleCols.room && <td className='px-5 py-4 align-middle text-slate-600 dark:text-slate-300'>{g.roomId?.name || '—'}</td>}
                <td className='px-5 py-4 align-middle'>
                  <span className='font-bold text-slate-800 dark:text-slate-100'>{g.studentIds.length}</span>
                  <span className='text-muted text-xs'>/{g.capacity}</span>
                </td>
                <td className='w-12 pr-4 py-4 align-middle text-right whitespace-nowrap' onClick={e => e.stopPropagation()}>
                  <GroupRowMenu group={g} statusTab={statusTab} onAddStudent={openAdd} onEdit={openEdit}
                    onArchive={deleteGroup} onReactivate={unarchiveGroup} onDeletePermanently={permanentlyDeleteGroup} t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleGroups.length === 0 && (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <FolderOpen className='text-slate-300 w-12 h-12 mb-4 dark:text-slate-600' />
            <p className='text-base font-semibold text-[#1D1D1F] dark:text-[#F8FAFC]'>{t('noGroupsMatchFilters')}</p>
            <p className='text-sm text-slate-400 mt-1 dark:text-slate-600'>{t('noGroupsHint')}</p>
          </div>
        )}
      </div>

      <div className='block md:hidden flex flex-col gap-2.5'>
        {visibleGroups.length === 0 && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <FolderOpen className='text-slate-300 w-10 h-10 mb-3 dark:text-slate-600' />
            <p className='text-sm font-semibold text-[#1D1D1F] dark:text-[#F8FAFC]'>{t('noGroupsMatchFilters')}</p>
            <p className='text-xs text-slate-400 mt-1 dark:text-slate-600'>{t('noGroupsHint')}</p>
          </div>
        )}
        {visibleGroups.map(g => (
          <button key={g._id} onClick={() => navigate('/groups/' + g._id)}
            className='plain bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm dark:shadow-black/40 text-left w-full'>
            <div className='flex justify-between items-start gap-2'>
              <div className='min-w-0'>
                <p className='font-semibold text-[#1D1D1F] dark:text-[#F8FAFC] text-sm truncate'>{groupLabel(g)}</p>
                <p className='text-xs text-slate-400 dark:text-slate-600 mt-0.5 truncate'>
                  {g.languageId?.name}{g.levelId?.name ? ` · ${g.levelId.name}` : ''}
                </p>
              </div>
              <div className='flex items-center gap-1 flex-shrink-0' onClick={e => e.stopPropagation()}>
                <GroupRowMenu group={g} statusTab={statusTab} onAddStudent={openAdd} onEdit={openEdit}
                  onArchive={deleteGroup} onReactivate={unarchiveGroup} onDeletePermanently={permanentlyDeleteGroup} t={t} />
              </div>
            </div>
            <EndingSoonBadge g={g} t={t} />
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-xs text-slate-500 dark:text-slate-400'>
              <span>{g.teacherId?.name || '—'}</span>
              <span className='text-slate-300 dark:text-slate-700'>·</span>
              <span className='whitespace-nowrap'>{scheduleDaysLabel(g, t)} · {g.time}</span>
              {visibleCols.room && g.roomId?.name && (<><span className='text-slate-300 dark:text-slate-700'>·</span><span>{g.roomId.name}</span></>)}
            </div>
            {visibleCols.dates && (
              <p className='text-xs text-slate-400 dark:text-slate-600 mt-1'>{dateRangeLabel(g)}</p>
            )}
            <div className='flex items-center gap-1 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-sm'>
              <span className='font-bold text-slate-800 dark:text-slate-100'>{g.studentIds.length}</span>
              <span className='text-muted text-xs'>/{g.capacity} {t('studentsColShort')}</span>
            </div>
          </button>
        ))}
      </div>

      {showCreate && (
        <Modal title={t('newGroupModalTitle')} onClose={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className='flex flex-col gap-3'>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('groupNameLabel')}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            {/* purely a UI filter for the picker below, never sent to the server - once a branch
                runs 40+ courses, narrowing by category first beats scrolling one flat list */}
            {courseCategories.length > 0 && (
              <Select value={courseCategory} onChange={(v) => { setCourseCategory(v); setForm({ ...form, languageId: '', levelId: '' }) }} placeholder={t('allCategoriesOption')}
                options={[{ value: '', label: t('allCategoriesOption') }, ...courseCategories.map(c => ({ value: c._id, label: c.name }))]} />
            )}
            <Select forceSearch value={form.languageId} onChange={(v) => setForm({ ...form, languageId: v, levelId: '' })} placeholder={t('languageLabel')}
              options={languagesForPicker.map(l => ({ value: l._id, label: l.name }))} />
            {form.languageId && (
              <p className='text-xs text-muted -mt-2'>
                {t('monthlyPrice')}: {coursePriceFor(form.languageId) != null ? <span className='font-mono text-ink'>{formatMoney(coursePriceFor(form.languageId))}</span> : t('notSetYet')}
              </p>
            )}
            {/* level is only asked for when this course actually has levels defined - a course can
                legitimately have none at all */}
            {form.languageId && levels.length > 0 && (
              <Select value={form.levelId} onChange={(v) => setForm({ ...form, levelId: v })} placeholder={t('levelLabel')}
                options={levels.map(l => ({ value: l._id, label: l.name }))} />
            )}
            <Select value={form.teacherId} onChange={(v) => setForm({ ...form, teacherId: v })} placeholder={t('teacherLabel')}
              options={teachers.map(t2 => ({ value: t2._id, label: t2.name }))} />
            <Select value={form.roomId} onChange={(v) => setForm({ ...form, roomId: v })} placeholder={t('roomLabel')}
              options={rooms.map(r => ({ value: r._id, label: r.name }))} />
            <Select value={form.schedulePattern} onChange={(v) => setForm({ ...form, schedulePattern: v })}
              options={[...SCHEDULES.map(s => ({ value: s, label: scheduleLabel(s, t) })), { value: 'CUSTOM', label: t('otherDaysTab') }]} />
            {form.schedulePattern === 'CUSTOM' && (
              <div className='flex gap-1 flex-wrap'>
                {WEEKDAY_KEYS.map((key, idx) => (
                  <button type='button' key={key} onClick={() => toggleCustomDay(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${form.customDays.includes(idx) ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>
                    {t('weekday_' + key)}
                  </button>
                ))}
              </div>
            )}
            <TimePicker value={form.time} onChange={(time) => setForm({ ...form, time })} />
            <div className='flex gap-2'>
              <div className='flex-1'>
                <p className='text-xs text-muted mb-1'>{t('startDateFilterLabel')}</p>
                <DatePicker value={form.startDate} onChange={(startDate) => setForm({ ...form, startDate })} />
              </div>
              <div className='flex-1'>
                <p className='text-xs text-muted mb-1'>{t('endDateFilterLabel')}</p>
                <DatePicker value={form.endDate} onChange={(endDate) => setForm({ ...form, endDate })} />
              </div>
            </div>
            <button type='submit' className='py-3 rounded-lg bg-accent text-white font-medium transition-colors dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('createGroupBtn')}</button>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title={t('editGroupModalTitle', { language: editing.languageId?.name, level: editing.levelId?.name })} onClose={() => setEditing(null)}>
          <form onSubmit={submitEdit} className='flex flex-col gap-3'>
            <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder={t('groupNameLabel')}
              className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
            <Select value={editForm.teacherId} onChange={(v) => setEditForm({ ...editForm, teacherId: v })}
              options={teachers.map(t2 => ({ value: t2._id, label: t2.name }))} />
            <Select value={editForm.schedulePattern} onChange={(v) => setEditForm({ ...editForm, schedulePattern: v })}
              options={SCHEDULES.map(s => ({ value: s, label: scheduleLabel(s, t) }))} />
            <TimePicker value={editForm.time} onChange={(time) => setEditForm({ ...editForm, time })} />
            <input type='number' placeholder={t('capacityPlaceholder')} value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })} className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
            <div className='flex gap-2'>
              <div className='flex-1'>
                <p className='text-xs text-muted mb-1'>{t('startDateFilterLabel')}</p>
                <DatePicker value={editForm.startDate} onChange={(startDate) => setEditForm({ ...editForm, startDate })} />
              </div>
              <div className='flex-1'>
                <p className='text-xs text-muted mb-1'>{t('endDateFilterLabel')}</p>
                <DatePicker value={editForm.endDate} onChange={(endDate) => setEditForm({ ...editForm, endDate })} />
              </div>
            </div>
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('saveChanges')}</button>
          </form>
        </Modal>
      )}

      {addingTo && (
        <Modal title={t('addStudentToGroupModalTitle', { language: addingTo.languageId?.name, level: addingTo.levelId?.name })} onClose={() => setAddingTo(null)}>
          {suggestion && suggestion._id !== addingTo._id && (
            <p className='text-xs text-muted mb-3'>{t('lessLoadedGroupTip')}</p>
          )}
          <form onSubmit={submitAdd} className='flex flex-col gap-3'>
            <Select value={studentId} onChange={setStudentId} placeholder={t('selectStudent')}
              options={students
                .filter(s => !addingTo.studentIds.some(id => String(id?._id || id) === String(s._id)))
                .map(s => ({ value: s._id, label: s.name }))} />
            <button type='submit' className='py-3 rounded-xl bg-accent text-white font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('addToGroupBtn')}</button>
          </form>
        </Modal>
      )}

      {viewingTeacherId && (
        <TeacherProfileModal teacherId={viewingTeacherId} getTeacherProfile={getTeacherProfile} onClose={() => setViewingTeacherId(null)} />
      )}
    </div>
  )
}

export default Groups
