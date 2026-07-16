import React, { useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StudentContext } from '../context/StudentContext.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import { randomQuote } from '../lib/quotes.js'

const formatClock = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const Exam = () => {
  const { levelId } = useParams()
  const { getExam, submitExam } = useContext(StudentContext)
  const [exam, setExam] = useState(false)
  const [answers, setAnswers] = useState({})
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(false)
  const submittedRef = useRef(false)

  useEffect(() => { getExam(levelId).then(setExam) }, [levelId])

  useEffect(() => {
    if (!exam) return
    setSecondsLeft(exam.durationMinutes * 60)
  }, [exam])

  // ticks the countdown and auto-submits (with whatever's answered so far) the moment it hits zero -
  // a real exam needs a hard time limit, not just a suggestion
  useEffect(() => {
    if (secondsLeft === null || result) return
    if (secondsLeft <= 0) { submit(); return }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft, result])

  const submit = async () => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    const payload = exam.questions.map(q => ({ questionId: q._id, answer: answers[q._id] }))
    const data = await submitExam(exam.examId, payload)
    setSubmitting(false)
    if (data) setResult(data)
    else submittedRef.current = false
  }

  if (exam === false) return <div className='px-6 pt-16 text-muted'>Loading exam…</div>
  if (!exam) return <div className='px-6 pt-16 text-center text-muted'>No exam available yet - check back once your director has published one.</div>

  if (result) {
    const passed = result.outcome === 'promoted' || result.outcome === 'course_completed'
    return (
      <div className='min-h-screen flex flex-col items-center justify-center px-6 text-center'>
        <p className={`font-mono text-5xl mb-2 ${passed ? 'text-gold' : 'text-accent'}`}>{result.score}%</p>
        <p className='font-display text-xl text-ink mb-3'>
          {result.outcome === 'promoted' ? 'Level passed! 🎉' :
           result.outcome === 'course_completed' ? 'Course completed! 🎓' :
           result.outcome === 'failed_awaiting_manual_retake' ? "Not quite - talk to your admin about your one retake" :
           'Not quite this time'}
        </p>
        <p className='text-ink italic max-w-xs'>"{randomQuote()}"</p>
      </div>
    )
  }

  const allAnswered = exam.questions.length > 0 && exam.questions.every(q => answers[q._id] !== undefined && answers[q._id] !== '')
  const lowTime = secondsLeft !== null && secondsLeft <= 60

  return (
    <div className='px-5 pt-10 pb-10'>
      <div className='flex items-center justify-between mb-6'>
        <p className='font-display text-2xl text-ink'>Level exam</p>
        {secondsLeft !== null && (
          <span className={`font-mono text-lg px-3 py-1 rounded-full ${lowTime ? 'bg-red-100 text-red-500' : 'bg-accent-soft text-accent'}`}>
            {formatClock(Math.max(0, secondsLeft))}
          </span>
        )}
      </div>
      {exam.questions.map((q, i) => (
        <div key={q._id}>
          {q.passage && (
            <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-2'>
              <p className='text-ink text-sm leading-relaxed'>{q.passage}</p>
            </div>
          )}
          <QuestionCard
            index={i}
            question={q.question}
            image={q.image}
            options={q.options}
            value={answers[q._id]}
            onChange={(v) => setAnswers(prev => ({ ...prev, [q._id]: v }))}
            type={q.type}
          />
        </div>
      ))}
      <button onClick={submit} disabled={!allAnswered || submitting} className='w-full py-4 rounded-2xl bg-accent text-white font-medium mt-2 disabled:opacity-50'>
        {submitting ? 'Submitting…' : 'Submit exam'}
      </button>
    </div>
  )
}

export default Exam
