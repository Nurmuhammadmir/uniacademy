import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Menu } from '@headlessui/react'
import {
  BookOpen, GraduationCap, Wallet, Clock, DoorOpen, Pencil, Archive, Trash2, UserPlus, MessageSquare,
  Download, ChevronLeft, ChevronRight, MoreHorizontal, Check, X as XIcon, Plus,
} from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import DatePicker from '../components/DatePicker.jsx'
import TimePicker from '../components/TimePicker.jsx'
import { formatMoney, scheduleDaysLabel } from '../lib/format.js'
import { currentMonthISO } from '../lib/date.js'

// small pastel square per lesson, not a loud solid-filled circle - dense enough to read as a
// GitHub-commit-style grid at a glance, but every cell (including "not marked yet") still shows
// something rather than sitting blank
const CELL_BG = {
  unmarked: 'bg-slate-100 dark:bg-slate-800/50',
  present: 'bg-emerald-50 dark:bg-emerald-500/10',
  absent: 'bg-rose-50 dark:bg-rose-500/10',
  late: 'bg-amber-50 dark:bg-amber-500/10',
  excused: 'bg-blue-50 dark:bg-blue-500/10',
}
const CellMark = ({ status }) => {
  if (status === 'present') return <Check size={12} strokeWidth={3} className='text-emerald-500 dark:text-emerald-400' />
  if (status === 'absent') return <XIcon size={12} strokeWidth={3} className='text-rose-400 dark:text-rose-400' />
  if (status === 'late') return <span className='text-[9px] font-bold text-amber-600 dark:text-amber-400'>L</span>
  if (status === 'excused') return <span className='text-[9px] font-bold text-blue-500 dark:text-blue-400'>E</span>
  return <span className='w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700' />
}

const TABS = ['davomat', 'materials', 'exams', 'history', 'comments']
const SCHEDULES = ['MON_WED_FRI', 'TUE_THU_SAT']
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const scheduleLabel = (pattern, t) => pattern === 'MON_WED_FRI' ? t('oddDaysTab') : pattern === 'TUE_THU_SAT' ? t('evenDaysTab') : pattern

const shiftMonth = (monthStr, delta) => {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className='flex items-start gap-2.5'>
    <Icon size={16} strokeWidth={1.5} className='w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0' />
    <div className='min-w-0'>
      <p className='text-slate-400 dark:text-slate-600 text-[10px] uppercase tracking-wide'>{label}</p>
      <p className='text-slate-700 dark:text-slate-300 text-xs leading-relaxed truncate'>{value}</p>
    </div>
  </div>
)

const IconBtn = ({ onClick, title, children, danger }) => (
  <button onClick={onClick} title={title}
    className={`plain p-1.5 rounded-lg transition-colors ${danger ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10' : 'text-slate-400 hover:text-accent hover:bg-slate-100 dark:text-slate-500 dark:hover:text-[#818CF8] dark:hover:bg-slate-800/50'}`}>
    {children}
  </button>
)

const StudentRowMenu = ({ onRemove, t }) => (
  <Menu as='div' className='relative inline-block text-left' onClick={e => e.stopPropagation()}>
    <Menu.Button className='plain p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-700/60 transition-colors'>
      <MoreHorizontal size={15} strokeWidth={1.5} />
    </Menu.Button>
    <Menu.Items anchor='bottom end' transition
      className='w-40 rounded-xl bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800/80 shadow-xl dark:shadow-black/40 p-1.5 focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px]'>
      <Menu.Item>{({ active }) => <button onClick={onRemove} className={`plain w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 ${active ? 'bg-rose-50 dark:bg-rose-500/10' : ''}`}><Trash2 size={13} strokeWidth={1.5} /> {t('removeBtn')}</button>}</Menu.Item>
    </Menu.Items>
  </Menu>
)

const GroupDetails = () => {
  const { id: groupId } = useParams()
  const navigate = useNavigate()
  const {
    getGroupDetails, updateGroup, deleteGroup, permanentlyDeleteGroup, addStudentToGroup, removeStudentFromGroup,
    getGroupAttendanceGrid,
    getGroupMaterials, addGroupMaterial, deleteGroupMaterial,
    getGroupExamsTab,
    getGroupComments, addGroupComment, deleteGroupComment,
    getExtraLessons, createExtraLesson, deleteExtraLesson,
    students, rooms, teachers,
  } = useContext(AdminContext)
  const { t } = useLanguage()

  const [group, setGroup] = useState(false)
  const [tab, setTab] = useState('davomat')
  const [month, setMonth] = useState(currentMonthISO())
  const [grid, setGrid] = useState(null)
  const [materials, setMaterials] = useState(null)
  const [materialForm, setMaterialForm] = useState({ title: '', url: '' })
  const [examsTab, setExamsTab] = useState(null)
  const [comments, setComments] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addStudentId, setAddStudentId] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', teacherId: '', roomId: '', schedulePattern: SCHEDULES[0], customDays: [], time: '', durationMinutes: 90, capacity: 20, startDate: '', endDate: '' })
  const [extraLessons, setExtraLessons] = useState(null)
  const [showAddExtraLesson, setShowAddExtraLesson] = useState(false)
  const [extraLessonForm, setExtraLessonForm] = useState({ studentIds: [], teacherId: '', date: '', startTime: '', endTime: '', notes: '' })

  const reload = () => getGroupDetails(groupId).then(g => {
    if (!g) return
    setGroup(g)
    setEditForm({
      name: g.name || '', teacherId: g.teacherId?._id || '', roomId: g.roomId?._id || '',
      schedulePattern: g.schedulePattern === 'CUSTOM' ? 'CUSTOM' : g.schedulePattern, customDays: g.customDays || [],
      time: g.time || '', durationMinutes: g.durationMinutes || 90, capacity: g.capacity || 20,
      startDate: g.startDate ? g.startDate.slice(0, 10) : '', endDate: g.endDate ? g.endDate.slice(0, 10) : '',
    })
  })
  useEffect(() => { reload() }, [groupId])
  useEffect(() => { if (tab === 'davomat') getGroupAttendanceGrid(groupId, month).then(setGrid) }, [tab, month, groupId])
  useEffect(() => { if (tab === 'davomat') getExtraLessons(groupId).then(setExtraLessons) }, [tab, groupId])
  useEffect(() => { if (tab === 'materials') getGroupMaterials(groupId).then(setMaterials) }, [tab, groupId])
  useEffect(() => { if (tab === 'exams') getGroupExamsTab(groupId).then(setExamsTab) }, [tab, groupId])
  useEffect(() => { if (tab === 'comments') getGroupComments(groupId).then(setComments) }, [tab, groupId])

  if (!group) return <p className='text-muted'>{t('loading')}</p>

  const handleDelete = async () => {
    const ok = await deleteGroup(group._id)
    if (ok) navigate('/groups')
  }

  const handlePermanentDelete = async () => {
    const ok = await permanentlyDeleteGroup(group._id)
    if (ok) navigate('/groups')
  }

  const submitAddStudent = async (e) => {
    e.preventDefault()
    if (!addStudentId) return
    const ok = await addStudentToGroup(group._id, addStudentId)
    if (ok) { setShowAdd(false); setAddStudentId(''); reload() }
  }

  const handleRemoveStudent = async (studentId) => {
    await removeStudentFromGroup(group._id, studentId)
    reload()
  }

  const openAddExtraLesson = () => {
    setExtraLessonForm({ studentIds: [], teacherId: group.teacherId?._id || '', date: '', startTime: group.time || '', endTime: '', notes: '' })
    setShowAddExtraLesson(true)
  }

  const toggleExtraLessonStudent = (studentId) => {
    setExtraLessonForm(f => ({
      ...f,
      studentIds: f.studentIds.includes(studentId) ? f.studentIds.filter(id => id !== studentId) : [...f.studentIds, studentId],
    }))
  }

  const submitExtraLesson = async (e) => {
    e.preventDefault()
    if (!extraLessonForm.teacherId || !extraLessonForm.date || !extraLessonForm.startTime || !extraLessonForm.endTime) return
    const ok = await createExtraLesson(group._id, extraLessonForm)
    if (ok) { setShowAddExtraLesson(false); getExtraLessons(groupId).then(setExtraLessons) }
  }

  const handleDeleteExtraLesson = async (extraLessonId) => {
    const ok = await deleteExtraLesson(group._id, extraLessonId)
    if (ok) getExtraLessons(groupId).then(setExtraLessons)
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateGroup(group._id, {
      name: editForm.name, teacherId: editForm.teacherId, roomId: editForm.roomId,
      schedulePattern: editForm.schedulePattern, customDays: editForm.schedulePattern === 'CUSTOM' ? editForm.customDays : [],
      time: editForm.time, durationMinutes: editForm.durationMinutes, capacity: editForm.capacity,
      startDate: editForm.startDate, endDate: editForm.endDate,
    })
    if (ok) { setShowEdit(false); reload() }
  }

  const toggleEditCustomDay = (idx) => {
    setEditForm(f => ({ ...f, customDays: f.customDays.includes(idx) ? f.customDays.filter(d => d !== idx) : [...f.customDays, idx] }))
  }

  const submitMaterial = async (e) => {
    e.preventDefault()
    const ok = await addGroupMaterial(group._id, materialForm)
    if (ok) { setMaterialForm({ title: '', url: '' }); getGroupMaterials(groupId).then(setMaterials) }
  }

  const removeMaterial = async (materialId) => {
    await deleteGroupMaterial(group._id, materialId)
    getGroupMaterials(groupId).then(setMaterials)
  }


  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const ok = await addGroupComment(group._id, commentText)
    if (ok) { setCommentText(''); getGroupComments(groupId).then(setComments) }
  }

  const removeComment = async (commentId) => {
    await deleteGroupComment(group._id, commentId)
    getGroupComments(groupId).then(setComments)
  }

  const exportRosterCSV = () => {
    const rows = [['#', 'Name', 'Phone'], ...group.studentIds.map((s, i) => [i + 1, s.name, s.phone])]
    // see Students.jsx's exportStudentsCSV for why this leading directive line is needed
    const csv = 'sep=,\n' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${group.languageId?.name}-${group.levelId?.name}-roster.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // no payment gate anymore - any student not already in this group can be added; joining posts
  // the group's price as a debt right away (see billingCycle.service.js), they don't need to
  // already be paid up first
  const availableStudents = students.filter(s => !group.studentIds.some(gs => String(gs._id) === String(s._id)))
  const monthLabel = new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div>
      <button onClick={() => navigate('/groups')} className='plain text-muted text-sm mb-4 hover:text-slate-700 dark:hover:text-slate-300 transition-colors'>‹ {t('back')}</button>

      <p className='text-xl font-bold text-slate-800 dark:text-white tracking-tight mb-2'>
        {group.languageId?.name} · {group.levelId?.name} · {group.teacherId?.name}
      </p>

      {/* the course ending (endDate passed) never auto-archives the group - the admin manages that
          manually (they may want to keep it running under a new date range for the same cohort).
          This is just a nudge, not an automatic action. */}
      {group.status === 'active' && group.endDate && new Date(group.endDate) < new Date() && (
        <div className='flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-xl px-4 py-3 mb-4'>
          <p className='text-amber-700 dark:text-amber-400 text-sm'>{t('groupEndedHint')}</p>
          <button onClick={handleDelete} className='px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-medium flex-shrink-0 transition-colors'>{t('archiveBtn')}</button>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
        {/* left column - group info + roster, 1/4 width */}
        <div className='lg:col-span-1'>
          <div className='bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm mb-4'>
            <div className='flex items-center justify-between mb-4 gap-2'>
              {group.name ? <p className='font-semibold text-slate-800 dark:text-slate-100 text-sm truncate'>{group.name}</p> : <span />}
              <div className='flex items-center gap-0.5 flex-shrink-0'>
                <IconBtn onClick={() => setShowEdit(true)} title={t('edit')}><Pencil size={15} strokeWidth={1.5} /></IconBtn>
                <IconBtn onClick={() => setShowAdd(true)} title={t('addStudentBtn')}><UserPlus size={15} strokeWidth={1.5} /></IconBtn>
                <IconBtn onClick={() => setTab('comments')} title={t('messageIconHint')}><MessageSquare size={15} strokeWidth={1.5} /></IconBtn>
                <IconBtn onClick={() => navigate(`/finance?groupId=${group._id}`)} title={t('paymentsLabel')}><Wallet size={15} strokeWidth={1.5} /></IconBtn>
                <IconBtn onClick={handleDelete} title={t('archiveBtn')} danger><Archive size={15} strokeWidth={1.5} /></IconBtn>
                <IconBtn onClick={handlePermanentDelete} title={t('deletePermanentlyBtn')} danger><Trash2 size={15} strokeWidth={1.5} /></IconBtn>
              </div>
            </div>

            <div className='flex flex-col gap-3.5'>
              <InfoRow icon={BookOpen} label={t('courseLabel')} value={`${group.languageId?.name} · ${group.levelId?.name}`} />
              <InfoRow icon={GraduationCap} label={t('teacherLabel')} value={group.teacherId?.name} />
              {group.price != null && <InfoRow icon={Wallet} label={t('priceLabelShort')} value={formatMoney(group.price)} />}
              <InfoRow icon={Clock} label={t('scheduleLabel')} value={`${scheduleDaysLabel(group, t)} · ${group.time}`} />
              <InfoRow icon={DoorOpen} label={t('roomLabel')} value={group.roomId?.name || '—'} />
            </div>
          </div>

          <div className='flex justify-between items-center mb-2 px-1'>
            <p className='text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider'>{t('studentsLabel')}</p>
            <IconBtn onClick={exportRosterCSV} title={t('exportBtn')}><Download size={14} strokeWidth={1.5} /></IconBtn>
          </div>
          <div className='flex flex-col'>
            {group.studentIds.map((s, i) => (
              <div key={s._id} className='flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-[#1E293B] rounded-xl mb-1.5'>
                <button onClick={() => navigate('/students/' + s._id)} className='plain text-left min-w-0'>
                  <p className='font-semibold text-slate-800 dark:text-slate-200 text-xs truncate'>{i + 1}. {s.name}</p>
                </button>
                <span className='flex items-center gap-2 flex-shrink-0'>
                  <span className='text-slate-400 dark:text-slate-600 text-[11px] font-mono'>{s.phone}</span>
                  <StudentRowMenu onRemove={() => handleRemoveStudent(s._id)} t={t} />
                </span>
              </div>
            ))}
            {group.studentIds.length === 0 && <p className='text-muted text-sm'>{t('notPlacedYet')}</p>}
          </div>
        </div>

        {/* right column - one monolithic card holding the segmented tabs + whichever tab is active, 3/4 width */}
        <div className='lg:col-span-3'>
          <div className='bg-white dark:bg-[#161F30] rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm'>
            <div className='inline-flex bg-[#E8E8ED] dark:bg-[#1E293B] rounded-xl p-1 gap-1 mb-6'>
              {TABS.map(tb => (
                <button key={tb} onClick={() => setTab(tb)}
                  className={tab === tb
                    ? 'bg-white dark:bg-[#4F46E5] text-slate-900 dark:text-white rounded-lg px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs px-4 py-1.5 transition-colors'}>
                  {t(`tab_${tb}`)}
                </button>
              ))}
            </div>

            {tab === 'davomat' && (
              <div>
                <div className='flex justify-between items-center mb-4 gap-2 flex-wrap'>
                  <div className='flex items-center gap-2'>
                    <button onClick={() => setMonth(m => shiftMonth(m, -1))}
                      className='plain w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors'>
                      <ChevronLeft size={16} strokeWidth={1.75} />
                    </button>
                    <span className='text-sm font-semibold text-slate-700 dark:text-slate-200 min-w-[130px] text-center capitalize'>{monthLabel}</span>
                    <button onClick={() => setMonth(m => shiftMonth(m, 1))}
                      className='plain w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors'>
                      <ChevronRight size={16} strokeWidth={1.75} />
                    </button>
                    <button onClick={() => setMonth(currentMonthISO())}
                      className='plain h-8 px-3 rounded-lg bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors'>
                      {t('todayBtn')}
                    </button>
                  </div>
                  <button onClick={openAddExtraLesson}
                    className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-xs font-medium whitespace-nowrap dark:bg-[#1E1B4B] dark:text-[#818CF8] flex items-center gap-1.5'>
                    <Plus size={13} strokeWidth={1.75} /> {t('addExtraLessonBtn')}
                  </button>
                </div>

                <p className='text-muted text-xs mb-3'>{t('attendanceReadOnlyHint')}</p>

                {!grid ? <p className='text-muted text-sm'>{t('loading')}</p> : (
                  <div className='overflow-x-auto bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3'>
                    <table className='text-sm border-separate' style={{ borderSpacing: '4px' }}>
                      <thead>
                        <tr>
                          <th className='sticky left-0 bg-slate-50 dark:bg-[#161F30] px-2 py-1.5 text-left text-slate-500 dark:text-slate-400 text-xs font-medium'>{t('studentsLabel')}</th>
                          {grid.lessons.map(l => (
                            <th key={l._id} className='text-[11px] font-medium text-slate-400 dark:text-slate-600 text-center uppercase tracking-wider whitespace-nowrap px-0.5'>
                              {new Date(l.date).getUTCDate()}
                            </th>
                          ))}
                          {grid.lessons.length === 0 && <th className='px-3 py-2 text-muted font-medium'>{t('noLessonsThisMonth')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {grid.students.map((s) => (
                          <tr key={s.studentId}>
                            <td className='sticky left-0 bg-slate-50 dark:bg-[#161F30] px-2 py-1 text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap'>{s.name}</td>
                            {s.attendance.map((status, li) => (
                              <td key={li} className='p-0.5'>
                                <span title={status} className={`w-6 h-6 rounded-md flex items-center justify-center mx-auto ${CELL_BG[status]}`}>
                                  <CellMark status={status} />
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className='text-ink font-medium mt-6 mb-2'>{t('extraLessonsLabel')}</p>
                <div className='flex flex-col gap-2'>
                  {(extraLessons || []).map(el => (
                    <div key={el._id} className='flex justify-between items-center bg-slate-50 dark:bg-[#1E293B] rounded-xl px-3 py-2.5 text-sm'>
                      <div>
                        <p className='text-slate-700 dark:text-slate-300'>{new Date(el.date).toLocaleDateString()} · {el.startTime}–{el.endTime} · {el.teacherId?.name}</p>
                        <p className='text-muted text-xs'>{el.studentIds.map(s => s.name).join(', ')}{el.notes ? ` · ${el.notes}` : ''}</p>
                      </div>
                      <button onClick={() => handleDeleteExtraLesson(el._id)} className='px-2.5 py-1 rounded-lg bg-white dark:bg-[#161F30] border border-slate-200/60 dark:border-slate-800 text-muted text-xs font-medium'>{t('removeBtn')}</button>
                    </div>
                  ))}
                  {extraLessons && extraLessons.length === 0 && <p className='text-muted text-sm'>{t('noExtraLessonsYet')}</p>}
                </div>
              </div>
            )}

            {tab === 'materials' && (
              <div>
                <form onSubmit={submitMaterial} className='flex gap-2 mb-4'>
                  <input placeholder={t('materialTitleLabel')} value={materialForm.title} onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })}
                    className='flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1E293B] border-none text-sm dark:text-slate-200' required />
                  <input placeholder={t('materialUrlLabel')} value={materialForm.url} onChange={e => setMaterialForm({ ...materialForm, url: e.target.value })}
                    className='flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1E293B] border-none text-sm dark:text-slate-200' required />
                  <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('add')}</button>
                </form>
                <div className='flex flex-col gap-2'>
                  {(materials || []).map(m => (
                    <div key={m._id} className='flex justify-between items-center bg-slate-50 dark:bg-[#1E293B] rounded-xl px-3 py-2 text-sm'>
                      <a href={m.url} target='_blank' rel='noreferrer' className='text-accent hover:underline dark:text-[#818CF8]'>{m.title}</a>
                      <button onClick={() => removeMaterial(m._id)} className='text-muted text-xs'>{t('removeBtn')}</button>
                    </div>
                  ))}
                  {materials && materials.length === 0 && <p className='text-muted text-sm'>{t('noMaterialsYet')}</p>}
                </div>
              </div>
            )}

            {tab === 'exams' && (
              <div>
                {!examsTab ? <p className='text-muted text-sm'>{t('loading')}</p> : (
                  <>
                    {examsTab.exam && (
                      <p className='text-muted text-sm mb-3'>{t('examSettingsLine', { duration: examsTab.exam.durationMinutes, pass: examsTab.exam.passScore })}</p>
                    )}
                    <div className='flex flex-col gap-2'>
                      {examsTab.attempts.map(a => (
                        <div key={a._id} className='flex justify-between text-sm bg-slate-50 dark:bg-[#1E293B] rounded-xl px-3 py-2'>
                          <span className='text-slate-700 dark:text-slate-300'>{a.studentId?.name}</span>
                          <span className={a.passed ? 'text-accent font-mono dark:text-[#818CF8]' : 'text-red-500 font-mono dark:text-red-400'}>{a.score}%</span>
                        </div>
                      ))}
                      {examsTab.attempts.length === 0 && <p className='text-muted text-sm'>{t('noExamsYetPlain')}</p>}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className='bg-slate-50 dark:bg-[#1E293B] rounded-2xl p-5'>
                <p className='text-sm text-slate-700 dark:text-slate-300 mb-1'>{t('groupCreatedOn', { date: new Date(group.createdAt).toLocaleDateString() })}</p>
                <p className='text-sm text-muted mb-1'>{t('groupStatusLine', { status: group.status })}</p>
                {group.startDate && group.endDate && (
                  <p className='text-sm text-muted'>{new Date(group.startDate).toLocaleDateString()} — {new Date(group.endDate).toLocaleDateString()}</p>
                )}
              </div>
            )}

            {tab === 'comments' && (
              <div>
                <form onSubmit={submitComment} className='flex gap-2 mb-4'>
                  <input placeholder={t('addCommentPlaceholder')} value={commentText} onChange={e => setCommentText(e.target.value)}
                    className='flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1E293B] border-none text-sm dark:text-slate-200' />
                  <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('sendBtn')}</button>
                </form>
                <div className='flex flex-col gap-2'>
                  {(comments || []).map(c => (
                    <div key={c._id} className='bg-slate-50 dark:bg-[#1E293B] rounded-xl px-3 py-2'>
                      <div className='flex justify-between items-start'>
                        <p className='text-slate-700 dark:text-slate-300 text-sm'>{c.text}</p>
                        <button onClick={() => removeComment(c._id)} className='text-muted text-xs ml-2'>{t('removeBtn')}</button>
                      </div>
                      <p className='text-muted text-xs mt-1'>{c.authorId?.name} · {new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                  {comments && comments.length === 0 && <p className='text-muted text-sm'>{t('noCommentsYet')}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => setShowAdd(false)}>
          <div className='bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-slate-800 dark:text-white mb-3'>{t('addStudentBtn')}</p>
            <form onSubmit={submitAddStudent} className='flex flex-col gap-3'>
              <Select value={addStudentId} onChange={setAddStudentId} placeholder={t('selectStudent')}
                options={availableStudents.map(s => ({ value: s._id, label: s.name }))} />
              <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('addToGroupBtn')}</button>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => setShowEdit(false)}>
          <div className='bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-slate-800 dark:text-white mb-3'>{t('edit')}</p>
            <form onSubmit={submitEdit} className='flex flex-col gap-3'>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder={t('groupNameLabel')}
                className='px-4 py-3 rounded-xl bg-bg border border-hairline' />
              <Select value={editForm.teacherId} onChange={(v) => setEditForm({ ...editForm, teacherId: v })} placeholder={t('teacherLabel')}
                options={teachers.map(t2 => ({ value: t2._id, label: t2.name }))} />
              <Select value={editForm.roomId} onChange={(v) => setEditForm({ ...editForm, roomId: v })} placeholder={t('roomLabel')}
                options={rooms.map(r => ({ value: r._id, label: r.name }))} />
              <Select value={editForm.schedulePattern} onChange={(v) => setEditForm({ ...editForm, schedulePattern: v })}
                options={[...SCHEDULES.map(s => ({ value: s, label: scheduleLabel(s, t) })), { value: 'CUSTOM', label: t('otherDaysTab') }]} />
              {editForm.schedulePattern === 'CUSTOM' && (
                <div className='flex gap-1 flex-wrap'>
                  {WEEKDAY_KEYS.map((key, idx) => (
                    <button type='button' key={key} onClick={() => toggleEditCustomDay(idx)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${editForm.customDays.includes(idx) ? 'bg-accent text-white dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10' : 'bg-bg border border-hairline text-muted'}`}>
                      {t('weekday_' + key)}
                    </button>
                  ))}
                </div>
              )}
              <TimePicker value={editForm.time} onChange={(time) => setEditForm({ ...editForm, time })} />
              <input type='number' placeholder={t('capacityPlaceholder')} value={editForm.capacity} onChange={e => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                className='px-4 py-3 rounded-xl bg-bg border border-hairline' required />
              <div className='flex gap-2'>
                <div className='flex-1'>
                  <p className='text-xs text-muted mb-1'>{t('startDateFilterLabel')}</p>
                  <DatePicker value={editForm.startDate} onChange={(v) => setEditForm({ ...editForm, startDate: v })} />
                </div>
                <div className='flex-1'>
                  <p className='text-xs text-muted mb-1'>{t('endDateFilterLabel')}</p>
                  <DatePicker value={editForm.endDate} onChange={(v) => setEditForm({ ...editForm, endDate: v })} />
                </div>
              </div>
              <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('save')}</button>
            </form>
          </div>
        </div>
      )}

      {showAddExtraLesson && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={() => setShowAddExtraLesson(false)}>
          <div className='bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-slate-800 dark:text-white mb-3'>{t('addExtraLessonBtn')}</p>
            <form onSubmit={submitExtraLesson} className='flex flex-col gap-3'>
              <div>
                <p className='text-xs text-muted mb-1'>{t('studentsLabel')}</p>
                <div className='flex flex-col gap-1.5 max-h-32 overflow-y-auto'>
                  {group.studentIds.map(s => (
                    <label key={s._id} className='flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300'>
                      <input type='checkbox' checked={extraLessonForm.studentIds.includes(s._id)} onChange={() => toggleExtraLessonStudent(s._id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <Select value={extraLessonForm.teacherId} onChange={(v) => setExtraLessonForm({ ...extraLessonForm, teacherId: v })} placeholder={t('teacherLabel')}
                options={teachers.map(tc => ({ value: tc._id, label: tc.name }))} />
              <DatePicker value={extraLessonForm.date} onChange={(v) => setExtraLessonForm({ ...extraLessonForm, date: v })} />
              <div className='flex gap-2'>
                <TimePicker className='flex-1' value={extraLessonForm.startTime} onChange={(v) => setExtraLessonForm({ ...extraLessonForm, startTime: v })} />
                <TimePicker className='flex-1' value={extraLessonForm.endTime} onChange={(v) => setExtraLessonForm({ ...extraLessonForm, endTime: v })} />
              </div>
              <textarea value={extraLessonForm.notes} onChange={e => setExtraLessonForm({ ...extraLessonForm, notes: e.target.value })} placeholder={t('notesLabel')} rows={2}
                className='px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#1E293B] border-none text-sm dark:text-slate-200' />
              <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10'>{t('add')}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupDetails
