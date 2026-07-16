import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { toast } from 'react-toastify'
import BankFillResult from './BankFillResult.jsx'

const JSON_EXAMPLE = `{
  "exercises": [
    { "type": "multiple_choice", "question": "She ___ to school every day.", "options": ["go", "goes", "going", "gone"], "correct": "goes" },
    { "type": "multiple_choice", "question": "They ___ tea every morning.", "options": ["drink", "drinks", "drinking", "drank"], "correct": "drink" },
    { "type": "true_false", "question": "'He don't like coffee' is grammatically correct.", "correct": "false" },
    { "type": "true_false", "question": "'She goes to work by bus' is grammatically correct.", "correct": "true" },
    { "type": "fill_gap", "question": "They ___ (not/like) tea.", "options": ["doesn't like", "don't like", "not like", "isn't liking"], "correct": "don't like" }
  ]
}`

// A grammar bank is not tied to any one day - it's an unlimited list of exercises for a whole
// level. Filling walks the level's days in order, skips any day that already has grammar, and
// drops 5 exercises into each empty day until either the bank or the empty days run out.
const GrammarBankModal = ({ languageId, levelId, levelName, onClose, onFilled }) => {
  const { fillGrammarBank } = useContext(DirectorContext)
  const { t } = useLanguage()
  const [jsonText, setJsonText] = useState('')
  const [filling, setFilling] = useState(false)
  const [result, setResult] = useState(null)

  const submit = async () => {
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error(t('notValidJson'))
      return
    }
    const exercises = Array.isArray(parsed) ? parsed : parsed.exercises
    if (!Array.isArray(exercises) || exercises.length === 0) { toast.error(t('expectedExercisesArray')); return }

    setFilling(true)
    const data = await fillGrammarBank(languageId, levelId, exercises)
    setFilling(false)
    if (data) {
      setResult(data)
      onFilled?.()
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-xs text-muted'>{t('grammarBankHint', { level: levelName })}</p>

      <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
        rows={16} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />

      <BankFillResult daysFilled={result?.daysFilled} used={result?.questionsUsed} remaining={result?.questionsRemaining}
        emptyDaysRemaining={result?.emptyDaysRemaining} filled={result?.filled} skipped={result?.skipped} unitKey='question' />

      <div className='flex gap-2 justify-end'>
        <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>{t('insertExample')}</button>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>{t('close')}</button>
        <button onClick={submit} disabled={filling} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {filling ? t('filling') : t('fillEmptyDays')}
        </button>
      </div>
    </div>
  )
}

export default GrammarBankModal
