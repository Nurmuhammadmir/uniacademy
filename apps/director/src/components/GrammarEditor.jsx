import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { confirm } from '../lib/confirm.js'
import { toast } from 'react-toastify'

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
  const { t } = useLanguage()

  const TYPES = [
    { value: 'multiple_choice', label: t('typeMultipleChoice'), hasOptions: true },
    { value: 'fill_gap', label: t('typeFillGap'), hasOptions: true },
    { value: 'true_false', label: t('typeTrueFalse'), hasOptions: false },
    { value: 'reorder', label: t('typeReorder'), hasOptions: false },
    { value: 'error_correction', label: t('typeErrorCorrection'), hasOptions: false },
    { value: 'matching', label: t('typeMatching'), hasOptions: true },
  ]

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
      toast.error(t('notValidJson'))
      return
    }
    const exercises = Array.isArray(parsed) ? parsed : parsed.exercises
    if (!Array.isArray(exercises)) { toast.error(t('expectedExercisesArray')); return }

    const built = exercises.slice(0, 5).map(rowFromRaw)
    while (built.length < 5) built.push(emptyRow())
    setRows(built)
    setMode('form')
    toast.success(t('loadedExercisesFromJson', { count: exercises.length, plural: exercises.length === 1 ? '' : 's' }))
  }

  const submit = async () => {
    setSaving(true)
    const exercises = rows.map(r => {
      const meta = TYPES.find(tp => tp.value === r.type)
      const options = r.type === 'true_false'
        ? ['true', 'false']
        : (meta?.hasOptions ? r.optionsText.split('\n').map(o => o.trim()).filter(Boolean) : [])
      return { type: r.type, question: r.question, options, correct: r.correct }
    })
    const ok = await saveGrammar({ languageId, levelId, day, exercises })
    setSaving(false)
    if (ok) { onSaved?.(); onClose() }
  }

  // wipes just this day's grammar exercises, leaving that day's vocab and reading untouched
  const clearGrammar = async () => {
    if (!(await confirm(t('confirmClearGrammar')))) return
    setSaving(true)
    const ok = await saveGrammar({ languageId, levelId, day, exercises: [] })
    setSaving(false)
    if (ok) { onSaved?.(); onClose() }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex justify-between items-center'>
        <p className='text-xs text-muted'>{t('grammarHint', { day })}</p>
        <div className='flex gap-1 shrink-0 ml-3'>
          <button onClick={() => setMode('form')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'form' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>{t('formTab')}</button>
          <button onClick={() => setMode('json')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'json' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>{t('pasteJsonTab')}</button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className='flex flex-col gap-2'>
          <p className='text-[11px] text-muted'>{t('typeHintHelp')}</p>
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
            rows={14} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />
          <div className='flex gap-2 justify-end'>
            <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>{t('insertExample')}</button>
            <button onClick={loadJson} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('loadIntoForm')}</button>
          </div>
        </div>
      ) : (
        <>
          {rows.map((r, i) => {
            const meta = TYPES.find(tp => tp.value === r.type)
            return (
              <div key={i} className='border border-hairline rounded-xl p-3 flex flex-col gap-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-muted text-xs w-4'>{i + 1}</span>
                  <select value={r.type} onChange={e => setRow(i, { type: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                    {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.label}</option>)}
                  </select>
                </div>
                <input placeholder={t('questionPlaceholder')} value={r.question} onChange={e => setRow(i, { question: e.target.value })}
                  className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                {meta?.hasOptions && (
                  <textarea placeholder={t('optionsOnePerLine')} value={r.optionsText} onChange={e => setRow(i, { optionsText: e.target.value })}
                    rows={3} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm font-mono' />
                )}
                {r.type === 'true_false' ? (
                  <select value={r.correct} onChange={e => setRow(i, { correct: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                    <option value=''>{t('correctAnswerSelect')}</option>
                    <option value='true'>{t('trueLabel')}</option>
                    <option value='false'>{t('falseLabel')}</option>
                  </select>
                ) : (
                  <input placeholder={t('correctAnswerExact')} value={r.correct} onChange={e => setRow(i, { correct: e.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                )}
              </div>
            )
          })}
        </>
      )}

      <div className='flex gap-2 justify-end sticky bottom-0 bg-bg-elevated pt-2'>
        <button onClick={clearGrammar} disabled={saving} className='px-4 py-2 text-red-500 text-sm font-medium disabled:opacity-50 mr-auto'>
          {t('clearGrammarBtn')}
        </button>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>{t('cancel')}</button>
        <button onClick={submit} disabled={saving} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {saving ? t('saving') : t('saveGrammar')}
        </button>
      </div>
    </div>
  )
}

export default GrammarEditor
