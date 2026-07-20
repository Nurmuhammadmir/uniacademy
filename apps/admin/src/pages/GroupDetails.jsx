import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'
import { currentMonthISO } from '../lib/date.js'

const STATUS_CYCLE = ['unmarked', 'present', 'absent', 'late', 'excused']
const STATUS_STYLE = {
  unmarked: 'bg-bg border border-hairline text-transparent',
  present: 'bg-accent text-white',
  absent: 'bg-red-500 text-white',
  late: 'bg-amber-500 text-white',
  excused: 'bg-blue-400 text-white',
}
const STATUS_ICON = { unmarked: '', present: '✓', absent: '✕', late: 'L', excused: 'E' }

const monthOptions = () => {
  const months = []
  const [y, m] = currentMonthISO().split('-').map(Number)
  for (let i = -6; i <= 2; i++) {
    const d = new Date(Date.UTC(y, m - 1 + i, 1))
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

const TABS = ['davomat', 'materials', 'discount', 'exams', 'history', 'comments']

const GroupDetails = () => {
  const { id: groupId } = useParams()
  const navigate = useNavigate()
  const {
    getGroupDetails, updateGroup, deleteGroup, addStudentToGroup, removeStudentFromGroup,
    getGroupAttendanceGrid, setLessonAttendance,
    getGroupMaterials, addGroupMaterial, deleteGroupMaterial,
    updateGroupDiscount, getGroupExamsTab,
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
  const [discountPercent, setDiscountPercent] = useState(0)
  const [examsTab, setExamsTab] = useState(null)
  const [comments, setComments] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addStudentId, setAddStudentId] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ roomId: '', endDate: '' })
  const [extraLessons, setExtraLessons] = useState(null)
  const [showAddExtraLesson, setShowAddExtraLesson] = useState(false)
  const [extraLessonForm, setExtraLessonForm] = useState({ studentIds: [], teacherId: '', date: '', startTime: '', endTime: '', notes: '' })

  const reload = () => getGroupDetails(groupId).then(g => { if (g) { setGroup(g); setDiscountPercent(g.discountPercent || 0); setEditForm({ roomId: g.roomId?._id || '', endDate: g.endDate ? g.endDate.slice(0, 10) : '' }) } })
  useEffect(() => { reload() }, [groupId])
  useEffect(() => { if (tab === 'davomat') getGroupAttendanceGrid(groupId, month).then(setGrid) }, [tab, month, groupId])
  useEffect(() => { if (tab === 'davomat') getExtraLessons(groupId).then(setExtraLessons) }, [tab, groupId])
  useEffect(() => { if (tab === 'materials') getGroupMaterials(groupId).then(setMaterials) }, [tab, groupId])
  useEffect(() => { if (tab === 'exams') getGroupExamsTab(groupId).then(setExamsTab) }, [tab, groupId])
  useEffect(() => { if (tab === 'comments') getGroupComments(groupId).then(setComments) }, [tab, groupId])

  if (!group) return <p className='text-muted'>{t('loading')}</p>

  const handleCellClick = async (studentIdx, lessonIdx) => {
    const student = grid.students[studentIdx]
    const lesson = grid.lessons[lessonIdx]
    const current = student.attendance[lessonIdx]
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
    // optimistic update
    setGrid(g => {
      const copy = { ...g, students: g.students.map((s, i) => i === studentIdx ? { ...s, attendance: s.attendance.map((a, j) => j === lessonIdx ? next : a) } : s) }
      return copy
    })
    await setLessonAttendance(lesson._id, student.studentId, next)
  }

  const handleDelete = async () => {
    const ok = await deleteGroup(group._id)
    if (ok) navigate('/groups')
  }

  const submitAddStudent = async (e) => {
    e.preventDefault()
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
    const ok = await createExtraLesson(group._id, extraLessonForm)
    if (ok) { setShowAddExtraLesson(false); getExtraLessons(groupId).then(setExtraLessons) }
  }

  const handleDeleteExtraLesson = async (extraLessonId) => {
    const ok = await deleteExtraLesson(group._id, extraLessonId)
    if (ok) getExtraLessons(groupId).then(setExtraLessons)
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const ok = await updateGroup(group._id, { roomId: editForm.roomId, endDate: editForm.endDate })
    if (ok) { setShowEdit(false); reload() }
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

  const saveDiscount = async () => {
    await updateGroupDiscount(group._id, discountPercent)
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
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${group.languageId?.name}-${group.levelId?.name}-roster.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const availableStudents = students.filter(s => s.courses.some(c => c.isActive) && !group.studentIds.some(gs => String(gs._id) === String(s._id)))

  return (
    <div>
      <button onClick={() => navigate('/groups')} className='text-muted text-sm mb-4'>‹ {t('back')}</button>

      <div className='grid grid-cols-3 gap-6'>
        {/* left panel */}
        <div className='col-span-1'>
          <div className='mb-3'>
            {group.name && <p className='font-display text-lg text-ink mb-1'>{group.name}</p>}
            <span className='inline-block px-3 py-1 rounded-full bg-accent-soft text-accent text-xs font-medium mb-2'>{group.levelId?.name}</span>
            <p className='text-muted text-sm'>{group.languageId?.name} · {group.teacherId?.name}</p>
          </div>

          <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-4 relative'>
            <div className='absolute top-4 right-4 flex flex-col gap-3'>
              <button onClick={() => setShowEdit(true)} title={t('edit')} className='text-muted hover:text-accent'>✏️</button>
              <button onClick={handleDelete} title={t('archiveBtn')} className='text-muted hover:text-red-500'>🗑️</button>
              <button onClick={() => setTab('comments')} title={t('messageIconHint')} className='text-muted hover:text-accent'>✉️</button>
              <button onClick={() => setShowAdd(true)} title={t('addStudentBtn')} className='text-muted hover:text-accent'>➕</button>
              <button onClick={() => navigate(`/finance?groupId=${group._id}`)} title={t('paymentsLabel')} className='text-muted hover:text-accent'>💰</button>
            </div>

            <div className='flex flex-col gap-2 pr-10'>
              <div><p className='text-muted text-xs'>{t('scheduleLabel')}</p><p className='text-ink text-sm'>{group.schedulePattern.replaceAll('_', '/')} · {group.time}</p></div>
              <div><p className='text-muted text-xs'>{t('roomLabel')}</p><p className='text-ink text-sm'>{group.roomId?.name || '—'}</p></div>
              <div><p className='text-muted text-xs'>{t('courseDatesLabel')}</p><p className='text-ink text-sm'>{new Date(group.startDate).toLocaleDateString()} — {group.endDate ? new Date(group.endDate).toLocaleDateString() : '—'}</p></div>
            </div>
          </div>

          <div className='flex justify-between items-center mb-2'>
            <p className='text-ink font-medium'>{t('studentsLabel')}</p>
            <button onClick={exportRosterCSV} title={t('exportBtn')} className='text-muted hover:text-accent'>⬇️</button>
          </div>
          <div className='flex flex-col gap-3'>
            {group.studentIds.map((s, i) => (
              <div key={s._id} className='flex justify-between items-center bg-bg-elevated border border-hairline rounded-lg px-3 py-2 text-sm'>
                <button onClick={() => navigate('/students/' + s._id)} className='text-left hover:underline text-ink'>{i + 1}. {s.name}</button>
                <span className='flex items-center gap-3'>
                  <span className='text-muted font-mono text-xs'>{s.phone}</span>
                  <button onClick={() => handleRemoveStudent(s._id)} className='text-muted text-xs'>{t('removeBtn')}</button>
                </span>
              </div>
            ))}
            {group.studentIds.length === 0 && <p className='text-muted text-sm'>{t('notPlacedYet')}</p>}
          </div>
        </div>

        {/* right panel */}
        <div className='col-span-2'>
          <div className='flex gap-2 mb-4 flex-wrap'>
            {TABS.map(tb => (
              <button key={tb} onClick={() => setTab(tb)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === tb ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
                {t(`tab_${tb}`)}
              </button>
            ))}
          </div>

          {tab === 'davomat' && (
            <div>
              <div className='flex justify-between items-center mb-4 gap-2 flex-wrap'>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {monthOptions().map(m => (
                    <button key={m} onClick={() => setMonth(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${m === month ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
                      {new Date(m + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                    </button>
                  ))}
                </div>
                <button onClick={openAddExtraLesson} className='px-3 py-1.5 rounded-lg bg-accent-soft text-accent text-xs font-medium whitespace-nowrap'>+ {t('addExtraLessonBtn')}</button>
              </div>

              {!grid ? <p className='text-muted text-sm'>{t('loading')}</p> : (
                <div className='overflow-x-auto bg-bg-elevated border border-hairline rounded-2xl'>
                  <table className='text-sm border-collapse'>
                    <thead>
                      <tr>
                        <th className='sticky left-0 bg-bg-elevated px-3 py-2 text-left text-muted font-medium border-b border-hairline z-10'>{t('studentsLabel')}</th>
                        {grid.lessons.map(l => (
                          <th key={l._id} className='px-2 py-2 text-center text-muted font-medium border-b border-hairline whitespace-nowrap'>
                            {new Date(l.date).getUTCDate()}
                          </th>
                        ))}
                        {grid.lessons.length === 0 && <th className='px-3 py-2 text-muted font-medium border-b border-hairline'>{t('noLessonsThisMonth')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.students.map((s, si) => (
                        <tr key={s.studentId}>
                          <td className='sticky left-0 bg-bg-elevated px-3 py-2 text-ink border-b border-hairline whitespace-nowrap'>{s.name}</td>
                          {s.attendance.map((status, li) => (
                            <td key={li} className='px-2 py-2 text-center border-b border-hairline'>
                              <button onClick={() => handleCellClick(si, li)} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mx-auto ${STATUS_STYLE[status]}`}>
                                {STATUS_ICON[status]}
                              </button>
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
                  <div key={el._id} className='flex justify-between items-center bg-bg-elevated border border-hairline rounded-lg px-3 py-2.5 text-sm'>
                    <div>
                      <p className='text-ink'>{new Date(el.date).toLocaleDateString()} · {el.startTime}–{el.endTime} · {el.teacherId?.name}</p>
                      <p className='text-muted text-xs'>{el.studentIds.map(s => s.name).join(', ')}{el.notes ? ` · ${el.notes}` : ''}</p>
                    </div>
                    <button onClick={() => handleDeleteExtraLesson(el._id)} className='px-2.5 py-1 rounded-lg bg-bg border border-hairline text-muted text-xs font-medium'>{t('removeBtn')}</button>
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
                  className='flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required />
                <input placeholder={t('materialUrlLabel')} value={materialForm.url} onChange={e => setMaterialForm({ ...materialForm, url: e.target.value })}
                  className='flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' required />
                <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('add')}</button>
              </form>
              <div className='flex flex-col gap-3'>
                {(materials || []).map(m => (
                  <div key={m._id} className='flex justify-between items-center bg-bg-elevated border border-hairline rounded-lg px-3 py-2 text-sm'>
                    <a href={m.url} target='_blank' rel='noreferrer' className='text-accent hover:underline'>{m.title}</a>
                    <button onClick={() => removeMaterial(m._id)} className='text-muted text-xs'>{t('removeBtn')}</button>
                  </div>
                ))}
                {materials && materials.length === 0 && <p className='text-muted text-sm'>{t('noMaterialsYet')}</p>}
              </div>
            </div>
          )}

          {tab === 'discount' && (
            <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 max-w-xs'>
              <p className='text-muted text-xs mb-2'>{t('discountPercentLabel')}</p>
              <div className='flex gap-2 items-center'>
                <input type='number' min='0' max='100' value={discountPercent} onChange={e => setDiscountPercent(Number(e.target.value))}
                  className='w-24 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                <span className='text-muted'>%</span>
                <button onClick={saveDiscount} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
              </div>
              <p className='text-xs text-muted mt-2'>{t('discountInfoHint')}</p>
            </div>
          )}

          {tab === 'exams' && (
            <div>
              {!examsTab ? <p className='text-muted text-sm'>{t('loading')}</p> : (
                <>
                  {examsTab.exam && (
                    <p className='text-muted text-sm mb-3'>{t('examSettingsLine', { duration: examsTab.exam.durationMinutes, pass: examsTab.exam.passScore })}</p>
                  )}
                  <div className='flex flex-col gap-3'>
                    {examsTab.attempts.map(a => (
                      <div key={a._id} className='flex justify-between text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2'>
                        <span className='text-ink'>{a.studentId?.name}</span>
                        <span className={a.passed ? 'text-accent font-mono' : 'text-red-500 font-mono'}>{a.score}%</span>
                      </div>
                    ))}
                    {examsTab.attempts.length === 0 && <p className='text-muted text-sm'>{t('noExamsYetPlain')}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
              <p className='text-sm text-ink mb-1'>{t('groupCreatedOn', { date: new Date(group.createdAt).toLocaleDateString() })}</p>
              <p className='text-sm text-muted mb-1'>{t('groupStatusLine', { status: group.status })}</p>
              <p className='text-sm text-muted'>{t('groupDayLine', { day: group.dayCounter, total: group.levelId?.durationDays || 30 })}</p>
            </div>
          )}

          {tab === 'comments' && (
            <div>
              <form onSubmit={submitComment} className='flex gap-2 mb-4'>
                <input placeholder={t('addCommentPlaceholder')} value={commentText} onChange={e => setCommentText(e.target.value)}
                  className='flex-1 px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' />
                <button type='submit' className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('sendBtn')}</button>
              </form>
              <div className='flex flex-col gap-3'>
                {(comments || []).map(c => (
                  <div key={c._id} className='bg-bg-elevated border border-hairline rounded-lg px-3 py-2'>
                    <div className='flex justify-between items-start'>
                      <p className='text-ink text-sm'>{c.text}</p>
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

      {showAdd && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => setShowAdd(false)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-sm w-full' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-3'>{t('addStudentBtn')}</p>
            <form onSubmit={submitAddStudent} className='flex flex-col gap-3'>
              <select value={addStudentId} onChange={e => setAddStudentId(e.target.value)} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
                <option value=''>{t('selectStudent')}</option>
                {availableStudents.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('addToGroupBtn')}</button>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => setShowEdit(false)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-sm w-full' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-3'>{t('edit')}</p>
            <form onSubmit={submitEdit} className='flex flex-col gap-3'>
              <select value={editForm.roomId} onChange={e => setEditForm({ ...editForm, roomId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                <option value=''>{t('roomLabel')}</option>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
              <input type='date' value={editForm.endDate} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('save')}</button>
            </form>
          </div>
        </div>
      )}

      {showAddExtraLesson && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => setShowAddExtraLesson(false)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-sm w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <p className='font-display text-lg text-ink mb-3'>{t('addExtraLessonBtn')}</p>
            <form onSubmit={submitExtraLesson} className='flex flex-col gap-3'>
              <div>
                <p className='text-xs text-muted mb-1'>{t('studentsLabel')}</p>
                <div className='flex flex-col gap-1.5 max-h-32 overflow-y-auto'>
                  {group.studentIds.map(s => (
                    <label key={s._id} className='flex items-center gap-2 text-sm text-ink'>
                      <input type='checkbox' checked={extraLessonForm.studentIds.includes(s._id)} onChange={() => toggleExtraLessonStudent(s._id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <select value={extraLessonForm.teacherId} onChange={e => setExtraLessonForm({ ...extraLessonForm, teacherId: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required>
                <option value=''>{t('teacherLabel')}</option>
                {teachers.map(tc => <option key={tc._id} value={tc._id}>{tc.name}</option>)}
              </select>
              <input type='date' value={extraLessonForm.date} onChange={e => setExtraLessonForm({ ...extraLessonForm, date: e.target.value })} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
              <div className='flex gap-2'>
                <input type='time' value={extraLessonForm.startTime} onChange={e => setExtraLessonForm({ ...extraLessonForm, startTime: e.target.value })} className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
                <input type='time' value={extraLessonForm.endTime} onChange={e => setExtraLessonForm({ ...extraLessonForm, endTime: e.target.value })} className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
              </div>
              <textarea value={extraLessonForm.notes} onChange={e => setExtraLessonForm({ ...extraLessonForm, notes: e.target.value })} placeholder={t('notesLabel')} rows={2}
                className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              <button type='submit' className='py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('add')}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupDetails
