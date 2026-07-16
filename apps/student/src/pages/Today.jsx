import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StudentContext } from '../context/StudentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import DayRow from '../components/DayRow.jsx'
import ExerciseModal from '../components/ExerciseModal.jsx'
import AttendanceScanner from '../components/AttendanceScanner.jsx'

const Today = () => {
  const { week, getHomeworkWeek, getHomeworkForDay, submitVocab, submitGrammar, submitReading, progress } = useContext(StudentContext)
  const { t } = useLanguage()
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayData, setDayData] = useState(false)
  const [openSection, setOpenSection] = useState(null)
  const [showExamInfo, setShowExamInfo] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()

  const SECTION_META = {
    vocab: { label: t('vocabulary'), icon: '🔤' },
    grammar: { label: t('grammar'), icon: '✏️' },
    reading: { label: t('reading'), icon: '📖' },
  }

  useEffect(() => {
    if (week && week.days && selectedDay === null && Number.isInteger(week.groupDayCounter)) {
      setSelectedDay(week.groupDayCounter)
    }
  }, [week])

  useEffect(() => {
    if (!Number.isInteger(selectedDay)) return
    setDayData(false)
    getHomeworkForDay(selectedDay).then(setDayData)
  }, [selectedDay])

  const submitFns = { vocab: submitVocab, grammar: submitGrammar, reading: submitReading }

  const closeModal = async (didSubmit) => {
    setOpenSection(null)
    if (didSubmit) {
      await getHomeworkWeek()
      getHomeworkForDay(selectedDay).then(setDayData)
    }
  }

  const onExamButtonClick = () => {
    if (week.examAvailable && !week.examAttempted) {
      navigate(`/exam/${week.levelId}`)
    } else {
      setShowExamInfo(true)
    }
  }

  if (!week) {
    return (
      <div className='px-6 pt-16 text-center'>
        <p className='text-muted'>{t('noActiveGroup')}</p>
        <p className='text-muted text-sm mt-2'>{t('askAdminEnroll')}</p>
      </div>
    )
  }

  const selectedDayMeta = week.days.find(d => d.day === selectedDay)

  const examButtonLabel = week.examAttempted ? t('examAlreadyTaken')
    : week.examAvailable ? t('examOpenTapStart')
    : t('examOpensOnDay', { day: week.durationDays })

  return (
    <div className='px-5 pt-10'>
      <p className='font-display text-2xl text-ink mb-1'>{t('today')}</p>
      <p className='text-muted text-sm mb-5'>{t('dayOf', { current: week.groupDayCounter, total: week.durationDays })}</p>

      <DayRow days={week.days} selectedDay={selectedDay} onSelect={setSelectedDay} groupDayCounter={week.groupDayCounter} />

      <button
        onClick={() => setShowScanner(true)}
        className='w-full mb-3 py-3 rounded-2xl border border-hairline text-ink font-medium flex items-center justify-center gap-2'
      >
        {t('scanAttendance')}
      </button>

      <button
        onClick={onExamButtonClick}
        className={`w-full mb-5 py-4 rounded-2xl font-medium ${week.examAvailable && !week.examAttempted ? 'bg-gold text-white shadow-lg' : 'bg-bg-card border border-hairline text-muted'}`}
      >
        {examButtonLabel}
      </button>

      {!dayData ? (
        <p className='text-muted'>{t('loading')}</p>
      ) : dayData.restDay ? (
        <div className='bg-bg-card border border-hairline rounded-2xl p-8 text-center'>
          <p className='font-display text-lg text-ink mb-1'>{t('restDay')}</p>
          <p className='text-muted text-sm'>{t('restDaySubtitle')}</p>
        </div>
      ) : (
        <>
          {(() => {
            const p = dayData.progress
            const partsDone = [p?.vocabDone, p?.grammarScore !== null && p?.grammarScore !== undefined, p?.readingScore !== null && p?.readingScore !== undefined].filter(Boolean).length
            const dayPercent = Math.round((partsDone / 3) * 100)
            return (
              <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-4'>
                <div className='flex justify-between text-sm mb-1'>
                  <span className='text-ink font-medium'>{t('dayProgress', { day: selectedDay })}</span>
                  <span className='font-mono text-accent'>{partsDone}/3 · {dayPercent}%</span>
                </div>
                <div className='h-2 rounded-full bg-hairline overflow-hidden'>
                  <div className='h-full bg-accent rounded-full transition-all duration-700' style={{ width: `${dayPercent}%` }} />
                </div>
              </div>
            )
          })()}

          <div className='flex flex-col gap-3'>
            {Object.entries(SECTION_META).map(([key, meta]) => {
              const done = key === 'vocab' ? selectedDayMeta?.vocabDone : key === 'grammar' ? selectedDayMeta?.grammarDone : selectedDayMeta?.readingDone
              const locked = selectedDayMeta?.status === 'expired' && !done
              const score = dayData.progress ? dayData.progress[`${key}Score`] : null
              return (
                <button
                  key={key}
                  disabled={done || locked}
                  onClick={() => setOpenSection(key)}
                  className={`px-5 py-4 rounded-2xl border text-left ${done ? 'border-hairline bg-bg-card opacity-90' : locked ? 'border-hairline bg-bg-card opacity-40' : 'border-hairline bg-bg-card'}`}
                >
                  <div className='flex items-center justify-between mb-1'>
                    <span className='flex items-center gap-3'>
                      <span className='text-xl'>{meta.icon}</span>
                      <span className='text-ink font-medium'>{meta.label}</span>
                    </span>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${done ? 'bg-accent-soft text-accent' : locked ? 'bg-hairline text-muted' : 'bg-accent text-white'}`}>
                      {done ? `${score}%` : locked ? t('missed') : t('start')}
                    </span>
                  </div>
                  {done && (
                    <div className='h-1.5 rounded-full bg-hairline overflow-hidden mt-2'>
                      <div className='h-full bg-accent rounded-full' style={{ width: `${score || 0}%` }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {progress && (
        <div className='bg-bg-card border border-hairline rounded-2xl p-4 mt-4'>
          <div className='flex justify-between items-center mb-3'>
            <p className='text-ink font-medium text-sm'>{t('yourAccuracy')}</p>
            <span className='font-mono text-xs text-gold'>{progress.streak} {t('dayStreak')}</span>
          </div>
          <div className='grid grid-cols-3 gap-3 text-center'>
            <div>
              <p className='text-muted text-xs mb-1'>{t('vocabulary')}</p>
              <p className='font-mono text-accent'>{progress.accuracy.vocab ?? '—'}{progress.accuracy.vocab !== null ? '%' : ''}</p>
            </div>
            <div>
              <p className='text-muted text-xs mb-1'>{t('grammar')}</p>
              <p className='font-mono text-accent'>{progress.accuracy.grammar ?? '—'}{progress.accuracy.grammar !== null ? '%' : ''}</p>
            </div>
            <div>
              <p className='text-muted text-xs mb-1'>{t('reading')}</p>
              <p className='font-mono text-accent'>{progress.accuracy.reading ?? '—'}{progress.accuracy.reading !== null ? '%' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {openSection && dayData && (
        <ExerciseModal
          section={openSection}
          dayData={dayData}
          groupId={week.groupId}
          day={selectedDay}
          submitFn={submitFns[openSection]}
          onClose={closeModal}
        />
      )}

      {showScanner && <AttendanceScanner onClose={() => setShowScanner(false)} />}

      {showExamInfo && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6' onClick={() => setShowExamInfo(false)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-xs text-center' onClick={e => e.stopPropagation()}>
            <span className='text-4xl mb-3 block'>🎓</span>
            <p className='font-display text-lg text-ink mb-2'>
              {week.examAttempted ? t('examAlreadyTakenTitle') : t('examOpensOnDayTitle', { day: week.durationDays })}
            </p>
            <p className='text-muted text-sm mb-4'>
              {week.examAttempted ? t('examRetakeAdmin') : t('examCurrentlyOnDay', { day: week.groupDayCounter, total: week.durationDays })}
            </p>
            <button onClick={() => setShowExamInfo(false)} className='w-full py-3 rounded-xl bg-accent text-white font-medium'>{t('gotIt')}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Today
