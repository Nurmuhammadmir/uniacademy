import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { toast } from 'react-toastify'
import BankFillResult from './BankFillResult.jsx'

const JSON_EXAMPLE = `{
  "readings": [
    {
      "title": "A Day at the Market",
      "image": "reading-day-at-the-market.png",
      "paragraphs": [
        { "id": "p1", "text": "Amir woke up early on Saturday. He wanted to buy fresh bread and vegetables." },
        { "id": "p2", "text": "At the market, he saw many stalls. He bought bread, tomatoes and apples." }
      ],
      "exercises": [
        { "type": "true_false", "paragraphRef": "p1", "question": "Amir woke up late.", "correct": false },
        { "type": "true_false", "paragraphRef": "p1", "question": "He wanted bread and vegetables.", "correct": true },
        { "type": "true_false", "paragraphRef": "p2", "question": "He bought only bread.", "correct": false },
        { "type": "true_false", "paragraphRef": "p2", "question": "He bought tomatoes.", "correct": true },
        { "type": "multiple_choice", "paragraphRef": "p1", "question": "When did Amir wake up?", "options": ["Early", "Late", "At noon", "At night"], "correct": "Early" },
        { "type": "multiple_choice", "paragraphRef": "p2", "question": "What did he see at the market?", "options": ["Stalls", "Cars", "Books", "Animals"], "correct": "Stalls" },
        { "type": "multiple_choice", "paragraphRef": "p2", "question": "What fruit did he buy?", "options": ["Apples", "Bananas", "Grapes", "Oranges"], "correct": "Apples" },
        { "type": "sequencing", "items": ["He woke up", "He went to the market", "He bought bread"], "correctOrder": [1, 2, 3] },
        { "type": "summary_gap_fill", "question": "Amir went to the ___ to buy food.", "options": ["market", "school", "park", "home"], "correct": "market" },
        { "type": "summary_gap_fill", "question": "He bought bread, tomatoes and ___.", "options": ["apples", "shoes", "books", "chairs"], "correct": "apples" }
      ]
    }
  ]
}`

// A reading bank is a list of COMPLETE readings, not sub-items to batch - each entry already is
// one whole day (1 text + 10 exercises), so filling assigns one reading per empty day in order,
// skipping any day already built. "image" names a file the director drops into
// server/public/images/reading/ by hand; it attaches automatically if the file is found there,
// and it's fine to omit while the photo isn't ready yet.
const ReadingBankModal = ({ languageId, levelId, levelName, onClose, onFilled }) => {
  const { fillReadingBank } = useContext(DirectorContext)
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
    const readings = Array.isArray(parsed) ? parsed : parsed.readings
    if (!Array.isArray(readings) || readings.length === 0) { toast.error('Expected a "readings" array'); return }

    setFilling(true)
    const data = await fillReadingBank(languageId, levelId, readings)
    setFilling(false)
    if (data) {
      setResult(data)
      onFilled?.()
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-xs text-muted'>
        Paste as many complete readings as you like for <span className='text-ink font-medium'>{levelName}</span> - each one is a whole day (1 text + 10 exercises), so filling puts one reading into every day that's still empty, skipping any day you've already built.
        "image" names a file you've dropped into <span className='font-mono'>server/public/images/reading/</span> - it attaches automatically if found, and it's fine to leave out.
      </p>

      <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
        rows={16} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />

      <BankFillResult daysFilled={result?.daysFilled} used={result?.readingsUsed} remaining={result?.readingsRemaining}
        emptyDaysRemaining={result?.emptyDaysRemaining} filled={result?.filled?.map(f => ({ day: f.day, count: f.title }))} skipped={result?.skipped} unitLabel='reading' />

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

export default ReadingBankModal
