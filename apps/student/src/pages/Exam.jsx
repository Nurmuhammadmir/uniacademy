import React, { useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StudentContext } from '../context/StudentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { resolveImageUrl } from '../lib/format.js'
import { buildVocabPrompt } from '../lib/vocabPrompt.js'
import QuestionCard from '../components/QuestionCard.jsx'
import { randomQuote } from '../lib/quotes.js'

const formatClock = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const Exam = () => {
  const { levelId } = useParams()
  const { getExam, submitExam, backendUrl } = useContext(StudentContext)
  const { t } = useLanguage()
  const [exam, setExam] = useState(false)
  const [answers, setAnswers] = useState({})
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(false)
  const submittedRef = useRef(false)

  useEffect(() => { getExam(levelId).then(setExam) }, [levelId])

  // the countdown is anchored to the server's `startedAt`, not to whenever this page happens to
  // mount - reopening/refreshing resumes the same attempt's real remaining time instead of
  // handing out a fresh 90 minutes every time
  useEffect(() => {
    if (!exam) return
    const elapsed = Math.floor((Date.now() - new Date(exam.startedAt).getTime()) / 1000)
    setSecondsLeft(Math.max(0, exam.durationMinutes * 60 - elapsed))
  }, [exam])

  // ticks the countdown and auto-submits (with whatever's answered so far) the moment it hits zero -
  // a real exam needs a hard time limit, not just a suggestion
  useEffect(() => {
    if (secondsLeft === null || result) return
    if (secondsLeft <= 0) { submit(); return }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, result])

  // warns before a tab close/refresh mid-exam - closing doesn't grant a fresh attempt (the same
  // question set and countdown just resume next time), so leaving without submitting only risks
  // running out the clock on unanswered questions
  useEffect(() => {
    if (!exam || result) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [exam, result])

  // every reading exercise, across every one of the 3 texts, flattened - used for both the
  // "everything answered" check and building the submit payload
  const allReadingExercises = exam ? (exam.readingTexts || []).flatMap(rt => rt.exercises) : []
  const allExerciseIds = exam ? [...exam.questions.map(q => q._id), ...allReadingExercises.map(e => e._id)] : []

  const submit = async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    const payload = allExerciseIds.map(id => ({ questionId: id, answer: answers[id] }))
    const data = await submitExam(exam.examId, payload)
    setSubmitting(false)
    if (data) setResult(data)
    else submittedRef.current = false
  }

  if (exam === false) return <div className='px-6 pt-16 text-muted'>{t('loadingExam')}</div>
  if (!exam) return <div className='px-6 pt-16 text-center text-muted'>{t('noExamYet')}</div>

  if (result) {
    const passed = result.outcome === 'passed'
    return (
      <div className='min-h-screen flex flex-col items-center justify-center px-6 text-center'>
        <p className={`font-mono text-5xl mb-2 ${passed ? 'text-gold' : 'text-accent'}`}>{result.score}%</p>
        <p className='font-display text-xl text-ink mb-3'>{passed ? t('levelPassed') : t('notQuiteThisTime')}</p>
        <p className='text-muted text-sm mb-4 max-w-xs'>{t('examResultNote')}</p>
        <p className='text-ink italic max-w-xs'>"{randomQuote()}"</p>
      </div>
    )
  }

  const allAnswered = allExerciseIds.length > 0 && allExerciseIds.every(id => answers[id] !== undefined && answers[id] !== '')
  const lowTime = secondsLeft !== null && secondsLeft <= 60

  return (
    <div className='px-5 pt-10 pb-10 max-w-md mx-auto'>
      <div className='flex items-center justify-between mb-3'>
        <p className='font-display text-2xl text-ink'>{t('levelExam')}</p>
        {secondsLeft !== null && (
          <span className={`font-mono text-lg px-3 py-1 rounded-full ${lowTime ? 'bg-red-100 text-red-500' : 'bg-accent-soft text-accent'}`}>
            {formatClock(Math.max(0, secondsLeft))}
          </span>
        )}
      </div>
      <p className='text-xs text-muted mb-6'>{t('examNoRestartNote')}</p>

      {exam.questions.map((q, i) => {
        const vocabPrompt = q.section === 'vocab' ? buildVocabPrompt(q, t) : null
        return (
          <QuestionCard
            key={q._id}
            index={i}
            question={vocabPrompt ? vocabPrompt.question : q.question}
            image={vocabPrompt?.image}
            options={q.options}
            value={answers[q._id]}
            onChange={(v) => setAnswers(prev => ({ ...prev, [q._id]: v }))}
            type={q.type}
          />
        )
      })}

      {(exam.readingTexts || []).map((rt, ti) => (
        <div key={rt.readingTextId} className='mt-2'>
          <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-2'>
            {rt.image && (
              <img src={resolveImageUrl(rt.image, backendUrl)} alt={rt.title} className='w-full h-32 object-contain bg-bg rounded-xl mb-3' />
            )}
            <p className='font-display text-lg text-ink mb-2'>{rt.title}</p>
            {rt.paragraphs.map(p => (
              <p key={p.id} className='text-ink text-sm mb-2 leading-relaxed'>{p.text}</p>
            ))}
          </div>
          {rt.exercises.map((e, i) => (
            <QuestionCard
              key={e._id}
              index={exam.questions.length + ti * 10 + i}
              question={e.question || t('matchCorrectWord')}
              options={e.options}
              value={answers[e._id]}
              onChange={(v) => setAnswers(prev => ({ ...prev, [e._id]: v }))}
              type={e.type}
            />
          ))}
        </div>
      ))}

      <button onClick={submit} disabled={!allAnswered || submitting} className='w-full py-4 rounded-2xl bg-accent text-white font-medium mt-2 disabled:opacity-50'>
        {submitting ? t('submitting') : t('submitExam')}
      </button>
    </div>
  )
}

export default Exam
