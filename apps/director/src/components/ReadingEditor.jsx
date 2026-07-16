import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { confirm } from '../lib/confirm.js'
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

const READING_TYPE_LABEL_KEYS = {
  true_false: 'readingTypeTrueFalse',
  multiple_choice: 'readingTypeMultipleChoice',
  sequencing: 'readingTypeSequencing',
  summary_gap_fill: 'readingTypeSummaryGapFill',
}

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
  const { t } = useLanguage()

  const [title, setTitle] = useState(initial?.title || '')
  const [image, setImage] = useState(initial?.image || '')
  // prefer the resolved image's filename; if unresolved, fall back to the raw filename hint kept
  // from the last paste - so a photo dropped onto the server AFTER the JSON was pasted can still be
  // found once this editor is reopened (see the auto-recheck effect below)
  const [imageName, setImageName] = useState(() => (initial?.image ? initial.image.split('/').pop() : (initial?.imageHint || '')))
  const [uploading, setUploading] = useState(false)
  const [recheckingImage, setRecheckingImage] = useState(false)
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
    // an explicitly typed photo name wins (so upload and manual-drop-then-recheck save under the
    // same filename); otherwise derive one from the title like before
    const name = imageName.trim() || (title.trim() ? `reading-day${day}-${title}` : `reading-day${day}`)
    setUploading(true)
    const path = await uploadContentImage('reading', name, file)
    setUploading(false)
    if (path) { setImage(path); setImageName(path.split('/').pop()) }
  }

  // silently retries the pending filename hint once when the editor opens - covers the common case
  // where the JSON (with its "image" filename) was pasted before the actual photo file was dropped
  // onto the server, so reopening this day later picks it up with no manual recheck needed
  useEffect(() => {
    if (image || !imageName.trim()) return
    resolveContentImage('reading', { filename: imageName.trim() }).then(path => { if (path) setImage(path) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // looks for a photo the director already dropped into server/public/images/reading/ by hand,
  // matched by the exact filename typed here
  const recheckImage = async (filename) => {
    const name = (filename ?? imageName).trim()
    if (!name) { toast.error(t('typeFilenameFirst')); return }
    setRecheckingImage(true)
    const path = await resolveContentImage('reading', { filename: name })
    setRecheckingImage(false)
    if (path) { setImage(path); toast.success(t('photoFoundAttached')) }
    else toast.error(t('noFileNamed', { name }))
  }

  const buildParagraphs = () => paraText.split(/\n\s*\n/).map(t2 => t2.trim()).filter(Boolean).map((text, i) => ({ id: `p${i + 1}`, text }))

  const loadJson = async () => {
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error(t('notValidJson'))
      return
    }
    if (typeof parsed.title === 'string') setTitle(parsed.title)
    if (Array.isArray(parsed.paragraphs)) setParaText(parsed.paragraphs.map(p => p.text).join('\n\n'))
    if (Array.isArray(parsed.exercises)) setExercises(buildRowsFromRaw(parsed.exercises))

    // the JSON names its image file explicitly (director drops it into
    // server/public/images/reading/ by hand) - check whether it's there already. Trimmed since
    // pasted JSON can carry stray leading/trailing whitespace that wouldn't match the real filename.
    if (parsed.image) {
      const trimmedImageName = parsed.image.trim()
      setImageName(trimmedImageName)
      const path = await resolveContentImage('reading', { filename: trimmedImageName })
      if (path) setImage(path)
    }

    setMode('form')
    toast.success(t('loadedReadingFromJson'))
  }

  const submit = async () => {
    if (!title.trim()) { toast.error(t('addTitleOrCancel')); return }
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

  // deliberately bypasses the "add a title" guard above - wipes just this day's reading text and
  // exercises, leaving that day's vocab and grammar untouched
  const clearReading = async () => {
    if (!(await confirm(t('confirmClearReading')))) return
    setSaving(true)
    const ok = await saveReading({ languageId, levelId, day, title: '', image: '', paragraphs: [], exercises: [] })
    setSaving(false)
    if (ok) { onSaved?.(); onClose() }
  }

  const paras = buildParagraphs()

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex justify-between items-center'>
        <p className='text-xs text-muted'>{t('readingHint', { day })}</p>
        <div className='flex gap-1 shrink-0 ml-3'>
          <button onClick={() => setMode('form')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'form' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>{t('formTab')}</button>
          <button onClick={() => setMode('json')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'json' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>{t('pasteJsonTab')}</button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className='flex flex-col gap-2'>
          <p className='text-[11px] text-muted'>{t('imageJsonHint')}</p>
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
            rows={16} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />
          <div className='flex gap-2 justify-end'>
            <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>{t('insertExample')}</button>
            <button onClick={loadJson} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>{t('loadIntoForm')}</button>
          </div>
        </div>
      ) : (
        <>
          <div className='flex gap-3'>
            <div className='flex flex-col items-center gap-1 w-28 shrink-0'>
              <div className='w-28 h-28 rounded-lg bg-bg border border-hairline overflow-hidden flex items-center justify-center'>
                {image ? <img src={backendUrl + image} alt='reading' className='w-full h-full object-cover' /> : <span className='text-muted text-xs'>{t('noImage')}</span>}
              </div>
              <label className='text-[11px] text-accent cursor-pointer'>
                {uploading ? t('uploadingLabel') : (image ? t('changeImage') : t('uploadImage'))}
                <input type='file' accept='image/*' className='hidden' onChange={e => onPickImage(e.target.files[0])} />
              </label>
            </div>
            <div className='flex-1 flex flex-col gap-2'>
              <input placeholder={t('readingTitlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)}
                className='w-full px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
              <div className='flex gap-2'>
                <input placeholder={t('photoFilenamePlaceholder')} value={imageName}
                  onChange={e => setImageName(e.target.value)}
                  onBlur={() => imageName.trim() && recheckImage(imageName)}
                  className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-xs' />
                <button type='button' onClick={() => recheckImage(imageName)} disabled={recheckingImage}
                  className='px-3 py-2 rounded-lg border border-hairline text-xs text-accent font-medium shrink-0 disabled:opacity-50'>
                  {recheckingImage ? t('checking') : t('recheckBtn')}
                </button>
              </div>
              <p className='text-[10px] text-muted'>{t('typeExactFilenameHint')}</p>
            </div>
          </div>

          <textarea placeholder={t('readingTextPlaceholder')} value={paraText} onChange={e => setParaText(e.target.value)}
            rows={6} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
          <p className='text-[11px] text-muted'>{t('paragraphCount', { count: paras.length, plural: paras.length === 1 ? '' : 's', list: paras.map(p => p.id).join(', ') || '—' })}</p>

          <p className='text-sm text-ink font-medium mt-1'>{t('questionsLabel')}</p>
          {exercises.map((e, i) => (
            <div key={i} className='border border-hairline rounded-xl p-3 flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <span className='text-muted text-xs'>{i + 1}.</span>
                <span className='text-xs px-2 py-0.5 rounded bg-accent-soft text-accent'>{t(READING_TYPE_LABEL_KEYS[e.type])}</span>
                {(e.type === 'true_false' || e.type === 'multiple_choice') && (
                  <input placeholder={t('paragraphRefPlaceholder')} value={e.paragraphRef} onChange={ev => setEx(i, { paragraphRef: ev.target.value })}
                    className='px-2 py-1 rounded bg-bg border border-hairline text-xs w-28' />
                )}
              </div>

              {e.type === 'sequencing' ? (
                <>
                  <textarea placeholder={t('itemsOnePerLine')} value={e.itemsText} onChange={ev => setEx(i, { itemsText: ev.target.value })}
                    rows={3} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm font-mono' />
                  <input placeholder={t('correctOrderPlaceholder')} value={e.orderText} onChange={ev => setEx(i, { orderText: ev.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                </>
              ) : (
                <>
                  <input placeholder={e.type === 'summary_gap_fill' ? t('sentenceWithGap') : t('questionPlaceholder')} value={e.question} onChange={ev => setEx(i, { question: ev.target.value })}
                    className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  {(e.type === 'multiple_choice' || e.type === 'summary_gap_fill') && (
                    <textarea placeholder={t('optionsOnePerLine')} value={e.optionsText} onChange={ev => setEx(i, { optionsText: ev.target.value })}
                      rows={2} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm font-mono' />
                  )}
                  {e.type === 'true_false' ? (
                    <select value={e.correct} onChange={ev => setEx(i, { correct: ev.target.value })}
                      className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm'>
                      <option value='true'>{t('trueLabel')}</option>
                      <option value='false'>{t('falseLabel')}</option>
                    </select>
                  ) : (
                    <input placeholder={t('correctAnswerExact')} value={e.correct} onChange={ev => setEx(i, { correct: ev.target.value })}
                      className='px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  )}
                </>
              )}
            </div>
          ))}
        </>
      )}

      <div className='flex gap-2 justify-end sticky bottom-0 bg-bg-elevated pt-2'>
        <button onClick={clearReading} disabled={saving} className='px-4 py-2 text-red-500 text-sm font-medium disabled:opacity-50 mr-auto'>
          {t('clearReadingBtn')}
        </button>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>{t('cancel')}</button>
        <button onClick={submit} disabled={saving} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {saving ? t('saving') : t('saveReading')}
        </button>
      </div>
    </div>
  )
}

export default ReadingEditor
