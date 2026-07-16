import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import Modal from '../components/Modal.jsx'
import VocabEditor from '../components/VocabEditor.jsx'
import GrammarEditor from '../components/GrammarEditor.jsx'
import ReadingEditor from '../components/ReadingEditor.jsx'
import WordBankModal from '../components/WordBankModal.jsx'

// The director builds the fixed daily programme students see: pick a course (language) -> a level ->
// a day, then author the day's Vocab / Grammar / Reading. Content is stored per (language, level, day)
// and shown in the student app exactly as built here.
const Homework = () => {
  const { languages, getLanguages, levels, getLevels, getContentSummary, getDayContent } = useContext(DirectorContext)

  const [languageId, setLanguageId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [summary, setSummary] = useState({})
  const [day, setDay] = useState(null)
  const [dayContent, setDayContent] = useState(null)
  const [loadingDay, setLoadingDay] = useState(false)
  const [editor, setEditor] = useState(null) // 'vocab' | 'grammar' | 'reading'
  const [showWordBank, setShowWordBank] = useState(false)

  useEffect(() => { if (!languages.length) getLanguages() }, [])

  const selectedLevel = levels.find(l => l._id === levelId)
  const durationDays = selectedLevel?.durationDays || 300
  const levelsForLanguage = levels.filter(l => l.languageId === languageId)

  const onSelectLanguage = async (id) => {
    setLanguageId(id); setLevelId(''); setSummary({}); setDay(null); setDayContent(null)
    if (id) await getLevels(id)
  }

  const loadSummary = async (lang, lvl) => {
    if (!lang || !lvl) return
    const s = await getContentSummary(lang, lvl)
    setSummary(s || {})
  }

  const onSelectLevel = async (id) => {
    setLevelId(id); setDay(null); setDayContent(null)
    await loadSummary(languageId, id)
  }

  const openDay = async (d) => {
    setDay(d); setLoadingDay(true); setDayContent(null)
    const content = await getDayContent(languageId, levelId, d)
    setDayContent(content)
    setLoadingDay(false)
  }

  const refreshAfterSave = async () => {
    await loadSummary(languageId, levelId)
    if (day) { const content = await getDayContent(languageId, levelId, day); setDayContent(content) }
  }

  const dot = (on) => <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-accent' : 'bg-hairline'}`} />

  return (
    <div>
      <p className='font-display text-2xl text-ink mb-1'>Homework builder</p>
      <p className='text-muted text-sm mb-6'>Build the day-by-day programme students study. Pick a course, a level, then a day.</p>

      {/* course + level pickers */}
      <div className='flex flex-wrap gap-3 mb-6'>
        <select value={languageId} onChange={e => onSelectLanguage(e.target.value)}
          className='px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm text-ink min-w-[180px]'>
          <option value=''>Select course…</option>
          {languages.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
        </select>

        <select value={levelId} onChange={e => onSelectLevel(e.target.value)} disabled={!languageId}
          className='px-4 py-2.5 rounded-xl bg-bg-elevated border border-hairline text-sm text-ink min-w-[180px] disabled:opacity-50'>
          <option value=''>Select level…</option>
          {levelsForLanguage.sort((a, b) => a.order - b.order).map(l => <option key={l._id} value={l._id}>{l.name} · {l.durationDays || 300}d</option>)}
        </select>

        {levelId && (
          <button onClick={() => setShowWordBank(true)} className='px-4 py-2.5 rounded-xl border border-hairline text-sm text-accent font-medium'>
            📚 Word bank
          </button>
        )}
      </div>

      {/* day grid */}
      {levelId && (
        <div className='grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-2 mb-8'>
          {Array.from({ length: durationDays }, (_, i) => i + 1).map(d => {
            const s = summary[d] || {}
            const anything = s.vocab || s.grammar || s.reading
            return (
              <button key={d} onClick={() => openDay(d)}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-1.5 text-sm
                  ${day === d ? 'border-accent bg-accent-soft' : anything ? 'border-accent/40 bg-bg-elevated' : 'border-hairline bg-bg-elevated'}`}>
                <span className='text-ink font-medium'>Day {d}</span>
                <span className='flex gap-1'>{dot(s.vocab)}{dot(s.grammar)}{dot(s.reading)}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* selected day tasks */}
      {day && (
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-5'>
          <p className='font-display text-lg text-ink mb-1'>Day {day}</p>
          {loadingDay ? <p className='text-muted text-sm'>Loading…</p> : (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 mt-3'>
              <TaskCard title='Vocabulary' desc='10 words + photos, translations. 30 test questions auto-generated.'
                status={dayContent?.vocabCount ? `${dayContent.vocabCount} words` : 'empty'}
                filled={!!dayContent?.vocabCount} onEdit={() => setEditor('vocab')} />
              <TaskCard title='Grammar' desc='5 exercises.'
                status={dayContent?.grammar?.length ? `${dayContent.grammar.length} exercises` : 'empty'}
                filled={!!dayContent?.grammar?.length} onEdit={() => setEditor('grammar')} />
              <TaskCard title='Reading' desc='1 text + 10 exercises.'
                status={dayContent?.reading ? 'set' : 'empty'}
                filled={!!dayContent?.reading} onEdit={() => setEditor('reading')} />
            </div>
          )}
        </div>
      )}

      {editor === 'vocab' && (
        <Modal wide title={`Day ${day} · Vocabulary`} onClose={() => setEditor(null)}>
          <VocabEditor languageId={languageId} levelId={levelId} day={day} initial={dayContent?.vocab}
            onClose={() => setEditor(null)} onSaved={refreshAfterSave} />
        </Modal>
      )}
      {editor === 'grammar' && (
        <Modal wide title={`Day ${day} · Grammar`} onClose={() => setEditor(null)}>
          <GrammarEditor languageId={languageId} levelId={levelId} day={day} initial={dayContent?.grammar}
            onClose={() => setEditor(null)} onSaved={refreshAfterSave} />
        </Modal>
      )}
      {editor === 'reading' && (
        <Modal wide title={`Day ${day} · Reading`} onClose={() => setEditor(null)}>
          <ReadingEditor languageId={languageId} levelId={levelId} day={day} initial={dayContent?.reading}
            onClose={() => setEditor(null)} onSaved={refreshAfterSave} />
        </Modal>
      )}

      {showWordBank && (
        <Modal wide title='Word bank' onClose={() => setShowWordBank(false)}>
          <WordBankModal languageId={languageId} levelId={levelId} levelName={selectedLevel?.name || ''}
            onClose={() => setShowWordBank(false)} onFilled={refreshAfterSave} />
        </Modal>
      )}
    </div>
  )
}

const TaskCard = ({ title, desc, status, filled, onEdit }) => (
  <div className='border border-hairline rounded-xl p-4 flex flex-col'>
    <div className='flex justify-between items-center mb-1'>
      <p className='text-ink font-medium'>{title}</p>
      <span className={`text-[11px] px-2 py-0.5 rounded-full ${filled ? 'bg-accent-soft text-accent' : 'bg-bg text-muted'}`}>{status}</span>
    </div>
    <p className='text-muted text-xs flex-1'>{desc}</p>
    <button onClick={onEdit} className='mt-3 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium'>
      {filled ? 'Edit' : 'Add'}
    </button>
  </div>
)

export default Homework
