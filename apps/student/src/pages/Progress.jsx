import React, { useContext, useEffect, useRef } from 'react'
import { StudentContext } from '../context/StudentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const SkillBar = ({ label, value }) => (
  <div className='mb-4'>
    <div className='flex justify-between text-sm mb-1'>
      <span className='text-ink font-medium capitalize'>{label}</span>
      <span className='font-mono text-muted'>{value === null ? '—' : `${value}%`}</span>
    </div>
    <div className='h-2 rounded-full bg-hairline overflow-hidden'>
      <div className='h-full bg-accent rounded-full transition-all duration-700' style={{ width: `${value || 0}%` }} />
    </div>
  </div>
)

const dayScore = (row) => {
  const scores = [row?.vocabScore, row?.grammarScore, row?.readingScore].filter(s => s !== null && s !== undefined)
  if (scores.length === 0) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

const Progress = () => {
  const { progress, getProgress } = useContext(StudentContext)
  const { t } = useLanguage()
  const scrollRef = useRef(null)
  const todayRef = useRef(null)

  useEffect(() => { getProgress() }, [])

  useEffect(() => {
    if (todayRef.current) todayRef.current.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [progress])

  if (!progress) return <div className='px-6 pt-16 text-muted'>{t('loading')}</div>

  const rowByDay = Object.fromEntries(progress.days.map(r => [r.day, r]))
  const lastKnownDay = progress.days.length ? Math.max(...progress.days.map(d => d.day)) : 1
  const monthDone = progress.days.filter(d => d.status === 'done').length
  const durationDays = progress.durationDays || 30

  return (
    <div className='px-5 pt-10'>
      <p className='font-display text-2xl text-ink mb-1'>{t('yourProgress')}</p>
      <p className='text-muted mb-6'>{t('keepStreak')}</p>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-6 flex items-center gap-4'>
        <span className='font-mono text-4xl text-gold'>{progress.streak}</span>
        <div>
          <p className='text-ink font-medium'>{t('dayStreak')}</p>
          <p className='text-muted text-sm'>{t('consecutiveDays')}</p>
        </div>
      </div>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-6'>
        <div className='flex justify-between items-center mb-3'>
          <p className='text-ink font-medium'>{t('thisCourse', { days: durationDays })}</p>
          <span className='font-mono text-sm text-accent'>{monthDone}/{durationDays} {t('done')}</span>
        </div>
        <div ref={scrollRef} className='flex gap-2 overflow-x-auto pb-1'>
          {Array.from({ length: durationDays }, (_, i) => i + 1).map(day => {
            const row = rowByDay[day]
            const score = dayScore(row)
            const isToday = day === lastKnownDay
            const bg = row?.status === 'done' ? 'bg-gold text-white'
              : row?.status === 'expired' ? 'bg-red-100 text-red-500'
              : day <= lastKnownDay ? 'bg-accent-soft text-accent'
              : 'bg-hairline text-muted opacity-50'
            return (
              <div key={day} ref={isToday ? todayRef : null} className={`shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center font-mono ${bg}`}>
                <span className='text-sm font-bold'>{day}</span>
                <span className='text-[10px]'>{score !== null ? `${score}%` : '·'}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5 mb-6'>
        <p className='text-ink font-medium mb-4'>{t('accuracyBySkill')}</p>
        <SkillBar label={t('vocabulary')} value={progress.accuracy.vocab} />
        <SkillBar label={t('grammar')} value={progress.accuracy.grammar} />
        <SkillBar label={t('reading')} value={progress.accuracy.reading} />
      </div>

      <div className='bg-bg-card border border-hairline rounded-2xl p-5'>
        <p className='text-ink font-medium mb-4'>{t('dayByDayBreakdown')}</p>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm min-w-[420px]'>
            <thead>
              <tr className='text-left text-muted border-b border-hairline'>
                <th className='py-2 pr-3 font-medium'>{t('day')}</th>
                <th className='py-2 px-3 font-medium'>{t('vocabulary')}</th>
                <th className='py-2 px-3 font-medium'>{t('grammar')}</th>
                <th className='py-2 px-3 font-medium'>{t('reading')}</th>
                <th className='py-2 pl-3 font-medium'>{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {progress.days.map(row => (
                <tr key={row._id} className='border-b border-hairline last:border-0'>
                  <td className='py-2 pr-3 font-mono text-ink'>{row.day}</td>
                  <td className='py-2 px-3 font-mono text-muted'>{row.vocabScore ?? '—'}</td>
                  <td className='py-2 px-3 font-mono text-muted'>{row.grammarScore ?? '—'}</td>
                  <td className='py-2 px-3 font-mono text-muted'>{row.readingScore ?? '—'}</td>
                  <td className='py-2 pl-3'>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      row.status === 'done' ? 'bg-gold-soft text-gold' :
                      row.status === 'expired' ? 'bg-red-100 text-red-500' :
                      'bg-accent-soft text-accent'
                    }`}>{row.status}</span>
                  </td>
                </tr>
              ))}
              {progress.days.length === 0 && (
                <tr><td colSpan={5} className='py-6 text-center text-muted'>{t('noActivity')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Progress
