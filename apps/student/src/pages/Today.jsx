import React, { lazy, Suspense, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StudentContext } from '../context/StudentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import DayRow from '../components/DayRow.jsx'
import ExerciseModal from '../components/ExerciseModal.jsx'
import Spinner from '../components/Spinner.jsx'
import { groupLabel } from '../lib/format.js'

// html5-qrcode is a heavy camera/decoding library that every single student would otherwise
// download on first load, even though almost none of them tap "scan attendance" in a given
// session - Today is this app's landing route, so anything imported at the top here ships with
// literally everyone's first paint. Lazy so it's fetched only when the scanner is actually opened.
const AttendanceScanner = lazy(() => import('../components/AttendanceScanner.jsx'))
const ScannerFallback = () => (
  <div className='fixed inset-0 bg-black z-50 flex items-center justify-center'>
    <Spinner size={28} className='text-white' />
  </div>
)

const Today = () => {
  const {
    week, getHomeworkWeek, getHomeworkForDay, submitVocab, submitGrammar, submitReading,
    getHomeworkReview, submitReviewVocab, submitReviewGrammar,
    progress, me, myGroups, selectedGroupId, setSelectedGroupId,
  } = useContext(StudentContext)
  const { t } = useLanguage()
  const [selectedDay, setSelectedDay] = useState(null) // a lesson day number, or the string 'review'
  const [dayData, setDayData] = useState(false)
  const [openSection, setOpenSection] = useState(null)
  const [showExamInfo, setShowExamInfo] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const navigate = useNavigate()
  const isReviewSelected = selectedDay === 'review'

  const SECTION_META = {
    vocab: { label: t('vocabulary'), icon: '🔤' },
    grammar: { label: t('grammar'), icon: '✏️' },
    reading: { label: t('reading'), icon: '📖' },
  }

  // switching groups means "today"/dayCounter belongs to a totally different course now - drop the
  // previous selection so it re-syncs to the newly selected group's own day instead of showing a
  // day number left over from whichever group was picked before
  useEffect(() => { setSelectedDay(null) }, [selectedGroupId])

  useEffect(() => {
    if (week && week.days && selectedDay === null && Number.isInteger(week.groupDayCounter)) {
      setSelectedDay(week.groupDayCounter)
    }
  }, [week])

  useEffect(() => {
    if (selectedDay === null) return
    setDayData(false)
    if (selectedDay === 'review') getHomeworkReview().then(setDayData)
    else if (Number.isInteger(selectedDay)) getHomeworkForDay(selectedDay).then(setDayData)
  }, [selectedDay])

  const submitFns = isReviewSelected
    ? { vocab: submitReviewVocab, grammar: submitReviewGrammar }
    : { vocab: submitVocab, grammar: submitGrammar, reading: submitReading }

  const closeModal = async (didSubmit) => {
    setOpenSection(null)
    if (didSubmit && !isReviewSelected) {
      await getHomeworkWeek()
      getHomeworkForDay(selectedDay).then(setDayData)
    }
    // review submissions never touch progress/streak (see StudentContext.submitReviewVocab) - no
    // refetch needed, closing the modal is enough
  }

  const onExamButtonClick = () => {
    if (week.examAvailable && !week.examAttempted) {
      navigate(`/exam/${week.levelId}`)
    } else {
      setShowExamInfo(true)
    }
  }

  const firstName = me?.student?.name?.split(' ')[0]

  const formatNextLesson = (lesson) => {
    if (!lesson) return null
    const date = new Date(lesson.date)
    const todayUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))
    const diffDays = Math.round((date - todayUTC) / 86400000)
    const dayLabel = diffDays === 0 ? t('todayWord') : diffDays === 1 ? t('tomorrowWord') : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    return `${dayLabel}, ${lesson.time}${lesson.room ? ` · ${lesson.room}` : ''}`
  }

  // a student can be in more than one active group at once - only worth showing a switcher once
  // there's actually a choice to make
  const groupSwitcher = myGroups.length > 1 && (
    <div className='flex gap-2 overflow-x-auto mb-3 pb-1'>
      {myGroups.map(g => (
        <button
          key={g._id}
          onClick={() => setSelectedGroupId(g._id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${g._id === selectedGroupId ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}
        >
          {groupLabel(g)}
        </button>
      ))}
    </div>
  )

  if (!week) {
    return (
      <div className='px-6 pt-16 text-center'>
        {firstName && <p className='text-muted mb-1'>{t('helloName', { name: firstName })}</p>}
        {groupSwitcher}
        <p className='text-muted'>{t('noActiveGroup')}</p>
        <p className='text-muted text-sm mt-2'>{t('askAdminEnroll')}</p>
      </div>
    )
  }

  const selectedDayMeta = week.days.find(d => d.day === selectedDay && d.type === 'lesson')

  const examButtonLabel = week.examAttempted ? t('examAlreadyTaken')
    : week.examAvailable ? t('examOpenTapStart')
    : t('examOpensOnDay', { day: week.examOpensOnDay })

  return (
    <div className='px-5 pt-10'>
      {firstName && <p className='text-muted text-sm mb-1'>{t('helloName', { name: firstName })}</p>}
      {groupSwitcher}
      <p className='font-display text-2xl text-ink mb-1'>{t('today')}</p>
      <p className='text-muted text-sm mb-3'>{t('dayOf', { current: week.groupDayCounter, total: week.durationDays })}</p>

      {week.nextLesson && (
        <div className='bg-accent-soft dark:bg-white/10 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between'>
          <span className='text-ink text-sm font-medium'>{t('nextLessonLabel')}</span>
          <span className='text-accent text-sm font-mono'>{formatNextLesson(week.nextLesson)}</span>
        </div>
      )}

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
      ) : isReviewSelected ? (
        <>
          <div className='bg-gold/10 border border-gold/30 rounded-2xl p-4 mb-4'>
            <p className='font-display text-lg text-ink mb-1'>{t('reviewDayTitle')}</p>
            <p className='text-muted text-sm'>{t('reviewDaySubtitle')}</p>
          </div>
          <div className='flex flex-col gap-3'>
            {[['vocab', SECTION_META.vocab], ['grammar', SECTION_META.grammar]].map(([key, meta]) => {
              const count = (dayData[key] || []).length
              return (
                <button
                  key={key}
                  disabled={count === 0}
                  onClick={() => setOpenSection(key)}
                  className={`px-5 py-4 rounded-2xl border text-left ${count === 0 ? 'border-hairline bg-bg-card opacity-40' : 'border-transparent bg-[#D3E6FF] dark:bg-blue-500/10'}`}
                >
                  <div className='flex items-center justify-between mb-1'>
                    <span className='flex items-center gap-3'>
                      <span className='text-xl'>{meta.icon}</span>
                      <span className='text-ink font-medium'>{meta.label}</span>
                    </span>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${count === 0 ? 'bg-hairline text-muted' : 'bg-[#5B93F5] text-white'}`}>
                      {count === 0 ? t('nothingHereYet') : t('start')}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
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
            {Object.entries(SECTION_META).filter(([key]) => key !== 'reading' || week.hasReading !== false).map(([key, meta]) => {
              const done = key === 'vocab' ? selectedDayMeta?.vocabDone : key === 'grammar' ? selectedDayMeta?.grammarDone : selectedDayMeta?.readingDone
              const locked = selectedDayMeta?.status === 'expired' && !done
              const score = dayData.progress ? dayData.progress[`${key}Score`] : null
              return (
                <button
                  key={key}
                  disabled={done || locked}
                  onClick={() => setOpenSection(key)}
                  className={`px-5 py-4 rounded-2xl border text-left ${locked ? 'border-hairline bg-bg-card opacity-40' : 'border-transparent bg-[#D3E6FF] dark:bg-blue-500/10'}`}
                >
                  <div className='flex items-center justify-between mb-1'>
                    <span className='flex items-center gap-3'>
                      <span className='text-xl'>{meta.icon}</span>
                      <span className='text-ink font-medium'>{meta.label}</span>
                    </span>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${locked ? 'bg-hairline text-muted' : 'bg-[#5B93F5] text-white'}`}>
                      {done ? `${score}%` : locked ? t('missed') : t('start')}
                    </span>
                  </div>
                  {done && (
                    <div className='h-1.5 rounded-full bg-white dark:bg-white/20 overflow-hidden mt-2'>
                      <div className='h-full bg-[#F2542D] rounded-full' style={{ width: `${score || 0}%` }} />
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
          day={isReviewSelected ? null : selectedDay}
          dayLabel={isReviewSelected ? t('dayReview') : null}
          submitFn={submitFns[openSection]}
          onClose={closeModal}
        />
      )}

      {showScanner && (
        <Suspense fallback={<ScannerFallback />}>
          <AttendanceScanner onClose={() => setShowScanner(false)} />
        </Suspense>
      )}

      {showExamInfo && (
        <div className='fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md dark:bg-[#0B0F19]/60 dark:backdrop-blur-lg transition-all duration-300 flex items-center justify-center px-6' onClick={() => setShowExamInfo(false)}>
          <div className='bg-bg-elevated border border-hairline rounded-2xl p-6 max-w-xs text-center' onClick={e => e.stopPropagation()}>
            <span className='text-4xl mb-3 block'>🎓</span>
            <p className='font-display text-lg text-ink mb-2'>
              {week.examAttempted ? t('examAlreadyTakenTitle') : t('examOpensOnDayTitle', { day: week.examOpensOnDay })}
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
