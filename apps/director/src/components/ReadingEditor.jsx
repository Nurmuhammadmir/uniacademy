import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { toast } from 'react-toastify'

// A day's reading is 1 text + exactly 10 exercises: 4 true_false, 3 multiple_choice, 1 sequencing,
// 2 summary_gap_fill. This editor lays those out as a fixed template so the count is always right.
const TEMPLATE = [
  ...Array(4).fill('true_false'),
  ...Array(3).fill('multiple_choice'),
  'sequencing',
  ...Array(2).fill('summary_gap_fill'),
]

const JSON_EXAMPLE = `{
  "title": "A Day at the Market",
  "image": "reading-beginner-day6.png",
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
}`

const blankFor = (type) => {
  if (type === 'true_false') return { type, paragraphRef: '', question: '', correct: 'true' }
  if (type === 'multiple_choice') return { type, paragraphRef: '', question: '', optionsText: '', correct: '' }
  if (type === 'sequencing') return { type, itemsText: '', orderText: '' }
  return { type: 'summary_gap_fill', question: '', optionsText: '', correct: '' } // summary_gap_fill
}

// builds the 10 template rows from a raw exercise list - works for either the DB shape (options/
// correct for every type) or the JSON-paste shape (items/correctOrder for sequencing specifically)
const buildRowsFromRaw = (rawList) => {
  const byType = {}
  ;(rawList || []).forEach(e => { (byType[e.type] = byType[e.type] || []).push(e) })
  return TEMPLATE.map(type => {
    const saved = byType[type]?.shift()
    const base = blankFor(type)
    if (!saved) return base
    if (type === 'true_false') return { ...base, paragraphRef: saved.paragraphRef || '', question: saved.question || '', correct: String(saved.correct) }
    if (type === 'multiple_choice') return { ...base, paragraphRef: saved.paragraphRef || '', question: saved.question || '', optionsText: (saved.options || []).join('\n'), correct: saved.correct ?? '' }
    if (type === 'sequencing') {
      const items = saved.items || saved.options || []
      const order = saved.correctOrder || saved.correct || []
      return { ...base, itemsText: items.join('\n'), orderText: order.join(', ') }
    }
    return { ...base, question: saved.question || '', optionsText: (saved.options || []).join('\n'), correct: saved.correct ?? '' }
  })
}

const ReadingEditor = ({ languageId, levelId, day, initial, onClose, onSaved }) => {
  const { saveReading, uploadContentImage, resolveContentImage, backendUrl } = useContext(DirectorContext)

  const [title, setTitle] = useState(initial?.title || '')
  const [image, setImage] = useState(initial?.image || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('form') // 'form' | 'json'
  const [jsonText, setJsonText] = useState('')
  // paragraphs as editable text; ids are auto p1..pN
  const [paraText, setParaText] = useState(
    (initial?.paragraphs || []).map(p => p.text).join('\n\n')
  )

  const [exercises, setExercises] = useState(() => buildRowsFromRaw(initial?.exercises))

  const setEx = (i, patch) => setExercises(exercises.map((e, idx) => idx === i ? { ...e, ...patch } : e))

  const onPickImage = async (file) => {
    if (!file) return
    const name = title.trim() ? `reading-day${day}-${title}` : `reading-day${day}`
    setUploading(true)
    const path = await uploadContentImage('reading', name, file)
    setUploading(false)
    if (path) setImage(path)
  }

  const buildParagraphs = () => paraText.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean).map((text, i) => ({ id: `p${i + 1}`, text }))

  const loadJson = async () => {
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error('That is not valid JSON')
      return
    }
    if (typeof parsed.title === 'string') setTitle(parsed.title)
    if (Array.isArray(parsed.paragraphs)) setParaText(parsed.paragraphs.map(p => p.text).join('\n\n'))
    if (Array.isArray(parsed.exercises)) setExercises(buildRowsFromRaw(parsed.exercises))

    // the JSON names its image file explicitly (director drops it into
    // server/public/images/reading/ by hand) - check whether it's there already
    if (parsed.image) {
      const path = await resolveContentImage('reading', { filename: parsed.image })
      if (path) setImage(path)
    }

    setMode('form')
    toast.success('Loaded reading from JSON')
  }

  const submit = async () => {
    if (!title.trim()) { toast.error('Add a title (or Cancel to leave reading empty)'); return }
    setSaving(true)
    const built = exercises.map(e => {
      if (e.type === 'true_false') return { type: 'true_false', paragraphRef: e.paragraphRef, question: e.question, correct: e.correct === 'true' }
      if (e.type === 'multiple_choice') return { type: 'multiple_choice', paragraphRef: e.paragraphRef, question: e.question, options: e.optionsText.split('\n').map(o => o.trim()).filter(Boolean), correct: e.correct }
      if (e.type === 'sequencing') return { type: 'sequencing', items: e.itemsText.split('\n').map(o => o.trim()).filter(Boolean), correctOrder: e.orderText.split(',').map(n => Number(n.trim())).filter(n => !Number.isNaN(n)) }
      return { type: 'summary_gap_fill', question: e.question, options: e.optionsText.split('\n').map(o => o.trim()).filter(Boolean), correct: e.correct }
    })
    const ok = await saveReading({ languageId, levelId, day, title, image, paragraphs: buildParagraphs(), exercises: built })
    setSaving(false)
    if (ok) { onSaved?.(); onClose() }
  }

  const paras = buildParagraphs()

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex justify-between items-center'>
        <p className='text-xs text-muted'>1 text + 10 exercises for day {day}. Paragraphs are separated by a blank line and auto-numbered p1, p2… (referenced by the questions below).</p>
        <div className='flex gap-1 shrink-0 ml-3'>
          <button onClick={() => setMode('form')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'form' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>Form</button>
          <button onClick={() => setMode('json')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'json' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>Paste JSON</button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className='flex flex-col gap-2'>
          <p className='text-[11px] text-muted'>"image" names a file you've already dropped into <span className='font-mono'>server/public/images/reading/</span> - it attaches automatically if found, and it's fine to omit.</p>
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
            rows={16} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />
          <div className='flex gap-2 justify-end'>
            <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>Insert example</button>
            <button onClick={loadJson} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>Load into form</button>
          </div>
        </div>
      ) : (
        <>
          <div className='flex gap-3'>
            <div className='flex flex-col items-center gap-1 w-32 shrink-0'>
              <div className='w-32 h-24 rounded-lg bg-bg border border-hairline overflow-hidden flex items-center justify-center'>
                {image ? <img src={backendUrl + image} alt='reading' className='w-full h-full object-cover' /> : <span className='text-muted text-xs'>no image</span>}
              </div>
              <label className='text-[11px] text-accent cursor-pointer'>
                {uploading ? 'Uploading…' : (image ? 'Change image' : 'Upload image')}
                <input type='file' accept='image/*' className='hidden' onChange={e => onPickImage(e.target.files[0])} />
              </label>
            </div>
            <div className='flex-1'>
              <input placeholder='Reading title (e.g. A Day at the Market)' value={title} onChange={e => setTitle(e.target.value)}
                className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm mb-2' />
            </div>
          </div>

          <textarea placeholder='Reading text - separate paragraphs with a blank line' value={paraText} onChange={e => setParaText(e.target.value)}
            rows={6} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          <p className='text-[11px] text-muted'>{paras.length} paragraph{paras.length === 1 ? '' : 's'} → {paras.map(p => p.id).join(', ') || '—'}</p>

          <p className='text-sm text-ink font-medium mt-1'>Questions</p>
          {exercises.map((e, i) => (
            <div key={i} className='border border-hairline rounded-xl p-3 flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <span className='text-muted text-xs'>{i + 1}.</span>
                <span className='text-xs px-2 py-0.5 rounded bg-accent-soft text-accent'>{e.type.replace('_', ' ')}</span>
                {(e.type === 'true_false' || e.type === 'multiple_choice') && (
                  <input placeholder='paragraph (e.g. p1)' value={e.paragraphRef} onChange={ev => setEx(i, { paragraphRef: ev.target.value })}
                    className='px-2 py-1 rounded bg-bg border border-hairline text-xs w-28' />
                )}
              </div>

              {e.type === 'sequencing' ? (
                <>
                  <textarea placeholder='Items - one per line' value={e.itemsText} onChange={ev => setEx(i, { itemsText: ev.target.value })}
                    rows={3} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm font-mono' />
                  <input placeholder='Correct order as numbers (e.g. 2, 1, 3)' value={e.orderText} onChange={ev => setEx(i, { orderText: ev.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                </>
              ) : (
                <>
                  <input placeholder={e.type === 'summary_gap_fill' ? 'Sentence with a ___ gap' : 'Question'} value={e.question} onChange={ev => setEx(i, { question: ev.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  {(e.type === 'multiple_choice' || e.type === 'summary_gap_fill') && (
                    <textarea placeholder='Options - one per line' value={e.optionsText} onChange={ev => setEx(i, { optionsText: ev.target.value })}
                      rows={2} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm font-mono' />
                  )}
                  {e.type === 'true_false' ? (
                    <select value={e.correct} onChange={ev => setEx(i, { correct: ev.target.value })}
                      className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                      <option value='true'>true</option>
                      <option value='false'>false</option>
                    </select>
                  ) : (
                    <input placeholder='Correct answer (exact text)' value={e.correct} onChange={ev => setEx(i, { correct: ev.target.value })}
                      className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  )}
                </>
              )}
            </div>
          ))}
        </>
      )}

      <div className='flex gap-2 justify-end sticky bottom-0 bg-bg-elevated pt-2'>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>Cancel</button>
        <button onClick={submit} disabled={saving} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {saving ? 'Saving…' : 'Save reading'}
        </button>
      </div>
    </div>
  )
}

export default ReadingEditor
