import React, { useContext, useState } from 'react'
import QuestionCard from './QuestionCard.jsx'
import { randomQuote } from '../lib/quotes.js'
import { resolveImageUrl } from '../lib/format.js'
import { StudentContext } from '../context/StudentContext.jsx'

const TITLES = { vocab: 'Vocabulary', grammar: 'Grammar', reading: 'Reading' }
const ICONS = { vocab: '🔤', grammar: '✏️', reading: '📖' }

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// a VocabExercise only stores {type, conceptId, options, correct} - the actual question ("what do
// you show the student") depends on the type: picture_match shows the concept's picture,
// translation_match shows its native translation, fill_gap shows its example sentence with the
// word blanked out. The 4 options are always the same - words - only what's being asked differs.
const buildVocabPrompt = (ex) => {
  const c = ex.conceptId || {}
  if (ex.type === 'picture_match') {
    return c.image
      ? { image: c.image, question: 'Which word matches this picture?' }
      : { image: null, question: c.word ? `Which word matches: "${c.word}"?` : 'Which word matches this picture?' }
  }
  if (ex.type === 'translation_match') {
    return { image: null, question: c.translation ? `Translate: "${c.translation}"` : 'Translate the word' }
  }
  // fill_gap
  if (c.example && c.word) {
    const blanked = c.example.replace(new RegExp(`\\b${escapeRegExp(c.word)}\\b`, 'i'), '____')
    return { image: null, question: blanked }
  }
  return { image: null, question: c.example || 'Fill in the blank' }
}

// 3-stage flow: intro (what's inside + how long it'll take) -> questions -> result (score + a
// motivational quote), each a full screen so nothing feels rushed or ambiguous
const ExerciseModal = ({ section, dayData, groupId, day, submitFn, onClose }) => {
  const { backendUrl } = useContext(StudentContext)
  const [stage, setStage] = useState('intro')
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const exercises = section === 'vocab' ? (dayData.vocab || [])
    : section === 'grammar' ? (dayData.grammar || [])
    : (dayData.readingExercises || [])

  const setAnswer = (exerciseId, value) => setAnswers(prev => ({ ...prev, [exerciseId]: value }))

  const submit = async () => {
    setSubmitting(true)
    const payload = exercises.map(ex => {
      const chosen = answers[ex._id]
      return section === 'vocab' ? { exerciseId: ex._id, chosenConceptId: chosen } : { exerciseId: ex._id, answer: chosen }
    })
    const res = await submitFn(groupId, day, payload)
    setSubmitting(false)
    if (res) {
      setResult(res)
      setStage('result')
    }
  }

  const allAnswered = exercises.length > 0 && exercises.every(ex => answers[ex._id] !== undefined && answers[ex._id] !== '')
  const estimatedMinutes = Math.max(1, Math.round(exercises.length * 0.6))

  return (
    <div className='fixed inset-0 bg-bg z-50 flex flex-col'>
      <div className='flex items-center justify-between px-5 pt-6 pb-4 border-b border-hairline'>
        <button onClick={() => onClose(stage === 'result')} className='text-muted text-sm'>Close</button>
        <p className='font-display text-ink'>{TITLES[section]} · Day {day}</p>
        <span className='w-10' />
      </div>

      {stage === 'intro' && (
        <div className='flex-1 flex flex-col items-center justify-center px-8 text-center'>
          <span className='text-5xl mb-4'>{ICONS[section]}</span>
          <p className='font-display text-2xl text-ink mb-2'>{TITLES[section]}</p>
          <p className='text-muted mb-6'>{exercises.length} question{exercises.length === 1 ? '' : 's'} · about {estimatedMinutes} min</p>
          <button
            onClick={() => setStage('questions')}
            disabled={exercises.length === 0}
            className='w-full max-w-xs py-4 rounded-2xl bg-accent text-white font-medium disabled:opacity-50'
          >
            {exercises.length === 0 ? 'Nothing here yet' : 'Start'}
          </button>
        </div>
      )}

      {stage === 'questions' && (
        <>
          <div className='flex-1 overflow-y-auto px-5 py-4'>
            {section === 'reading' && dayData.readingText && (
              <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-4'>
                {dayData.readingText.image && (
                  <img src={resolveImageUrl(dayData.readingText.image, backendUrl)} alt={dayData.readingText.title} className='w-full h-36 object-cover rounded-xl mb-3' />
                )}
                <p className='font-display text-lg text-ink mb-2'>{dayData.readingText.title}</p>
                {dayData.readingText.paragraphs.map(p => (
                  <p key={p.id} className='text-ink text-sm mb-2 leading-relaxed'>{p.text}</p>
                ))}
              </div>
            )}
            {exercises.map((ex, i) => {
              const vocabPrompt = section === 'vocab' ? buildVocabPrompt(ex) : null
              return (
                <QuestionCard
                  key={ex._id}
                  index={i}
                  question={vocabPrompt ? vocabPrompt.question : (ex.question || 'Match the correct word')}
                  image={vocabPrompt?.image}
                  options={ex.options}
                  value={answers[ex._id]}
                  onChange={(v) => setAnswer(ex._id, v)}
                  type={ex.type}
                />
              )
            })}
          </div>
          <div className='px-5 py-4 border-t border-hairline'>
            <button onClick={submit} disabled={!allAnswered || submitting} className='w-full py-4 rounded-2xl bg-accent text-white font-medium disabled:opacity-50'>
              {submitting ? 'Submitting…' : 'Finish & submit'}
            </button>
          </div>
        </>
      )}

      {stage === 'result' && result && (
        <div className='flex-1 flex flex-col items-center justify-center px-8 text-center'>
          <p className='font-mono text-6xl text-accent mb-3'>{result.score}%</p>
          <p className='text-ink italic mb-8 max-w-xs'>"{randomQuote()}"</p>
          <button onClick={() => onClose(true)} className='w-full max-w-xs py-4 rounded-2xl bg-accent text-white font-medium'>
            Back to today
          </button>
        </div>
      )}
    </div>
  )
}

export default ExerciseModal
