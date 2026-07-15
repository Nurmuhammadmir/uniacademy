import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'

const TYPES = [
  { value: 'multiple_choice', label: 'Multiple choice', hasOptions: true },
  { value: 'fill_gap', label: 'Fill the gap', hasOptions: true },
  { value: 'true_false', label: 'True / False', hasOptions: false },
  { value: 'reorder', label: 'Reorder words', hasOptions: false },
  { value: 'error_correction', label: 'Error correction', hasOptions: false },
  { value: 'matching', label: 'Matching', hasOptions: true },
]

const emptyRow = () => ({ type: 'multiple_choice', question: '', optionsText: '', correct: '' })

// Editor for the 5 grammar exercises of one day. Options are entered one-per-line; true/false has
// no options field (the app renders the two buttons itself).
const GrammarEditor = ({ languageId, levelId, day, initial, onClose, onSaved }) => {
  const { saveGrammar } = useContext(DirectorContext)

  const seed = () => {
    const rows = (initial && initial.length ? initial : []).map(e => ({
      type: e.type || 'multiple_choice',
      question: e.question || '',
      optionsText: Array.isArray(e.options) ? e.options.join('\n') : '',
      correct: e.correct ?? '',
    }))
    while (rows.length < 5) rows.push(emptyRow())
    return rows.slice(0, 5)
  }
  const [rows, setRows] = useState(seed)
  const [saving, setSaving] = useState(false)

  const setRow = (i, patch) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))

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
      <p className='text-xs text-muted'>5 grammar exercises for day {day}.</p>

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
