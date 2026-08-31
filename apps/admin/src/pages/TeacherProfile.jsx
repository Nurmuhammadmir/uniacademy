import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Menu } from '@headlessui/react'
import { Phone, Calendar, MoreHorizontal, Eye } from 'lucide-react'
import { AdminContext } from '../context/AdminContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import Select from '../components/Select.jsx'
import { formatMoney } from '../lib/format.js'

const SALARY_KIND_STYLE = {
  salary_accrual: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  salary_payout: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
}

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
  conducted: 'bg-accent dark:bg-[#4F46E5] text-white',
  not_conducted: 'bg-red-500 text-white',
  substituted: 'bg-blue-400 text-white',
}
const STATUS_ICON = { unmarked: '—', conducted: '✓', not_conducted: '✕', substituted: '⇄' }
const GROUP_STATUS_BADGE = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  completed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400',
}

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
    <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center p-4' onClick={onClose}>
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
                <Select className='flex-1' value={substituteId} onChange={setSubstituteId} placeholder={t('selectSubstituteLabel')}
                  options={teachers.map(tc => ({ value: tc._id, label: tc.name }))} />
                <button onClick={markSubstituted} disabled={!substituteId} className='px-3 py-2 rounded-lg bg-accent dark:bg-[#4F46E5] dark:hover:bg-[#5D55FA] dark:shadow-lg dark:shadow-indigo-500/10 text-white text-sm font-medium disabled:opacity-50'>{t('save')}</button>
              </div>
            ) : (
              <button onClick={() => setShowSubstituteForm(true)} className='text-accent dark:text-[#818CF8] text-xs font-medium mb-3'>{t('markSubstitutedBtn')}</button>
            )}

            <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote}
              placeholder={t('teacherNotePlaceholder')} rows={2} className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm mb-4' />

            <p className='text-ink text-sm font-medium mb-2'>{t('studentsLabel')}</p>
            <div className='flex flex-col gap-1'>
              {data.students.map(s => (
                <div key={s.studentId} className='flex justify-between text-sm bg-bg border border-hairline rounded-lg px-3 py-2'>
                  <span className='text-ink'>{s.name}</span>
                  <span className={s.status === 'present' ? 'text-accent dark:text-[#818CF8]' : 'text-muted'}>{t('lessonStudentStatus_' + s.status)}</span>
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

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6'>
        {/* left column - personal card */}
        <div className='lg:col-span-1'>
          <div className='bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex flex-col gap-4'>
            <p className='text-xl font-bold text-slate-800 dark:text-white'>{data.teacher.name}</p>
            <div className='flex flex-col gap-2'>
              <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300'>
                <Phone size={15} strokeWidth={1.5} className='text-slate-400 dark:text-slate-500 flex-shrink-0' />
                <span className='font-mono'>{data.teacher.phone}</span>
              </div>
              <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300'>
                <Calendar size={15} strokeWidth={1.5} className='text-slate-400 dark:text-slate-500 flex-shrink-0' />
                <span>{t('workingSince', { date: new Date(data.employedSince).toLocaleDateString() })}</span>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3 mt-2'>
              <div className='bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3'>
                <p className='text-slate-400 dark:text-slate-500 text-xs mb-1'>{t('activeGroupsLabel')}</p>
                <p className='font-bold text-2xl text-slate-800 dark:text-slate-100'>{data.activeGroupsCount}</p>
              </div>
              <div className='bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3'>
                <p className='text-slate-400 dark:text-slate-500 text-xs mb-1'>{t('currentStudents')}</p>
                <p className='font-bold text-2xl text-slate-800 dark:text-slate-100'>{data.totalStudents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* right column - attendance journal + groups */}
        <div className='lg:col-span-2 flex flex-col gap-6'>
          <div>
            <p className='text-ink font-medium mb-2'>{t('attendanceTitle')}</p>
            <div className='bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm'>
              <div className='inline-flex gap-1 bg-slate-100 dark:bg-slate-800/40 rounded-lg p-1 mb-3 overflow-x-auto max-w-full'>
                {monthOptions().map(m => (
                  <button key={m} onClick={() => setMonth(m)}
                    className={`plain px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${m === month ? 'bg-white dark:bg-[#1E293B] text-[#1D1D1F] dark:text-[#F8FAFC] shadow-sm' : 'text-slate-500 dark:text-[#94A3B8]'}`}>
                    {new Date(m + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                  </button>
                ))}
              </div>

              {!grid ? <p className='text-muted text-sm'>{t('loading')}</p> : (
                <>
                  <div className='flex items-center justify-between text-xs text-muted mb-1.5'>
                    <span>{t('percentAttended', { percent: grid.stats.percent })}</span>
                    <span>{grid.stats.conducted}/{grid.stats.total}</span>
                  </div>
                  <div className='w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 overflow-hidden'>
                    <div className='h-full rounded-full bg-accent dark:bg-[#4F46E5] transition-all' style={{ width: `${grid.stats.percent}%` }} />
                  </div>

                  <div className='flex flex-col gap-4'>
                    {grid.groups.map(g => (
                      <div key={g.groupId}>
                        <p className='text-ink text-sm font-medium mb-2'>{g.languageName} · {g.levelName}</p>
                        <div className='grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2'>
                          {g.lessons.map(l => (
                            <button key={l.lessonId} onClick={() => setOpenLessonId(l.lessonId)} className='plain flex flex-col items-center gap-1'>
                              <span className='text-[10px] text-muted whitespace-nowrap'>{new Date(l.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                              <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${STATUS_STYLE[l.teacherStatus]}`}>
                                {STATUS_ICON[l.teacherStatus]}
                              </span>
                              <span className='text-[10px] text-muted'>{t('weekday_' + WEEKDAY_KEYS[l.dayOfWeek])}</span>
                            </button>
                          ))}
                          {g.lessons.length === 0 && <p className='text-muted text-xs col-span-full'>{t('noLessonsThisMonth')}</p>}
                        </div>
                      </div>
                    ))}
                    {grid.groups.length === 0 && <p className='text-muted text-sm'>{t('noGroupsYetPlain')}</p>}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>{t('salaryHistoryTitle')}</p>
            <div className='bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm max-h-80 overflow-y-auto'>
              {data.salaryHistory.length === 0 ? (
                <p className='text-muted text-sm'>{t('noSalaryHistoryYet')}</p>
              ) : (
                <div className='flex flex-col gap-2'>
                  {data.salaryHistory.map(e => (
                    <div key={e._id} className='flex items-start justify-between gap-3 text-sm border-b border-slate-50 dark:border-slate-800/80 last:border-0 pb-2 last:pb-0'>
                      <div className='min-w-0'>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-1 ${SALARY_KIND_STYLE[e.kind] || ''}`}>
                          {t(e.kind === 'salary_accrual' ? 'salaryAccruedBadge' : 'salaryPaidOutBadge')}
                        </span>
                        <p className='text-slate-500 dark:text-slate-400 text-xs truncate'>{e.description}</p>
                        <p className='text-slate-400 dark:text-slate-600 text-[11px] mt-0.5'>{new Date(e.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-mono text-sm flex-shrink-0 ${e.direction === 'increase' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {e.direction === 'increase' ? '+' : '-'}{formatMoney(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className='text-ink font-medium mb-2'>{t('groupsLabel')}</p>
            {data.groups.map(g => (
              <div key={g._id} className='bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl flex justify-between items-center shadow-sm mb-3'>
                <button onClick={() => navigate('/groups/' + g._id)} className='plain flex items-center gap-3 text-left min-w-0 flex-1'>
                  <span className='font-bold text-slate-800 dark:text-slate-100 truncate'>{g.languageId?.name} · {g.levelId?.name}</span>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${GROUP_STATUS_BADGE[g.status] || GROUP_STATUS_BADGE.archived}`}>
                    {g.status}
                  </span>
                </button>
                <Menu as='div' className='relative inline-block text-left flex-shrink-0' onClick={e => e.stopPropagation()}>
                  <Menu.Button className='plain p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800/40 transition-colors'>
                    <MoreHorizontal size={18} strokeWidth={1.5} />
                  </Menu.Button>
                  <Menu.Items anchor='bottom end' transition
                    className='w-40 rounded-xl bg-white dark:bg-[#161F30] border border-slate-100 dark:border-slate-800/80 shadow-xl dark:shadow-black/40 p-1.5 focus:outline-none transition duration-100 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 [--anchor-gap:6px]'>
                    <Menu.Item>
                      {({ focus }) => (
                        <button onClick={() => navigate('/groups/' + g._id)}
                          className={`plain w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left ${focus ? 'bg-slate-100 dark:bg-slate-800/60' : ''} text-slate-700 dark:text-slate-200`}>
                          <Eye size={14} strokeWidth={1.5} /> {t('goToGroupBtn')}
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Menu>
              </div>
            ))}
            {data.groups.length === 0 && <p className='text-muted text-sm'>{t('noGroupsYetPlain')}</p>}
          </div>
        </div>
      </div>

      {openLessonId && (
        <LessonDetailModal lessonId={openLessonId} onClose={() => setOpenLessonId(null)} onStatusChanged={onStatusChanged} t={t} />
      )}
    </div>
  )
}

export default TeacherProfile
