import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { toast } from 'react-toastify'

const emptyRow = () => ({ word: '', example: '', image: '', translations: { ru: '', uz: '', kaa: '' } })

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

// Editor for the 10 vocab words of one day. Photos are NOT typed here - the director drops image
// files into server/public/images/vocab by hand (named after the word, e.g. market-stall.png) and
// this editor auto-detects a match as soon as the word is typed or pasted in via JSON. The 30 test
// questions are generated automatically on save - the director never writes them by hand.
const VocabEditor = ({ languageId, levelId, day, initial, onClose, onSaved }) => {
  const { saveVocab, uploadContentImage, resolveContentImage, backendUrl } = useContext(DirectorContext)

  const seed = () => {
    const rows = (initial && initial.length ? initial : []).map(w => ({
      word: w.word || '', example: w.example || '', image: w.image || '',
      translations: { ru: w.translations?.ru || '', uz: w.translations?.uz || '', kaa: w.translations?.kaa || '' },
    }))
    while (rows.length < 10) rows.push(emptyRow())
    return rows.slice(0, 10)
  }
  const [rows, setRows] = useState(seed)
  const [mode, setMode] = useState('form') // 'form' | 'json'
  const [jsonText, setJsonText] = useState('')
  const [uploadingIdx, setUploadingIdx] = useState(null)
  const [resolvingIdx, setResolvingIdx] = useState(null)
  const [recheckingAll, setRecheckingAll] = useState(false)
  const [saving, setSaving] = useState(false)

  const setRow = (i, patch) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const setTr = (i, code, val) => setRows(rows.map((r, idx) => idx === i ? { ...r, translations: { ...r.translations, [code]: val } } : r))

  // tries to find a photo the director already dropped into the vocab folder, matched by word
  const autoMatchPhoto = async (i, word) => {
    if (!word.trim() || rows[i].image) return
    setResolvingIdx(i)
    const path = await resolveContentImage('vocab', { name: word })
    setResolvingIdx(null)
    if (path) setRow(i, { image: path })
  }

  // rechecks every row's photo against server/public/images/vocab in one go, even rows that
  // already show an image - covers "I just dropped in a replacement/late-arriving file" without
  // retyping every word one at a time
  const recheckAllPhotos = async () => {
    setRecheckingAll(true)
    const updated = await Promise.all(rows.map(async (r) => {
      if (!r.word.trim()) return r
      const path = await resolveContentImage('vocab', { name: r.word })
      return path ? { ...r, image: path } : r
    }))
    setRows(updated)
    setRecheckingAll(false)
    toast.success('Rechecked photos')
  }

  const onPickImage = async (i, file) => {
    if (!file) return
    const word = rows[i].word.trim()
    if (!word) { toast.error('Type the English word first - the photo is saved under that name'); return }
    setUploadingIdx(i)
    const path = await uploadContentImage('vocab', word, file)
    setUploadingIdx(null)
    if (path) setRow(i, { image: path })
  }

  const loadJson = async () => {
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      toast.error('That is not valid JSON')
      return
    }
    const words = Array.isArray(parsed) ? parsed : parsed.words
    if (!Array.isArray(words)) { toast.error('Expected a "words" array'); return }

    const built = words.slice(0, 10).map(w => ({
      word: w.word || '', example: w.example || '', image: '',
      translations: { ru: w.translations?.ru || '', uz: w.translations?.uz || '', kaa: w.translations?.kaa || '' },
      _imageHint: w.image || '',
    }))
    while (built.length < 10) built.push(emptyRow())

    // resolve a photo for every word - by the JSON's own "image" filename if it gave one,
    // otherwise by matching the word itself against files already in the vocab folder
    const resolved = await Promise.all(built.map(async (r) => {
      const { _imageHint, ...rest } = r
      if (!rest.word.trim()) return rest
      const path = _imageHint
        ? await resolveContentImage('vocab', { filename: _imageHint })
        : await resolveContentImage('vocab', { name: rest.word })
      return path ? { ...rest, image: path } : rest
    }))

    setRows(resolved)
    setMode('form')
    toast.success(`Loaded ${words.length} word${words.length === 1 ? '' : 's'} from JSON`)
  }

  const submit = async () => {
    const words = rows.filter(r => r.word.trim())
    if (words.length === 0) { toast.error('Add at least one word'); return }
    setSaving(true)
    const ok = await saveVocab({ languageId, levelId, day, words })
    setSaving(false)
    if (ok) { onSaved?.(); onClose() }
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex justify-between items-center'>
        <p className='text-xs text-muted'>10 words for day {day}. Photos are never typed here - drop the file into <span className='font-mono'>server/public/images/vocab/</span> named after the word (e.g. <span className='font-mono'>market-stall.png</span>) and it attaches automatically.</p>
        <div className='flex gap-1 shrink-0 ml-3'>
          {mode === 'form' && (
            <button onClick={recheckAllPhotos} disabled={recheckingAll} className='px-2.5 py-1 rounded-lg text-xs font-medium bg-bg text-muted disabled:opacity-50'>
              {recheckingAll ? 'Rechecking…' : '🔄 Recheck all photos'}
            </button>
          )}
          <button onClick={() => setMode('form')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'form' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>Form</button>
          <button onClick={() => setMode('json')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${mode === 'json' ? 'bg-accent text-white' : 'bg-bg text-muted'}`}>Paste JSON</button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className='flex flex-col gap-2'>
          <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder={JSON_EXAMPLE}
            rows={14} className='px-3 py-2 rounded-lg bg-bg border border-hairline text-xs font-mono' />
          <div className='flex gap-2 justify-end'>
            <button onClick={() => setJsonText(JSON_EXAMPLE)} className='px-3 py-2 text-muted text-sm'>Insert example</button>
            <button onClick={loadJson} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium'>Load into form</button>
          </div>
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {rows.map((r, i) => (
            <div key={i} className='border border-hairline rounded-xl p-3 flex gap-3'>
              <div className='flex flex-col items-center gap-1 w-24 shrink-0'>
                <div className='w-24 h-24 rounded-lg bg-bg border border-hairline overflow-hidden flex items-center justify-center'>
                  {r.image
                    ? <img src={backendUrl + r.image} alt={r.word} className='w-full h-full object-cover' />
                    : <span className='text-muted text-2xl'>{i + 1}</span>}
                </div>
                <label className='text-[11px] text-accent cursor-pointer'>
                  {uploadingIdx === i ? 'Uploading…' : (r.image ? 'Change photo' : 'Upload photo')}
                  <input type='file' accept='image/*' className='hidden' onChange={e => onPickImage(i, e.target.files[0])} />
                </label>
                {resolvingIdx === i && <span className='text-[10px] text-muted'>checking…</span>}
                {!r.image && resolvingIdx !== i && r.word.trim() && (
                  <button onClick={() => autoMatchPhoto(i, r.word)} className='text-[10px] text-muted underline'>recheck</button>
                )}
              </div>

              <div className='flex-1 flex flex-col gap-2'>
                <div className='flex gap-2'>
                  <input placeholder='Word (English)' value={r.word}
                    onChange={e => setRow(i, { word: e.target.value })}
                    onBlur={e => autoMatchPhoto(i, e.target.value)}
                    className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  <input placeholder='Example sentence' value={r.example} onChange={e => setRow(i, { example: e.target.value })}
                    className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                </div>
                <div className='flex gap-2'>
                  <input placeholder='RU' value={r.translations.ru} onChange={e => setTr(i, 'ru', e.target.value)}
                    className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  <input placeholder='UZ' value={r.translations.uz} onChange={e => setTr(i, 'uz', e.target.value)}
                    className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                  <input placeholder='KAA' value={r.translations.kaa} onChange={e => setTr(i, 'kaa', e.target.value)}
                    className='flex-1 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className='flex gap-2 justify-end sticky bottom-0 bg-bg-elevated pt-2'>
        <button onClick={onClose} className='px-4 py-2 text-muted text-sm'>Cancel</button>
        <button onClick={submit} disabled={saving} className='px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
          {saving ? 'Saving…' : 'Save vocab'}
        </button>
      </div>
    </div>
  )
}

export default VocabEditor
