import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { toast } from 'react-toastify'

const TYPES = [
  { value: 'multiple_choice', label: 'Multiple choice', hasOptions: true },
  { value: 'fill_gap', label: 'Fill the gap', hasOptions: true },
  { value: 'true_false', label: 'True / False', hasOptions: false },
  { value: 'reorder', label: 'Reorder words', hasOptions: false },
  { value: 'error_correction', label: 'Error correction', hasOptions: false },
  { value: 'matching', label: 'Matching', hasOptions: true },
]

const emptyRow = () => ({ type: 'multiple_choice', question: '', optionsText: '', correct: '' })

const JSON_EXAMPLE = `{
  "exercises": [
    { "type": "multiple_choice", "question": "She ___ to school every day.", "options": ["go", "goes", "going", "gone"], "correct": "goes" },
    { "type": "true_false", "question": "'He don't like coffee' is grammatically correct.", "correct": "false" },
    { "type": "fill_gap", "question": "They ___ (not/like) tea.", "options": ["doesn't like", "don't like", "not like", "isn't liking"], "correct": "don't like" },
    { "type": "reorder", "question": "always / She / coffee / drinks / morning / in the", "correct": "She always drinks coffee in the morning" },
    { "type": "error_correction", "question": "He go to work by bus.", "correct": "He goes to work by bus." }
  ]
}`

const rowFromRaw = (e) => ({
  type: e.type || 'multiple_choice',
  question: e.question || '',
  optionsText: Array.isArray(e.options) ? e.options.join('\n') : '',
  correct: e.correct ?? '',
})

// Editor for the 5 grammar exercises of one day. Options are entered one-per-line; true/false has
// no options field (the app renders the two buttons itself).
const GrammarEditor = ({ languageId, levelId, day, initial, onClose, onSaved }) => {
  const { saveGrammar } = useContext(DirectorContext)

  const seed = () => {
    const rows = (initial && initial.length ? initial : []).map(rowFromRaw)
    while (rows.length < 5) rows.push(emptyRow())
    return rows.slice(0, 5)
  }
  const [rows, setRows] = useState(seed)
  const [mode, setMode] = useState('form') // 'form' | 'json'
  const [jsonText, setJsonText] = useState('')
  const [saving, setSaving] = useState(false)

  const setRow = (i, patch) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const loadJson = () => {
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error('That is not valid JSON')
      return
    }
    const exercises = Array.isArray(parsed) ? parsed : parsed.exercises
    if (!Array.isArray(exercises)) { toast.error('Expected an "exercises" array'); return }

    const built = exercises.slice(0, 5).map(rowFromRaw)
    while (built.length < 5) built.push(emptyRow())
    setRows(built)
    setMode('form')
    toast.success(`Loaded ${exercises.length} exercise${exercises.length === 1 ? '' : 's'} from JSON`)
  }

  const submit = async () => {
    setSaving(true)
    const exercises = rows.map(r => {
      const meta = TYPES.find(t => t.value === r.type)
      const options = r.type === 'true_false'
        ? ['true', 'false']
        : (meta?.hasOptions ? r.optionsText.split('\n').map(o => o.trim()).filter(Boolean) : [])
      return { type: r.type, question: r.question, options, correct: r.correct }
    })
    const ok = await saveGrammar({ languageId, levelId, day, exercises })
    setSaving(false)
    if (ok) { onSaved?.(); onClose() }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex justify-between items-center'>
        <p className='text-xs text-muted'>5 grammar exercises for day {day}.</p>
        <div className='flex gap-1 shrink-0 ml-3'>
          <button onClick={() => setMode('form')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'form' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>Form</button>
          <button onClick={() => setMode('json')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'json' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>Paste JSON</button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className='flex flex-col gap-2'>
          <p className='text-[11px] text-muted'>type is one of: multiple_choice, fill_gap, reorder, error_correction, true_false, matching. Omit "options" for true_false/reorder/error_correction.</p>
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
            rows={14} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />
          <div className='flex gap-2 justify-end'>
            <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>Insert example</button>
            <button onClick={loadJson} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>Load into form</button>
          </div>
        </div>
      ) : (
        <>
          {rows.map((r, i) => {
            const meta = TYPES.find(t => t.value === r.type)
            return (
              <div key={i} className='border border-hairline rounded-xl p-3 flex flex-col gap-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-muted text-xs w-4'>{i + 1}</span>
                  <select value={r.type} onChange={e => setRow(i, { type: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <input placeholder='Question / prompt' value={r.question} onChange={e => setRow(i, { question: e.target.value })}
                  className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                {meta?.hasOptions && (
                  <textarea placeholder='Options - one per line' value={r.optionsText} onChange={e => setRow(i, { optionsText: e.target.value })}
                    rows={3} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm font-mono' />
                )}
                {r.type === 'true_false' ? (
                  <select value={r.correct} onChange={e => setRow(i, { correct: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                    <option value=''>Correct answer…</option>
                    <option value='true'>true</option>
                    <option value='false'>false</option>
                  </select>
                ) : (
                  <input placeholder='Correct answer (exact text)' value={r.correct} onChange={e => setRow(i, { correct: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                )}
              </div>
            )
          })}
        </>
      )}

      <div className='flex gap-2 justify-end sticky bottom-0 bg-bg-elevated pt-2'>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>Cancel</button>
        <button onClick={submit} disabled={saving} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {saving ? 'Saving…' : 'Save grammar'}
        </button>
      </div>
    </div>
  )
}

export default GrammarEditor
