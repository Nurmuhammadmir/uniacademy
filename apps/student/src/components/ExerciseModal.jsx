import React, { useContext, useState } from 'react'
import QuestionCard from './QuestionCard.jsx'
import { randomQuote } from '../lib/quotes.js'
import { resolveImageUrl } from '../lib/format.js'
import { StudentContext } from '../context/StudentContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'

const ICONS = { vocab: '🔤', grammar: '✏️', reading: '📖' }

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// a VocabExercise only stores {type, conceptId, options, correct} - the actual question ("what do
// you show the student") depends on the type: picture_match shows the concept's picture,
// translation_match shows all 3 native translations at once (not just Russian - the student body
// isn't only Russian speakers), fill_gap shows its example sentence with the word blanked out. The
// 4 options are always the same - words - only what's being asked differs.
const buildVocabPrompt = (ex, t) => {
  const c = ex.conceptId || {}
  if (ex.type === 'picture_match') {
    return { image: c.image || null, question: t('whichWordMatches') }
  }
  if (ex.type === 'translation_match') {
    const parts = [c.translations?.ru, c.translations?.uz, c.translations?.kaa].filter(Boolean)
    return { image: null, question: parts.length ? `${t('translateWord')}: ${parts.join(' / ')}` : t('translateWord') }
  }
  // fill_gap
  if (c.example && c.word) {
    const blanked = c.example.replace(new RegExp(`\\b${escapeRegExp(c.word)}\\b`, 'i'), '____')
    return { image: null, question: blanked }
  }
  return { image: null, question: c.example || t('fillInBlank') }
}

// 4-stage flow for vocab (intro -> flashcards -> questions -> result), 3-stage for grammar/reading
// (intro -> questions -> result). The whole modal is capped at a phone-like width so nothing -
// especially prompt photos - blows up to fill a wide desktop browser window.
const ExerciseModal = ({ section, dayData, groupId, day, submitFn, onClose }) => {
  const { backendUrl } = useContext(StudentContext)
  const { t } = useLanguage()
  const TITLES = { vocab: t('vocabulary'), grammar: t('grammar'), reading: t('reading') }
  const [stage, setStage] = useState('intro')
  const [cardIndex, setCardIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const exercises = section === 'vocab' ? (dayData.vocab || [])
    : section === 'grammar' ? (dayData.grammar || [])
    : (dayData.readingExercises || [])
  const concepts = section === 'vocab' ? (dayData.concepts || []) : []

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
  const card = concepts[cardIndex]

  return (
    <div className='fixed inset-0 bg-bg z-50 flex justify-center'>
      <div className='w-full max-w-md flex flex-col h-full'>
        <div className='flex items-center justify-between px-5 pt-6 pb-4 border-b border-hairline'>
          <button onClick={() => onClose(stage === 'result')} className='text-muted text-sm'>{t('close')}</button>
          <p className='font-display text-ink'>{TITLES[section]} · {t('dayN', { day })}</p>
          <span className='w-10' />
        </div>

        {stage === 'intro' && (
          <div className='flex-1 flex flex-col items-center justify-center px-8 text-center'>
            <span className='text-5xl mb-4'>{ICONS[section]}</span>
            <p className='font-display text-2xl text-ink mb-2'>{TITLES[section]}</p>
            <p className='text-muted mb-6'>{t('estimatedTime', { count: exercises.length, plural: exercises.length === 1 ? '' : 's', minutes: estimatedMinutes })}</p>
            <button
              onClick={() => { setCardIndex(0); setStage(concepts.length > 0 ? 'cards' : 'questions') }}
              disabled={exercises.length === 0}
              className='w-full max-w-xs py-4 rounded-2xl bg-accent text-white font-medium disabled:opacity-50'
            >
              {exercises.length === 0 ? t('nothingHereYet') : (concepts.length > 0 ? t('reviewTheWords') : t('start'))}
            </button>
          </div>
        )}

        {stage === 'cards' && (
          <>
            <div className='flex-1 flex flex-col items-center justify-center px-5'>
              <div className='w-full bg-bg-card border border-hairline rounded-2xl p-5 flex flex-col items-center'>
                {card?.image && (
                  <img src={resolveImageUrl(card.image, backendUrl)} alt='' className='w-40 h-40 object-cover rounded-xl mb-4' />
                )}
                <p className='font-display text-2xl text-ink mb-3'>{card?.word}</p>
                <div className='flex flex-col gap-1 text-center'>
                  {card?.translations?.ru && <p className='text-muted text-sm'>ru: {card.translations.ru}</p>}
                  {card?.translations?.uz && <p className='text-muted text-sm'>uz: {card.translations.uz}</p>}
                  {card?.translations?.kaa && <p className='text-muted text-sm'>kaa: {card.translations.kaa}</p>}
                </div>
              </div>
              <p className='text-muted text-xs mt-3'>{t('card', { current: cardIndex + 1, total: concepts.length })}</p>
            </div>
            <div className='flex gap-2 px-5 py-4 border-t border-hairline'>
              <button onClick={() => setCardIndex(i => Math.max(0, i - 1))} disabled={cardIndex === 0}
                className='flex-1 py-4 rounded-2xl border border-hairline text-ink font-medium disabled:opacity-40'>
                {t('previous')}
              </button>
              <button
                onClick={() => cardIndex === concepts.length - 1 ? setStage('questions') : setCardIndex(i => i + 1)}
                className='flex-1 py-4 rounded-2xl bg-accent text-white font-medium'>
                {cardIndex === concepts.length - 1 ? t('startTest') : t('next')}
              </button>
            </div>
          </>
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
                const vocabPrompt = section === 'vocab' ? buildVocabPrompt(ex, t) : null
                return (
                  <QuestionCard
                    key={ex._id}
                    index={i}
                    question={vocabPrompt ? vocabPrompt.question : (ex.question || t('matchCorrectWord'))}
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
                {submitting ? t('submitting') : t('finishSubmit')}
              </button>
            </div>
          </>
        )}

        {stage === 'result' && result && (
          <div className='flex-1 flex flex-col items-center justify-center px-8 text-center'>
            <p className='font-mono text-6xl text-accent mb-3'>{result.score}%</p>
            <p className='text-ink italic mb-8 max-w-xs'>"{randomQuote()}"</p>
            <button onClick={() => onClose(true)} className='w-full max-w-xs py-4 rounded-2xl bg-accent text-white font-medium'>
              {t('backToToday')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExerciseModal
