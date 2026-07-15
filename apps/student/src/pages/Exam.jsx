import React, { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { StudentContext } from '../context/StudentContext.jsx'
import QuestionCard from '../components/QuestionCard.jsx'
import { randomQuote } from '../lib/quotes.js'

const Exam = () => {
  const { levelId } = useParams()
  const { getExam, submitExam } = useContext(StudentContext)
  const [exam, setExam] = useState(false)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(false)

  useEffect(() => { getExam(levelId).then(setExam) }, [levelId])

  const submit = async () => {
    const questions = exam.questions
    let correctCount = 0
    questions.forEach((q, i) => {
      if (String(answers[i]).trim().toLowerCase() === String(q.correct).trim().toLowerCase()) correctCount++
    })
    const score = Math.round((correctCount / questions.length) * 100)
    const data = await submitExam(exam._id, score)
    setResult({ score, ...data })
  }

  if (!exam) return <div className='px-6 pt-16 text-muted'>Loading exam…</div>

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

  return (
    <div className='px-5 pt-10 pb-10'>
      <p className='font-display text-2xl text-ink mb-6'>Level exam</p>
      {exam.questions.map((q, i) => (
        <QuestionCard key={i} index={i} question={q.question} options={q.options} value={answers[i]} onChange={(v) => setAnswers(prev => ({ ...prev, [i]: v }))} type={q.type} />
      ))}
      <button onClick={submit} className='w-full py-4 rounded-2xl bg-accent text-white font-medium mt-2'>
        Submit exam
      </button>
    </div>
  )
}

export default Exam
