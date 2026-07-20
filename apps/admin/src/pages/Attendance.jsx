import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { todayISO } from '../lib/date.js'

const monthOptions = () => {
  const months = []
  const now = new Date()
  for (let i = -5; i <= 0; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
    months.push(d.toISOString().slice(0, 7))
  }
  return months
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

const TEACHER_STATUS_STYLE = {
  unmarked: 'bg-bg border border-hairline text-muted',
  conducted: 'bg-accent text-white',
  not_conducted: 'bg-red-500 text-white',
  substituted: 'bg-blue-400 text-white',
}
const TEACHER_STATUS_ICON = { unmarked: '—', conducted: '✓', not_conducted: '✕', substituted: '⇄' }

const STUDENT_STATUS_STYLE = {
  unmarked: 'bg-bg border border-hairline text-muted',
  present: 'bg-accent text-white',
  absent: 'bg-red-500 text-white',
  late: 'bg-yellow-500 text-white',
  excused: 'bg-blue-400 text-white',
}
const STUDENT_STATUS_ICON = { unmarked: '—', present: '✓', absent: '✕', late: '⏱', excused: 'E' }

const LessonDetailModal = ({ lessonId, onClose, onStatusChanged, t }) => {
  const { getLessonDetail, setLessonTeacherStatus, teachers } = useContext(AdminContext)
  const [data, setData] = useState(null)
  const [note, setNote] = useState('')
  const [substituteId, setSubstituteId] = useState('')
  const [showSubstituteForm, setShowSubstituteForm] = useState(false)

  useEffect(() => {
    getLessonDetail(lessonId).then(d => {
      if (d) { setData(d); setNote(d.lesson.teacherNote || ''); setShowSubstituteForm(false) }
    })
  }, [lessonId])

  // whether a lesson was conducted is now always computed from real attendance - never something
  // an admin asserts - so this only ever writes 'substituted' (a genuine human judgment call) or
  // 'unmarked' to clear that flag back to letting the status be computed again
  const saveNote = async () => {
    const lesson = await setLessonTeacherStatus(lessonId, { teacherStatus: data.lesson.isSubstituted ? 'substituted' : 'unmarked', teacherNote: note })
    if (lesson) setData(d => ({ ...d, lesson: { ...d.lesson, teacherNote: lesson.teacherNote } }))
  }

  const markSubstituted = async () => {
    const lesson = await setLessonTeacherStatus(lessonId, { teacherStatus: 'substituted', substituteTeacherId: substituteId || null, teacherNote: note })
    if (lesson) {
      const substituteName = teachers.find(tc => tc._id === substituteId)?.name || null
      setData(d => ({ ...d, lesson: { ...d.lesson, teacherStatus: 'substituted', isSubstituted: true, substituteTeacherName: substituteName } }))
      onStatusChanged(lessonId, 'substituted')
      setShowSubstituteForm(false)
    }
  }

  const clearSubstitution = async () => {
    await setLessonTeacherStatus(lessonId, { teacherStatus: 'unmarked', teacherNote: note })
    const refreshed = await getLessonDetail(lessonId)
    if (refreshed) {
      setData(refreshed)
      onStatusChanged(lessonId, refreshed.lesson.teacherStatus)
    }
  }

  return (
    <div className='fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4' onClick={onClose}>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
        {!data ? <p className='text-muted text-sm'>{t('loading')}</p> : (
          <>
            <p className='font-display text-lg text-ink mb-1'>{data.group.languageName} · {data.group.levelName}</p>
            <p className='text-muted text-sm mb-4'>{data.lesson.date} · {data.lesson.startTime}–{data.lesson.endTime}{data.group.roomName ? ` · ${data.group.roomName}` : ''}</p>

            <p className='text-ink text-sm font-medium mb-2'>{t('teacherStatusLabel')}</p>
            <div className='flex items-center gap-2 mb-1'>
              <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${TEACHER_STATUS_STYLE[data.lesson.teacherStatus]}`}>
                {t('teacherStatus_' + data.lesson.teacherStatus)}
              </span>
              <span className='text-muted text-xs'>{t('teacherStatusComputedHint')}</span>
            </div>

            {data.lesson.isSubstituted ? (
              <div className='flex items-center justify-between bg-bg border border-hairline rounded-lg px-3 py-2 text-sm mb-3'>
                <span className='text-ink'>{data.lesson.substituteTeacherName || '—'}</span>
                <button onClick={clearSubstitution} className='text-muted text-xs font-medium'>{t('clearSubstitutionBtn')}</button>
              </div>
            ) : showSubstituteForm ? (
              <div className='flex gap-2 mb-3'>
                <select value={substituteId} onChange={e => setSubstituteId(e.target.value)} className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                  <option value=''>{t('selectSubstituteLabel')}</option>
                  {teachers.map(tc => <option key={tc._id} value={tc._id}>{tc.name}</option>)}
                </select>
                <button onClick={markSubstituted} disabled={!substituteId} className='px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>{t('save')}</button>
              </div>
            ) : (
              <button onClick={() => setShowSubstituteForm(true)} className='text-accent text-xs font-medium mb-3'>{t('markSubstitutedBtn')}</button>
            )}

            <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote}
              placeholder={t('teacherNotePlaceholder')} rows={2} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm mb-4' />

            <p className='text-ink text-sm font-medium mb-2'>{t('studentsLabel')}</p>
            <div className='flex flex-col gap-2'>
              {data.students.map(s => (
                <div key={s.studentId} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{s.name}</span>
                  <span className={s.status === 'present' ? 'text-accent' : 'text-muted'}>{t('lessonStudentStatus_' + s.status)}</span>
                </div>
              ))}
              {data.students.length === 0 && <p className='text-muted text-sm'>{t('notPlacedYet')}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// per-person real-lesson attendance grid, shared by both "students" and "teachers" mode - the two
// modes hit different endpoints/status enums (getTeacherAttendanceGrid+teacherStatus vs
// getStudentAttendanceGrid+status) but render identically: percent header, then one row per group
// the person belongs to, columns = that group's own real lesson dates (never every calendar day)
const PersonGrid = ({ mode, personId, month, rangeFrom, rangeTo, t }) => {
  const { getTeacherAttendanceGrid, getStudentAttendanceGrid } = useContext(AdminContext)
  const [grid, setGrid] = useState(null)
  const [openLessonId, setOpenLessonId] = useState(null)

  useEffect(() => {
    setGrid(null)
    const load = mode === 'teachers' ? getTeacherAttendanceGrid(personId, month) : getStudentAttendanceGrid(personId, month)
    load.then(d => { if (d) setGrid(d) })
  }, [mode, personId, month])

  const onStatusChanged = (lessonId, status) => {
    setGrid(g => ({
      ...g,
      groups: g.groups.map(gr => ({ ...gr, lessons: gr.lessons.map(l => l.lessonId === lessonId ? { ...l, teacherStatus: status } : l) })),
    }))
  }

  if (!grid) return <p className='text-muted text-sm'>{t('loading')}</p>

  const inRange = (l) => (!rangeFrom || l.date >= rangeFrom) && (!rangeTo || l.date <= rangeTo)
  const styleFor = mode === 'teachers' ? TEACHER_STATUS_STYLE : STUDENT_STATUS_STYLE
  const iconFor = mode === 'teachers' ? TEACHER_STATUS_ICON : STUDENT_STATUS_ICON
  const isAttended = (l) => mode === 'teachers' ? (l.teacherStatus === 'conducted' || l.teacherStatus === 'substituted') : (l.status === 'present' || l.status === 'late')

  const filteredGroups = grid.groups.map(g => ({ ...g, lessons: g.lessons.filter(inRange) }))
  const totalLessons = filteredGroups.reduce((sum, g) => sum + g.lessons.length, 0)
  const attendedLessons = filteredGroups.reduce((sum, g) => sum + g.lessons.filter(isAttended).length, 0)
  const percent = totalLessons > 0 ? Math.round((attendedLessons / totalLessons) * 100) : 0

  return (
    <div className='bg-bg-elevated border border-hairline rounded-2xl p-4'>
      <p className='text-ink font-medium mb-1'>{grid.teacherName || grid.studentName}</p>
      <p className='text-muted text-xs mb-3'>{t('percentAttended', { percent })} · {attendedLessons}/{totalLessons}</p>
      <div className='flex flex-col gap-4'>
        {filteredGroups.map(g => (
          <div key={g.groupId}>
            <p className='text-ink text-sm font-medium mb-2'>{g.languageName} · {g.levelName}</p>
            <div className='flex gap-2 overflow-x-auto pb-1'>
              {g.lessons.map(l => (
                <button key={l.lessonId} onClick={() => setOpenLessonId(l.lessonId)} className='flex flex-col items-center gap-1 flex-shrink-0'>
                  <span className='text-xs text-muted whitespace-nowrap'>{new Date(l.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${styleFor[mode === 'teachers' ? l.teacherStatus : l.status]}`}>
                    {iconFor[mode === 'teachers' ? l.teacherStatus : l.status]}
                  </span>
                  <span className='text-[10px] text-muted'>{t('weekday_' + WEEKDAY_KEYS[l.dayOfWeek])}</span>
                </button>
              ))}
              {g.lessons.length === 0 && <p className='text-muted text-xs'>{t('noLessonsThisMonth')}</p>}
            </div>
          </div>
        ))}
        {filteredGroups.length === 0 && <p className='text-muted text-sm'>{t('noGroupsYetPlain')}</p>}
      </div>

      {openLessonId && (
        <LessonDetailModal lessonId={openLessonId} onClose={() => setOpenLessonId(null)} onStatusChanged={onStatusChanged} t={t} />
      )}
    </div>
  )
}

const Attendance = () => {
  const { getAttendanceOverview, students, teachers } = useContext(AdminContext)
  const { t } = useLanguage()
  const [date, setDate] = useState(todayISO())
  const [data, setData] = useState(false)

  const [mode, setMode] = useState('students')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [personSearch, setPersonSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => { getAttendanceOverview(date).then(setData) }, [date])

  const people = mode === 'teachers' ? teachers : students
  const filteredPeople = useMemo(() => {
    const q = personSearch.trim().toLowerCase()
    if (!q) return people
    return people.filter(p => p.name?.toLowerCase().includes(q) || p.phone?.includes(q))
  }, [people, personSearch])

  const switchMode = (m) => { setMode(m); setSelectedId('') }

  return (
    <div>
      <p className='text-ink font-medium mb-3'>{t('teacherCheckIns')}</p>
      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-8'>
        <div className='flex justify-between items-center mb-3'>
          <p className='text-muted text-sm'>{t('checkedIn')} <span className='font-mono text-accent'>{data ? `${data.teachers.filter(tc => tc.checkedIn).length}/${data.teachers.length}` : '—'}</span></p>
          <input type='date' value={date} onChange={e => setDate(e.target.value)} className='px-3 py-2 rounded-xl bg-bg border border-hairline text-sm' />
        </div>
        {!data ? <p className='text-muted text-sm'>{t('loadingAttendance')}</p> : (
          <div className='flex flex-col gap-3'>
            {data.teachers.map(tc => (
              <div key={tc.teacherId} className='flex justify-between text-sm'>
                <span className={tc.checkedIn ? 'text-ink' : 'text-muted'}>{tc.name}</span>
                <span className={`font-mono text-xs ${tc.checkedIn ? (tc.late ? 'text-red-500' : 'text-accent') : 'text-muted'}`}>
                  {tc.checkedIn ? `${new Date(tc.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${tc.late ? ` · ${t('lateBadge')}` : ''}` : t('notCheckedIn')}
                </span>
              </div>
            ))}
            {data.teachers.length === 0 && <p className='text-muted text-sm'>{t('noTeachersFound')}</p>}
          </div>
        )}
      </div>

      <div className='flex gap-2 mb-4'>
        <button onClick={() => switchMode('students')} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'students' ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>{t('studentsAttendanceTab')}</button>
        <button onClick={() => switchMode('teachers')} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'teachers' ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>{t('teachersAttendanceTab')}</button>
      </div>

      <div className='flex flex-wrap gap-3 items-center mb-4'>
        <div className='flex gap-2 overflow-x-auto'>
          {monthOptions().map(m => (
            <button key={m} onClick={() => setMonth(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${m === month ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
              {new Date(m + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
            </button>
          ))}
        </div>
        <div className='flex gap-2 items-center'>
          <input type='date' value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' title={t('dateFromLabel')} />
          <input type='date' value={rangeTo} onChange={e => setRangeTo(e.target.value)} className='px-3 py-2 rounded-lg bg-bg-elevated border border-hairline text-sm' title={t('dateToLabel')} />
          {(rangeFrom || rangeTo) && (
            <button onClick={() => { setRangeFrom(''); setRangeTo('') }} className='text-muted text-sm'>{t('clearFilters')}</button>
          )}
        </div>
      </div>

      <div className='grid grid-cols-3 gap-6'>
        <div className='col-span-1 bg-bg-elevated border border-hairline rounded-2xl p-4 max-h-[70vh] overflow-y-auto'>
          <input value={personSearch} onChange={e => setPersonSearch(e.target.value)} placeholder={t('searchByNameOrPhone')}
            className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm mb-3' />
          <div className='flex flex-col gap-2'>
            {filteredPeople.map(p => (
              <button key={p._id} onClick={() => setSelectedId(p._id)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${selectedId === p._id ? 'bg-accent-soft text-accent' : 'bg-bg border border-hairline text-ink'}`}>
                {p.name}
              </button>
            ))}
            {filteredPeople.length === 0 && <p className='text-muted text-sm'>{mode === 'teachers' ? t('noTeachersFound') : t('noStudentsYet')}</p>}
          </div>
        </div>

        <div className='col-span-2'>
          {!selectedId ? (
            <p className='text-muted text-sm'>{t('selectPersonHint')}</p>
          ) : (
            <PersonGrid key={mode + selectedId} mode={mode} personId={selectedId} month={month} rangeFrom={rangeFrom} rangeTo={rangeTo} t={t} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Attendance
