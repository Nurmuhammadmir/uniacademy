import React, { useContext, useEffect, useState } from 'react'
import { DirectorContext } from '../context/DirectorContext.jsx'
import Modal from '../components/Modal.jsx'
import VocabEditor from '../components/VocabEditor.jsx'
import GrammarEditor from '../components/GrammarEditor.jsx'
import ReadingEditor from '../components/ReadingEditor.jsx'
import WordBankModal from '../components/WordBankModal.jsx'
import GrammarBankModal from '../components/GrammarBankModal.jsx'
import ReadingBankModal from '../components/ReadingBankModal.jsx'
import ExamBankModal from '../components/ExamBankModal.jsx'

// The director builds the fixed daily programme students see: pick a course (language) -> a level ->
// a day, then author the day's Vocab / Grammar / Reading. Content is stored per (language, level, day)
// and shown in the student app exactly as built here.
const Homework = () => {
  const {
    languages, getLanguages, levels, getLevels, getContentSummary, getDayContent,
    getExamConfig, saveExamConfig, clearExamQuestions,
  } = useContext(DirectorContext)

  const [languageId, setLanguageId] = useState('')
  const [levelId, setLevelId] = useState('')
  const [summary, setSummary] = useState({})
  const [day, setDay] = useState(null)
  const [dayContent, setDayContent] = useState(null)
  const [loadingDay, setLoadingDay] = useState(false)
  const [editor, setEditor] = useState(null) // 'vocab' | 'grammar' | 'reading'
  const [showWordBank, setShowWordBank] = useState(false)
  const [showGrammarBank, setShowGrammarBank] = useState(false)
  const [showReadingBank, setShowReadingBank] = useState(false)
  const [showExamBank, setShowExamBank] = useState(false)
  const [examConfig, setExamConfig] = useState(null)
  const [examForm, setExamForm] = useState({ questionCount: 100, durationMinutes: 60, passScore: 70 })
  const [savingExam, setSavingExam] = useState(false)

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

  const loadExamConfig = async (lang, lvl) => {
    if (!lang || !lvl) return
    const exam = await getExamConfig(lang, lvl)
    setExamConfig(exam)
    if (exam) setExamForm({ questionCount: exam.questionCount, durationMinutes: exam.durationMinutes, passScore: exam.passScore })
  }

  const onSelectLevel = async (id) => {
    setLevelId(id); setDay(null); setDayContent(null)
    await Promise.all([loadSummary(languageId, id), loadExamConfig(languageId, id)])
  }

  const submitExamForm = async (e) => {
    e.preventDefault()
    setSavingExam(true)
    const exam = await saveExamConfig({ languageId, levelId, ...examForm })
    setSavingExam(false)
    if (exam) setExamConfig(prev => ({ ...prev, ...exam }))
  }

  const onClearExamBank = async () => {
    const ok = await clearExamQuestions(languageId, levelId)
    if (ok) await loadExamConfig(languageId, levelId)
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
          <>
            <button onClick={() => setShowWordBank(true)} className='px-4 py-2.5 rounded-xl border border-hairline text-sm text-accent font-medium'>
              📚 Word bank
            </button>
            <button onClick={() => setShowGrammarBank(true)} className='px-4 py-2.5 rounded-xl border border-hairline text-sm text-accent font-medium'>
              ✏️ Grammar bank
            </button>
            <button onClick={() => setShowReadingBank(true)} className='px-4 py-2.5 rounded-xl border border-hairline text-sm text-accent font-medium'>
              📖 Reading bank
            </button>
          </>
        )}
      </div>

      {/* exam builder - level-wide, independent of the daily curriculum */}
      {levelId && (
        <div className='bg-bg-elevated border border-hairline rounded-2xl p-5 mb-8'>
          <div className='flex justify-between items-center mb-3'>
            <p className='font-display text-lg text-ink'>Level exam</p>
            <span className='text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent'>
              {examConfig?.questions?.length || 0} question{(examConfig?.questions?.length || 0) === 1 ? '' : 's'} in bank
            </span>
          </div>
          <form onSubmit={submitExamForm} className='flex flex-wrap items-end gap-3 mb-4'>
            <div>
              <label className='block text-xs text-muted mb-1'>Questions per attempt</label>
              <input type='number' min='1' value={examForm.questionCount}
                onChange={e => setExamForm({ ...examForm, questionCount: Number(e.target.value) })}
                className='w-32 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <label className='block text-xs text-muted mb-1'>Pass mark %</label>
              <input type='number' min='1' max='100' value={examForm.passScore}
                onChange={e => setExamForm({ ...examForm, passScore: Number(e.target.value) })}
                className='w-28 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <div>
              <label className='block text-xs text-muted mb-1'>Time limit (minutes)</label>
              <input type='number' min='1' value={examForm.durationMinutes}
                onChange={e => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
                className='w-32 px-3 py-2 rounded-lg bg-bg border border-hairline text-sm' required />
            </div>
            <button type='submit' disabled={savingExam} className='px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium disabled:opacity-50'>
              {savingExam ? 'Saving…' : 'Save settings'}
            </button>
          </form>
          <p className='text-xs text-muted mb-3'>
            Each attempt draws {examForm.questionCount} random questions from the bank below - paste in far more than that so every student sees a different set.
          </p>
          <div className='flex gap-2'>
            <button onClick={() => setShowExamBank(true)} className='px-4 py-2 rounded-lg border border-hairline text-sm text-accent font-medium'>
              🎓 Add exam questions
            </button>
            {(examConfig?.questions?.length || 0) > 0 && (
              <button onClick={onClearExamBank} className='px-4 py-2 rounded-lg border border-hairline text-sm text-red-500 font-medium'>
                Clear bank
              </button>
            )}
          </div>
        </div>
      )}

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

      {showGrammarBank && (
        <Modal wide title='Grammar bank' onClose={() => setShowGrammarBank(false)}>
          <GrammarBankModal languageId={languageId} levelId={levelId} levelName={selectedLevel?.name || ''}
            onClose={() => setShowGrammarBank(false)} onFilled={refreshAfterSave} />
        </Modal>
      )}

      {showReadingBank && (
        <Modal wide title='Reading bank' onClose={() => setShowReadingBank(false)}>
          <ReadingBankModal languageId={languageId} levelId={levelId} levelName={selectedLevel?.name || ''}
            onClose={() => setShowReadingBank(false)} onFilled={refreshAfterSave} />
        </Modal>
      )}

      {showExamBank && (
        <Modal wide title='Exam questions' onClose={() => setShowExamBank(false)}>
          <ExamBankModal languageId={languageId} levelId={levelId} levelName={selectedLevel?.name || ''}
            onClose={() => setShowExamBank(false)} onAdded={() => loadExamConfig(languageId, levelId)} />
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
