import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { toast } from 'react-toastify'

// A big, structured example covering every section x type combination the exam supports, so the
// director can see the exact shape for each without guessing. "word" on a vocab question auto-
// resolves its photo from server/public/images/vocab/ by name (same as the homework builder); an
// explicit "image" filename works the same way for a reading question, resolved from
// server/public/images/reading/. Nothing here is required beyond section/type/correct - fill in
// whatever applies to that type and leave the rest out.
const JSON_EXAMPLE = `{
  "questions": [
    { "section": "vocab", "type": "picture_match", "word": "market", "options": ["market", "school", "bridge", "hospital"], "correct": "market" },
    { "section": "vocab", "type": "translation_match", "word": "market", "translations": { "ru": "рынок", "uz": "bozor", "kaa": "bazar" }, "options": ["market", "school", "bridge", "hospital"], "correct": "market" },
    { "section": "vocab", "type": "fill_gap", "question": "She bought bread at the ____.", "options": ["market", "school", "bridge", "hospital"], "correct": "market" },
    { "section": "vocab", "type": "picture_match", "image": "market-stall.png", "options": ["market", "school", "bridge", "hospital"], "correct": "market" },

    { "section": "grammar", "type": "multiple_choice", "question": "She ___ to school every day.", "options": ["go", "goes", "going", "gone"], "correct": "goes" },
    { "section": "grammar", "type": "true_false", "question": "'He don't like coffee' is grammatically correct.", "correct": "false" },
    { "section": "grammar", "type": "fill_gap", "question": "They ___ (not/like) tea.", "options": ["doesn't like", "don't like", "not like", "isn't liking"], "correct": "don't like" },
    { "section": "grammar", "type": "reorder", "question": "always / She / coffee / drinks / morning / in the", "correct": "She always drinks coffee in the morning" },
    { "section": "grammar", "type": "error_correction", "question": "He go to work by bus.", "correct": "He goes to work by bus." },
    { "section": "grammar", "type": "matching", "question": "Match the verb to its past tense: go", "options": ["went", "goed", "gone", "going"], "correct": "went" },

    { "section": "reading", "type": "multiple_choice", "passage": "Amir woke up early and went to the market to buy bread and vegetables.", "question": "Where did Amir go?", "options": ["Market", "School", "Hospital", "Park"], "correct": "Market" },
    { "section": "reading", "type": "true_false", "passage": "Amir woke up early and went to the market to buy bread and vegetables.", "question": "Amir went to school.", "correct": false },
    { "section": "reading", "type": "summary_gap_fill", "passage": "Amir woke up early and went to the market to buy bread and vegetables.", "question": "Amir went to the ___ to buy food.", "options": ["market", "school", "park", "home"], "correct": "market" },
    { "section": "reading", "type": "multiple_choice", "image": "reading-day-at-the-market.png", "passage": "Amir woke up early and went to the market to buy bread and vegetables.", "question": "What did Amir buy?", "options": ["Bread and vegetables", "Books", "Shoes", "Toys"], "correct": "Bread and vegetables" }
  ]
}`

// The exam bank is level-wide and independent of the daily homework - the director can paste in
// as many questions as they want across as many pastes as they want (this is additive, not a
// replace), and questionCount (set in the settings form above this modal) decides how many are
// drawn at random for any one student's actual attempt.
const ExamBankModal = ({ languageId, levelId, levelName, onClose, onAdded }) => {
  const { addExamQuestions } = useContext(DirectorContext)
  const [jsonText, setJsonText] = useState('')
  const [adding, setAdding] = useState(false)
  const [result, setResult] = useState(null)

  const submit = async () => {
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error('That is not valid JSON')
      return
    }
    const questions = Array.isArray(parsed) ? parsed : parsed.questions
    if (!Array.isArray(questions) || questions.length === 0) { toast.error('Expected a "questions" array'); return }

    setAdding(true)
    const data = await addExamQuestions(languageId, levelId, questions)
    setAdding(false)
    if (data) {
      setResult(data)
      onAdded?.()
    }
  }

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-xs text-muted'>
        Paste as many exam questions as you like for <span className='text-ink font-medium'>{levelName}</span> - this ADDS to the bank, it never replaces it, so you can paste in batches over time.
        section is one of: vocab, grammar, reading. type depends on section - vocab: picture_match/translation_match/fill_gap; grammar: multiple_choice/fill_gap/reorder/error_correction/true_false/matching; reading: true_false/multiple_choice/sequencing/summary_gap_fill.
        A vocab question's "word" auto-attaches a photo from <span className='font-mono'>server/public/images/vocab/</span> by name; "image" (vocab or reading) attaches an exact filename from that section's folder. Neither is required.
      </p>

      <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
        rows={18} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />

      {result && (
        <div className='bg-accent-soft rounded-xl p-3 text-sm text-ink flex flex-col gap-1'>
          <p>Added <span className='font-mono'>{result.addedCount}</span> question{result.addedCount === 1 ? '' : 's'} - the bank now has <span className='font-mono'>{result.totalInBank}</span> total.</p>
          {result.skipped?.length > 0 && (
            <div className='mt-1 pt-2 border-t border-hairline/50'>
              <p className='text-ink'>{result.skipped.length} skipped as duplicate{result.skipped.length === 1 ? '' : 's'}:</p>
              <div className='max-h-32 overflow-y-auto mt-1 flex flex-col gap-0.5'>
                {result.skipped.map((s, i) => (
                  <p key={i} className='text-muted text-xs'><span className='text-ink'>{s.text}</span> - {s.reason}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className='flex gap-2 justify-end'>
        <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>Insert example</button>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>Close</button>
        <button onClick={submit} disabled={adding} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {adding ? 'Adding…' : 'Add to bank'}
        </button>
      </div>
    </div>
  )
}

export default ExamBankModal
