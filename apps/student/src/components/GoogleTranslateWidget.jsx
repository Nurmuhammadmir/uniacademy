import React, { useState } from 'react'

// a compact text translator (source language, target language, type text -> see translation),
// not a whole-page translator. Uses the free, key-less endpoint Google's own web Translate uses
// internally (translate.googleapis.com with client=gtx) - this is unofficial/undocumented but
// extremely widely used in open-source translate tools since there's no official free API for
// arbitrary short text without billing set up. If Google ever changes this endpoint, this is the
// one function that needs updating.
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Russian' },
  { code: 'uz', label: 'Uzbek' },
  { code: 'de', label: 'German' },
  { code: 'ko', label: 'Korean' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh-CN', label: 'Chinese' },
]

const translateText = async (text, source, target) => {
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`)
  const data = await res.json()
  return data[0].map(chunk => chunk[0]).join('')
}

const GoogleTranslateWidget = () => {
  const [open, setOpen] = useState(false)
  const [source, setSource] = useState('en')
  const [target, setTarget] = useState('ru')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const runTranslate = async (text, from, to) => {
    if (!text.trim()) { setOutput(''); return }
    setLoading(true)
    try {
      const result = await translateText(text, from, to)
      setOutput(result)
    } catch (error) {
      setOutput('Translation unavailable right now')
    }
    setLoading(false)
  }

  const onInputChange = (text) => {
    setInput(text)
    runTranslate(text, source, target)
  }

  const swap = () => {
    setSource(target)
    setTarget(source)
    setInput(output)
    setOutput(input)
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className='fixed right-4 bottom-24 w-12 h-12 rounded-full bg-accent text-white shadow-lg flex items-center justify-center text-xl z-40'
        aria-label='Translate'
      >
        🌐
      </button>

      {open && (
        <div className='fixed right-4 bottom-40 bg-bg-elevated border border-hairline rounded-2xl shadow-xl p-4 z-40 w-80 max-w-[calc(100vw-2rem)]'>
          <div className='flex justify-between items-center mb-3'>
            <p className='text-sm font-medium text-ink'>Translate</p>
            <button onClick={() => setOpen(false)} className='text-muted text-lg leading-none'>×</button>
          </div>

          <div className='flex items-center gap-2 mb-3'>
            <select value={source} onChange={e => { setSource(e.target.value); runTranslate(input, e.target.value, target) }}
              className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs'>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={swap} className='text-muted text-sm shrink-0' aria-label='Swap languages'>⇄</button>
            <select value={target} onChange={e => { setTarget(e.target.value); runTranslate(input, source, e.target.value) }}
              className='flex-1 px-2 py-1.5 rounded-lg bg-bg border border-hairline text-xs'>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>

          <textarea
            value={input}
            onChange={e => onInputChange(e.target.value)}
            placeholder='Type text'
            rows={3}
            className='w-full px-3 py-2 rounded-xl bg-bg border border-hairline text-sm mb-2 resize-none'
          />

          <div className='w-full px-3 py-2 rounded-xl bg-accent-soft text-ink text-sm min-h-[4.5rem]'>
            {loading ? <span className='text-muted'>Translating…</span> : (output || <span className='text-muted'>Translation</span>)}
          </div>
        </div>
      )}
    </>
  )
}

export default GoogleTranslateWidget
