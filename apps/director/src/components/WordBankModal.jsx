import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { toast } from 'react-toastify'

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
  const [jsonText, setJsonText] = useState('')
  const [filling, setFilling] = useState(false)
  const [result, setResult] = useState(null)

  const submit = async () => {
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error('That is not valid JSON')
      return
    }
    const words = Array.isArray(parsed) ? parsed : parsed.words
    if (!Array.isArray(words) || words.length === 0) { toast.error('Expected a "words" array'); return }

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
      <p className='text-xs text-muted'>
        Paste as many words as you like for <span className='text-ink font-medium'>{levelName}</span> - no day limit here.
        Filling walks day 1 upward and drops 10 words into every day that's still empty, skipping any day you've already built. Photos are matched automatically from <span className='font-mono'>server/public/images/vocab/</span> by word name - nothing to upload here.
      </p>

      <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
        rows={16} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />

      {result && (
        <div className='bg-accent-soft rounded-xl p-3 text-sm text-ink'>
          <p>Filled <span className='font-mono'>{result.daysFilled}</span> day{result.daysFilled === 1 ? '' : 's'} using <span className='font-mono'>{result.wordsUsed}</span> word{result.wordsUsed === 1 ? '' : 's'}.</p>
          {result.wordsRemaining > 0 && <p className='text-muted mt-1'>{result.wordsRemaining} word{result.wordsRemaining === 1 ? '' : 's'} left over - no empty days remained to put them in.</p>}
          {result.emptyDaysRemaining > 0 && <p className='text-muted mt-1'>{result.emptyDaysRemaining} day{result.emptyDaysRemaining === 1 ? '' : 's'} still empty - the bank ran out first.</p>}
          {result.filled?.length > 0 && (
            <p className='text-muted mt-1 font-mono text-xs'>Days: {result.filled.map(f => `${f.day} (${f.count})`).join(', ')}</p>
          )}
        </div>
      )}

      <div className='flex gap-2 justify-end'>
        <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>Insert example</button>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>Close</button>
        <button onClick={submit} disabled={filling} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {filling ? 'Filling…' : 'Fill empty days'}
        </button>
      </div>
    </div>
  )
}

export default WordBankModal
