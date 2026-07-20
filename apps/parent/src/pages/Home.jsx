import React, { useContext, useEffect, useState } from 'react'
import { ParentContext } from '../context/ParentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { formatMoney } from '../lib/format.js'

const STATUS_KEY = { present: 'presentStatus', absent: 'absentStatus', late: 'lateStatus', excused: 'excusedStatus', unmarked: 'unmarkedStatus' }
const STATUS_COLOR = {
  present: 'bg-accent-soft text-accent', absent: 'bg-red-100 text-red-500', late: 'bg-yellow-100 text-yellow-700',
  excused: 'bg-hairline text-muted', unmarked: 'bg-hairline text-muted',
}

const Home = () => {
  const { children, selectedChildId, setSelectedChildId, getChildAttendance, getChildProgress, getChildPayments, getChildExtraLessons } = useContext(ParentContext)
  const { t } = useLanguage()
  const [attendance, setAttendance] = useState(null)
  const [progress, setProgress] = useState(null)
  const [payments, setPayments] = useState(null)
  const [extraLessons, setExtraLessons] = useState(null)

  useEffect(() => {
    if (!selectedChildId) return
    getChildAttendance(selectedChildId).then(setAttendance)
    getChildProgress(selectedChildId).then(setProgress)
    getChildPayments(selectedChildId).then(setPayments)
    getChildExtraLessons(selectedChildId).then(setExtraLessons)
  }, [selectedChildId])

  const selectedChild = children.find(c => c._id === selectedChildId)

  if (children.length === 0) {
    return (
      <div className='px-6 pt-16 text-center'>
        <p className='text-muted'>{t('noChildrenYet')}</p>
      </div>
    )
  }

  return (
    <div className='px-5 pt-10'>
      <p className='font-display text-2xl text-ink mb-1'>{t('home')}</p>
      <p className='text-muted text-sm mb-5'>{selectedChild?.name}</p>

      {children.length > 1 && (
        <div className='flex gap-2 overflow-x-auto mb-5 pb-1'>
          {children.map(c => (
            <button key={c._id} onClick={() => setSelectedChildId(c._id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${c._id === selectedChildId ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      <p className='text-ink font-medium mb-2'>{t('attendanceLabel')}</p>
      <div className='flex flex-col gap-2 mb-5'>
        {(attendance || []).map(g => (
          <div key={g.groupId} className='bg-bg-card border border-hairline rounded-2xl p-4'>
            <p className='text-ink text-sm font-medium mb-1'>{g.language} · {g.level}</p>
            <p className='text-muted text-sm'>{t('attendedSoFar', { present: g.present, total: g.daysSoFar })}</p>
            {g.missed > 0 && <p className='text-muted text-xs mt-1'>{t('missedLabel', { missed: g.missed })}</p>}

            {g.lessonHistory && g.lessonHistory.length > 0 && (
              <>
                <p className='text-muted text-xs font-medium mt-3 mb-1.5'>{t('lessonHistoryLabel')}</p>
                <div className='flex flex-wrap gap-1.5'>
                  {g.lessonHistory.map((l, i) => (
                    <span key={i} className={`text-xs font-mono px-2 py-1 rounded-lg ${STATUS_COLOR[l.status]}`} title={t(STATUS_KEY[l.status])}>
                      {new Date(l.date).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
        {attendance && attendance.length === 0 && <p className='text-muted text-sm'>—</p>}
        {!attendance && <p className='text-muted text-sm'>{t('loading')}</p>}
      </div>

      {extraLessons && extraLessons.length > 0 && (
        <>
          <p className='text-ink font-medium mb-2'>{t('extraLessonsLabel')}</p>
          <div className='flex flex-col gap-2 mb-5'>
            {extraLessons.map(el => (
              <div key={el._id} className='bg-bg-card border border-hairline rounded-2xl p-4'>
                <div className='flex justify-between items-start mb-1'>
                  <p className='text-ink text-sm font-medium'>{el.groupId?.languageId?.name}{el.groupId?.levelId?.name ? ` · ${el.groupId.levelId.name}` : ''}</p>
                  <span className='text-xs font-mono text-accent bg-accent-soft px-2 py-1 rounded-full'>{new Date(el.date).toLocaleDateString()}</span>
                </div>
                <p className='text-muted text-sm'>{el.startTime}–{el.endTime} · {el.teacherId?.name}</p>
                {el.notes && <p className='text-muted text-xs mt-1'>{t('notesLabel')}: {el.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      <p className='text-ink font-medium mb-2'>{t('progressLabel')}</p>
      <div className='flex flex-col gap-2 mb-5'>
        {(progress || []).map(g => (
          <div key={g.groupId} className='bg-bg-card border border-hairline rounded-2xl p-4'>
            <p className='text-ink text-sm font-medium mb-1'>{g.language} · {g.level}</p>
            <p className='text-muted text-sm mb-2'>{t('homeworkCompletionLabel', { percent: g.completionPercent, days: g.daysCompleted, total: g.dayCounter })}</p>
            <div className='h-2 rounded-full bg-hairline overflow-hidden mb-2'>
              <div className='h-full bg-accent rounded-full' style={{ width: `${g.completionPercent}%` }} />
            </div>
            <div className='grid grid-cols-3 gap-2 text-center'>
              <div><p className='text-muted text-xs'>{t('vocabulary')}</p><p className='font-mono text-accent text-sm'>{g.accuracy.vocab ?? '—'}</p></div>
              <div><p className='text-muted text-xs'>{t('grammar')}</p><p className='font-mono text-accent text-sm'>{g.accuracy.grammar ?? '—'}</p></div>
              <div><p className='text-muted text-xs'>{t('reading')}</p><p className='font-mono text-accent text-sm'>{g.accuracy.reading ?? '—'}</p></div>
            </div>
          </div>
        ))}
        {progress && progress.length === 0 && <p className='text-muted text-sm'>—</p>}
        {!progress && <p className='text-muted text-sm'>{t('loading')}</p>}
      </div>

      <p className='text-ink font-medium mb-2'>{t('paymentsLabel')}</p>
      <div className='flex flex-col gap-2 mb-5'>
        {(payments?.courses || []).map(c => (
          <div key={c._id} className='bg-bg-card border border-hairline rounded-2xl p-4'>
            <div className='flex justify-between items-start mb-2'>
              <p className='text-ink text-sm font-medium'>{c.languageId?.name}{c.levelId?.name ? ` · ${c.levelId.name}` : ''}</p>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.isActive ? 'bg-accent-soft text-accent' : 'bg-hairline text-muted'}`}>
                {c.isActive ? t('active') : t('unpaid')}
              </span>
            </div>
            <div className='grid grid-cols-2 gap-2 text-sm'>
              <div><p className='text-muted text-xs'>{t('monthlyPriceLabel')}</p><p className='font-mono text-ink'>{c.price !== null ? formatMoney(c.price) : '—'}</p></div>
              <div><p className='text-muted text-xs'>{t('balanceLabel')}</p><p className={`font-mono ${c.balance > 0 ? 'text-green-600' : 'text-ink'}`}>{formatMoney(c.balance)}</p></div>
              <div><p className='text-muted text-xs'>{t('nextDueLabel')}</p><p className='font-mono text-ink'>{c.subscriptionExpiresAt ? new Date(c.subscriptionExpiresAt).toLocaleDateString() : '—'}</p></div>
            </div>
          </div>
        ))}
        {payments && payments.courses.length === 0 && <p className='text-muted text-sm'>{t('noCoursesYet')}</p>}
        {!payments && <p className='text-muted text-sm'>{t('loading')}</p>}
      </div>
    </div>
  )
}

export default Home
