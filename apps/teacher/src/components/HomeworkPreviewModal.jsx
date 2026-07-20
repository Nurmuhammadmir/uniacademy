import React, { useContext, useEffect, useState } from 'react'
import { TeacherContext } from '../context/TeacherContext.jsx'
import { resolveImageUrl } from '../lib/format.js'

// same idea as the student app's buildVocabPrompt - a VocabExercise only stores
// {type, conceptId, options, correct}; what's actually SHOWN depends on the type: picture_match
// shows the concept's picture, translation_match shows all 3 native translations at once,
// fill_gap shows the example sentence with the word blanked out.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const buildVocabPrompt = (ex) => {
  const c = ex.conceptId || {}
  if (ex.type === 'picture_match') return { image: c.image || null, question: 'Which word matches this picture?' }
  if (ex.type === 'translation_match') {
    const parts = [c.translations?.ru, c.translations?.uz, c.translations?.kaa].filter(Boolean)
    return { image: null, question: parts.length ? `Translate: ${parts.join(' / ')}` : 'Translate this word' }
  }
  if (c.example && c.word) {
    const blanked = c.example.replace(new RegExp(`\\b${escapeRegExp(c.word)}\\b`, 'i'), '____')
    return { image: null, question: blanked }
  }
  return { image: null, question: c.example || 'Fill in the blank' }
}

// one question, rendered the same way regardless of type (true/false buttons, multiple-choice
// buttons, or a free-text answer shown directly) - the correct option is highlighted green right
// away, no tapping needed to reveal it, since this is a preview for the teacher's own benefit
// (see what her students will be asked), not something she's being tested on. Nothing here is
// ever submitted, scored, or saved anywhere - buttons are inert, purely visual.
const PreviewCard = ({ index, question, image, options, type, correctValue, backendUrl }) => {
  const isTrueFalse = type === 'true_false'
  const hasOptions = Array.isArray(options) && options.length > 0
  const isCorrectValue = (value) => String(value) === String(correctValue)

  return (
    <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-3'>
      <p className='text-xs font-mono text-muted mb-2'>Question {index + 1}</p>
      {image && <img src={resolveImageUrl(image, backendUrl)} alt='' className='w-full aspect-square object-cover rounded-xl mb-3' />}
      <p className='text-ink font-medium mb-2'>{question}</p>

      {isTrueFalse ? (
        <div className='grid grid-cols-2 gap-2'>
          {['true', 'false'].map(v => (
            <div key={v} className={`rounded-xl border px-4 py-3 capitalize ${isCorrectValue(v) ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-hairline bg-bg-elevated text-ink'}`}>
              {v}
            </div>
          ))}
        </div>
      ) : hasOptions ? (
        <div className='flex flex-col gap-2'>
          {options.map((option, i) => {
            const optionValue = typeof option === 'object' ? option._id : option
            const label = typeof option === 'object' ? (option.word || option.text || '') : option
            return (
              <div key={i} className={`rounded-xl border text-left px-4 py-3 ${isCorrectValue(optionValue) ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-hairline bg-bg-elevated text-ink'}`}>
                {label}
              </div>
            )
          })}
        </div>
      ) : (
        <p className='text-accent text-sm font-medium'>Correct answer: {typeof correctValue === 'object' ? correctValue?.word : String(correctValue ?? '—')}</p>
      )}
    </div>
  )
}

const TABS = [
  ['vocab', '🔤 Vocab'],
  ['grammar', '✏️ Grammar'],
  ['reading', '📖 Reading'],
]

// lets a teacher see (and try) the exact real homework her students get today for this group -
// purely a preview: nothing tapped here is ever submitted, scored, or saved as progress anywhere
const HomeworkPreviewModal = ({ groupId, initialSection, onClose }) => {
  const { getTodayHomework, backendUrl } = useContext(TeacherContext)
  const [data, setData] = useState(false)
  const [tab, setTab] = useState(initialSection || 'vocab')

  useEffect(() => { getTodayHomework(groupId).then(setData) }, [groupId])

  const exercises = !data ? [] : tab === 'vocab' ? data.vocab : tab === 'grammar' ? data.grammar : data.readingExercises

  return (
    <div className='fixed inset-0 bg-bg z-50 flex justify-center'>
      <div className='w-full max-w-md flex flex-col h-full'>
        <div className='flex items-center justify-between px-5 pt-6 pb-4 border-b border-hairline'>
          <button onClick={onClose} className='text-muted text-sm'>Close</button>
          <p className='font-display text-ink'>Today's homework{data ? ` · day ${data.dayCounter}/${data.durationDays}` : ''}</p>
          <span className='w-10' />
        </div>

        <div className='flex gap-2 px-5 py-3 border-b border-hairline'>
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === key ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {!data ? (
            <p className='text-muted'>Loading…</p>
          ) : (
            <>
              {tab === 'reading' && data.readingText && (
                <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-4'>
                  {data.readingText.image && (
                    <img src={resolveImageUrl(data.readingText.image, backendUrl)} alt={data.readingText.title} className='w-full h-32 object-contain bg-bg rounded-xl mb-3' />
                  )}
                  <p className='font-display text-lg text-ink mb-2'>{data.readingText.title}</p>
                  {data.readingText.paragraphs?.map(p => (
                    <p key={p.id} className='text-ink text-sm mb-2 leading-relaxed'>{p.text}</p>
                  ))}
                </div>
              )}

              {exercises.map((ex, i) => {
                const vocabPrompt = tab === 'vocab' ? buildVocabPrompt(ex) : null
                const correctValue = tab === 'vocab' ? ex.correct?._id : ex.correct
                return (
                  <PreviewCard
                    key={ex._id}
                    index={i}
                    question={vocabPrompt ? vocabPrompt.question : (ex.question || 'Match the correct answer')}
                    image={vocabPrompt?.image}
                    options={ex.options}
                    type={ex.type}
                    correctValue={correctValue}
                    backendUrl={backendUrl}
                  />
                )
              })}
              {exercises.length === 0 && (tab !== 'reading' || !data.readingText) && (
                <p className='text-muted text-sm'>Nothing here yet for today.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomeworkPreviewModal
