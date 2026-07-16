import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { toast } from 'react-toastify'
import BankFillResult from './BankFillResult.jsx'

const JSON_EXAMPLE = `{
  "words": [
    {
      "word": "pregnant",
      "example": "She is pregnant.",
      "translations": { "ru": "беременная", "uz": "homilador", "kaa": "juklı" }
    },
    {
      "word": "market",
      "example": "We went to the market.",
      "translations": { "ru": "рынок", "uz": "bozor", "kaa": "bazar" }
    }
  ]
}`

// A word bank is not tied to any one day - it's an unlimited list of words for a whole level
// (e.g. all 260 Beginner words at once). Filling walks the level's days in order, skips any day
// that already has vocab, and drops 10 words into each empty day until either the bank or the
// empty days run out. Photos are never typed here - the director drops files into
// server/public/images/vocab/ by hand and the backend matches them by word name at fill time.
const WordBankModal = ({ languageId, levelId, levelName, onClose, onFilled }) => {
  const { fillVocabWordBank } = useContext(DirectorContext)
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
    const words = Array.isArray(parsed) ? parsed : parsed.words
    if (!Array.isArray(words) || words.length === 0) { toast.error(t('expectedWordsArray')); return }

    setFilling(true)
    const data = await fillVocabWordBank(languageId, levelId, words)
    setFilling(false)
    if (data) {
      setResult(data)
      onFilled?.()
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-xs text-muted'>{t('wordBankHint', { level: levelName })}</p>

      <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
        rows={16} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />

      <BankFillResult daysFilled={result?.daysFilled} used={result?.wordsUsed} remaining={result?.wordsRemaining}
        emptyDaysRemaining={result?.emptyDaysRemaining} filled={result?.filled} skipped={result?.skipped} unitKey='word' />

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

export default WordBankModal
