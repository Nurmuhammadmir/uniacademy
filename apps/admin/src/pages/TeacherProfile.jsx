import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

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
const STATUS_STYLE = {
  unmarked: 'bg-bg border border-hairline text-muted',
  conducted: 'bg-accent text-white',
  not_conducted: 'bg-red-500 text-white',
  substituted: 'bg-blue-400 text-white',
}
const STATUS_ICON = { unmarked: '—', conducted: '✓', not_conducted: '✕', substituted: '⇄' }

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
  // an admin asserts - so this only ever writes 'substituted' (a genuine human judgment call, since
  // nothing in the attendance data could tell you someone else taught it) or 'unmarked' to clear
  // that flag back to letting the status be computed again
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
              <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${STATUS_STYLE[data.lesson.teacherStatus]}`}>
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
            <div className='flex flex-col gap-1'>
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

const TeacherProfile = () => {
  const { id: teacherId } = useParams()
  const navigate = useNavigate()
  const { getTeacherProfile, getTeacherAttendanceGrid } = useContext(AdminContext)
  const { t } = useLanguage()

  const [data, setData] = useState(false)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [grid, setGrid] = useState(null)
  const [openLessonId, setOpenLessonId] = useState(null)

  useEffect(() => { getTeacherProfile(teacherId).then(d => { if (d) setData(d) }) }, [teacherId])
  useEffect(() => { getTeacherAttendanceGrid(teacherId, month).then(d => { if (d) setGrid(d) }) }, [teacherId, month])

  const onStatusChanged = (lessonId, status) => {
    setGrid(g => ({
      ...g,
      groups: g.groups.map(gr => ({ ...gr, lessons: gr.lessons.map(l => l.lessonId === lessonId ? { ...l, teacherStatus: status } : l) })),
    }))
  }

  if (!data) return <p className='text-muted'>{t('loading')}</p>

  return (
    <div>
      <button onClick={() => navigate('/teachers')} className='text-muted text-sm mb-4'>‹ {t('back')}</button>

      <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-6'>
        <p className='font-display text-xl text-ink'>{data.teacher.name}</p>
        <p className='text-muted text-sm font-mono'>{data.teacher.phone}</p>
        <p className='text-muted text-xs mt-1'>{t('workingSince', { date: new Date(data.employedSince).toLocaleDateString() })}</p>
        <div className='flex gap-6 mt-3'>
          <div>
            <p className='text-muted text-xs'>{t('activeGroupsLabel')}</p>
            <p className='font-mono text-lg text-ink'>{data.activeGroupsCount}</p>
          </div>
          <div>
            <p className='text-muted text-xs'>{t('currentStudents')}</p>
            <p className='font-mono text-lg text-ink'>{data.totalStudents}</p>
          </div>
        </div>
      </div>

      <p className='text-ink font-medium mb-2'>{t('attendanceTitle')}</p>
      <div className='flex gap-2 overflow-x-auto mb-3 pb-1'>
        {monthOptions().map(m => (
          <button key={m} onClick={() => setMonth(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${m === month ? 'bg-accent text-white' : 'bg-bg-elevated border border-hairline text-muted'}`}>
            {new Date(m + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
          </button>
        ))}
      </div>

      {!grid ? <p className='text-muted text-sm'>{t('loading')}</p> : (
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-4 mb-6'>
          <p className='text-muted text-xs mb-3'>{t('percentAttended', { percent: grid.stats.percent })} · {grid.stats.conducted}/{grid.stats.total}</p>
          <div className='flex flex-col gap-4'>
            {grid.groups.map(g => (
              <div key={g.groupId}>
                <p className='text-ink text-sm font-medium mb-2'>{g.languageName} · {g.levelName}</p>
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {g.lessons.map(l => (
                    <button key={l.lessonId} onClick={() => setOpenLessonId(l.lessonId)} className='flex flex-col items-center gap-1 flex-shrink-0'>
                      <span className='text-xs text-muted whitespace-nowrap'>{new Date(l.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${STATUS_STYLE[l.teacherStatus]}`}>
                        {STATUS_ICON[l.teacherStatus]}
                      </span>
                      <span className='text-[10px] text-muted'>{t('weekday_' + WEEKDAY_KEYS[l.dayOfWeek])}</span>
                    </button>
                  ))}
                  {g.lessons.length === 0 && <p className='text-muted text-xs'>{t('noLessonsThisMonth')}</p>}
                </div>
              </div>
            ))}
            {grid.groups.length === 0 && <p className='text-muted text-sm'>{t('noGroupsYetPlain')}</p>}
          </div>
        </div>
      )}

      <p className='text-ink font-medium mb-2'>{t('groupsLabel')}</p>
      <div className='flex flex-col gap-3'>
        {data.groups.map(g => (
          <button key={g._id} onClick={() => navigate('/groups/' + g._id)} className='flex justify-between text-sm bg-bg-elevated border border-hairline rounded-lg px-3 py-2 text-left hover:bg-bg'>
            <span className='text-ink'>{g.languageId?.name} · {g.levelId?.name}</span>
            <span className='text-muted'>{g.status}</span>
          </button>
        ))}
        {data.groups.length === 0 && <p className='text-muted text-sm'>{t('noGroupsYetPlain')}</p>}
      </div>

      {openLessonId && (
        <LessonDetailModal lessonId={openLessonId} onClose={() => setOpenLessonId(null)} onStatusChanged={onStatusChanged} t={t} />
      )}
    </div>
  )
}

export default TeacherProfile
