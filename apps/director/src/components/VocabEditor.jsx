import React, { useContext, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import { toast } from 'react-toastify'

const emptyRow = () => ({ word: '', example: '', image: '', translations: { ru: '', uz: '', kaa: '' } })

// Editor for the 10 vocab words of one day. Each word gets a photo (uploaded to the server and
// named after the word), an example sentence and ru/uz/kaa translations. The 30 test questions are
// generated automatically on save - the director never writes them by hand.
const VocabEditor = ({ languageId, levelId, day, initial, onClose, onSaved }) => {
  const { saveVocab, uploadContentImage, backendUrl } = useContext(DirectorContext)

  // always show exactly 10 slots
  const seed = () => {
    const rows = (initial && initial.length ? initial : []).map(w => ({
      word: w.word || '', example: w.example || '', image: w.image || '',
      translations: { ru: w.translations?.ru || '', uz: w.translations?.uz || '', kaa: w.translations?.kaa || '' },
    }))
    while (rows.length < 10) rows.push(emptyRow())
    return rows.slice(0, 10)
  }
  const [rows, setRows] = useState(seed)
  const [uploadingIdx, setUploadingIdx] = useState(null)
  const [saving, setSaving] = useState(false)

  const setRow = (i, patch) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const setTr = (i, code, val) => setRows(rows.map((r, idx) => idx === i ? { ...r, translations: { ...r.translations, [code]: val } } : r))

  const onPickImage = async (i, file) => {
    if (!file) return
    const word = rows[i].word.trim()
    if (!word) { toast.error('Type the English word first - the photo is saved under that name'); return }
    setUploadingIdx(i)
    const path = await uploadContentImage('vocab', word, file)
    setUploadingIdx(null)
    if (path) setRow(i, { image: path })
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
      <p className='text-xs text-muted'>10 words for day {day}. Photo files are saved on the server named after the word (e.g. <span className='font-mono'>market-stall.png</span>). Fill what you have now - you can re-open and finish later.</p>

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
            </div>

            <div className='flex-1 flex flex-col gap-2'>
              <div className='flex gap-2'>
                <input placeholder='Word (English)' value={r.word} onChange={e => setRow(i, { word: e.target.value })}
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
