import React, { useContext, useEffect, useState } from 'react'
import { TeacherContext } from '../context/TeacherContext.jsx'
import { resolveImageUrl } from '../lib/format.js'

// same idea as the student app's buildVocabPrompt - a VocabExercise only stores
// {type, conceptId, options, correct}; what's actually SHOWN depends on the type: picture_match
// shows the concept's picture, translation_match shows all 3 native translations at once,
// fill_gap shows the example sentence with the word blanked out.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// a small table of common irregular English verbs - the fill_gap blank only forms if the exact
// text appears somewhere in the example sentence, but a word bank almost always stores the base/
// dictionary form ("catch") while a natural example sentence uses an inflected form ("caught").
const IRREGULAR = {
  catch: ['caught'], break: ['broke', 'broken'], shake: ['shook', 'shaken'],
  steal: ['stole', 'stolen'], run: ['ran'], spend: ['spent'], have: ['has', 'had'],
  go: ['went', 'gone', 'goes'], come: ['came'], take: ['took', 'taken'], give: ['gave', 'given'],
  see: ['saw', 'seen'], get: ['got', 'gotten'], make: ['made'], know: ['knew', 'known'],
  think: ['thought'], say: ['said'], do: ['did', 'done', 'does'], find: ['found'], tell: ['told'],
  become: ['became'], leave: ['left'], feel: ['felt'], bring: ['brought'], begin: ['began', 'begun'],
  keep: ['kept'], hold: ['held'], write: ['wrote', 'written'], stand: ['stood'], hear: ['heard'],
  let: ['let'], mean: ['meant'], set: ['set'], meet: ['met'], pay: ['paid'], sit: ['sat'],
  speak: ['spoke', 'spoken'], lie: ['lay', 'lain'], lead: ['led'], read: ['read'], grow: ['grew', 'grown'],
  lose: ['lost'], fall: ['fell', 'fallen'], send: ['sent'], build: ['built'], understand: ['understood'],
  draw: ['drew', 'drawn'], wear: ['wore', 'worn'], choose: ['chose', 'chosen'],
  drive: ['drove', 'driven'], eat: ['ate', 'eaten'], fly: ['flew', 'flown'], forgive: ['forgave', 'forgiven'],
  sell: ['sold'], teach: ['taught'], sing: ['sang', 'sung'], win: ['won'], swim: ['swam', 'swum'],
  ring: ['rang', 'rung'], throw: ['threw', 'thrown'], hide: ['hid', 'hidden'], drink: ['drank', 'drunk'],
  fight: ['fought'], hang: ['hung'], shoot: ['shot'], bite: ['bit', 'bitten'], forget: ['forgot', 'forgotten'],
  freeze: ['froze', 'frozen'], sleep: ['slept'], sweep: ['swept'], deal: ['dealt'], feed: ['fed'],
  bleed: ['bled'], breed: ['bred'], burn: ['burnt'], learn: ['learnt'], spell: ['spelt'],
  spoil: ['spoilt'], dream: ['dreamt'], smell: ['smelt'], lend: ['lent'], bend: ['bent'],
  spread: ['spread'], cut: ['cut'], hit: ['hit'], hurt: ['hurt'], put: ['put'], cost: ['cost'],
  shut: ['shut'], quit: ['quit'], burst: ['burst'], rise: ['rose', 'risen'], ride: ['rode', 'ridden'],
  arise: ['arose', 'arisen'], stick: ['stuck'], strike: ['struck'], swing: ['swung'], dig: ['dug'],
  seek: ['sought'], sink: ['sank', 'sunk'], stink: ['stank', 'stunk'], weep: ['wept'],
  buy: ['bought'], fit: ['fit'],
}

// common prefixes on an irregular base still inflect irregularly - "rebuild" -> "rebuilt",
// "overtake" -> "overtook", not "rebuilded"/"overtaked"
const PREFIXES = ['re', 'un', 'over', 'under', 'out', 'mis', 'up']
const irregularFormsFor = (lower) => {
  if (IRREGULAR[lower]) return IRREGULAR[lower]
  for (const prefix of PREFIXES) {
    if (lower.startsWith(prefix) && IRREGULAR[lower.slice(prefix.length)]) {
      return IRREGULAR[lower.slice(prefix.length)].map(f => prefix + f)
    }
  }
  return null
}

// builds every plausible inflected form of a word bank entry, tried in order until one is
// literally found in the example - only the FIRST token of a multi-word phrase gets inflected
// ("look after" also tries "looks after"), and each side of a slash-alternate ("have/has") is
// tried independently.
const inflectionCandidates = (word) => {
  const parts = word.split(' ')
  const first = parts[0]
  const restSuffix = parts.length > 1 ? ' ' + parts.slice(1).join(' ') : ''
  const candidates = [word]

  const forToken = (token) => {
    const out = [token]
    const lower = token.toLowerCase()
    const irregularForms = irregularFormsFor(lower)
    if (irregularForms) out.push(...irregularForms)
    out.push(token + 's')
    if (/(s|sh|ch|x|z|o)$/i.test(token)) out.push(token + 'es')
    if (/[^aeiou]y$/i.test(token)) out.push(token.slice(0, -1) + 'ies', token.slice(0, -1) + 'ied')
    if (/e$/i.test(token)) {
      out.push(token + 'd', token.slice(0, -1) + 'ing')
    } else {
      out.push(token + 'ed', token + 'ing')
      if (/[^aeiou][aeiou][bcdfgklmnprstv]$/i.test(token)) {
        const doubled = token + token.slice(-1)
        out.push(doubled + 'ed', doubled + 'ing')
      }
      if (/[^aeiou]l$/i.test(token)) out.push(token + 'led', token + 'ling')
    }
    return out
  }

  first.split('/').forEach(tok => forToken(tok).forEach(v => candidates.push(v + restSuffix)))
  return [...new Set(candidates)]
}

const blankOutWord = (example, word) => {
  for (const candidate of inflectionCandidates(word)) {
    const re = new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i')
    if (re.test(example)) return example.replace(re, '____')
  }
  return example
}

const buildVocabPrompt = (ex) => {
  const c = ex.conceptId || {}
  if (ex.type === 'picture_match') return { image: c.image || null, question: 'Which word matches this picture?' }
  if (ex.type === 'translation_match') {
    const parts = [c.translations?.ru, c.translations?.uz, c.translations?.kaa].filter(Boolean)
    return { image: null, question: parts.length ? `Translate: ${parts.join(' / ')}` : 'Translate this word' }
  }
  if (c.example && c.word) {
    return { image: null, question: blankOutWord(c.example, c.word) }
  }
  return { image: null, question: c.example || 'Fill in the blank' }
}

// one question, rendered the same way regardless of type (true/false buttons, multiple-choice
// buttons, or a free-text answer shown directly) - the correct option is highlighted green right
// away, no tapping needed to reveal it, since this is a preview for the teacher's own benefit
// (see what her students will be asked), not something she's being tested on. Nothing here is
// ever submitted, scored, or saved anywhere - buttons are inert, purely visual.
const PreviewCard = ({ index, question, image, options, type, correctValue, backendUrl }) => {
  const isTrueFalse = type === 'true_false'
  const hasOptions = Array.isArray(options) && options.length > 0
  const isCorrectValue = (value) => String(value) === String(correctValue)

  return (
    <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-3'>
      <p className='text-xs font-mono text-muted mb-2'>Question {index + 1}</p>
      {image && <img src={resolveImageUrl(image, backendUrl)} alt='' className='w-full aspect-square object-cover rounded-xl mb-3' />}
      <p className='text-ink font-medium mb-2'>{question}</p>

      {isTrueFalse ? (
        <div className='grid grid-cols-2 gap-2'>
          {['true', 'false'].map(v => (
            <div key={v} className={`rounded-xl border px-4 py-3 capitalize ${isCorrectValue(v) ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-hairline bg-bg-elevated text-ink'}`}>
              {v}
            </div>
          ))}
        </div>
      ) : hasOptions ? (
        <div className='flex flex-col gap-2'>
          {options.map((option, i) => {
            const optionValue = typeof option === 'object' ? option._id : option
            const label = typeof option === 'object' ? (option.word || option.text || '') : option
            return (
              <div key={i} className={`rounded-xl border text-left px-4 py-3 ${isCorrectValue(optionValue) ? 'border-accent bg-accent-soft text-accent font-medium' : 'border-hairline bg-bg-elevated text-ink'}`}>
                {label}
              </div>
            )
          })}
        </div>
      ) : (
        <p className='text-accent text-sm font-medium'>Correct answer: {typeof correctValue === 'object' ? correctValue?.word : String(correctValue ?? '—')}</p>
      )}
    </div>
  )
}

const TABS = [
  ['vocab', '🔤 Vocab'],
  ['grammar', '✏️ Grammar'],
  ['reading', '📖 Reading'],
]

// lets a teacher see (and try) the exact real homework her students get today for this group -
// purely a preview: nothing tapped here is ever submitted, scored, or saved as progress anywhere
const HomeworkPreviewModal = ({ groupId, initialSection, hasReading, onClose }) => {
  const { getTodayHomework, backendUrl } = useContext(TeacherContext)
  const [data, setData] = useState(false)
  const [tab, setTab] = useState(initialSection || 'vocab')

  useEffect(() => { getTodayHomework(groupId).then(setData) }, [groupId])

  const exercises = !data ? [] : tab === 'vocab' ? data.vocab : tab === 'grammar' ? data.grammar : data.readingExercises

  return (
    <div className='fixed inset-0 bg-bg z-50 flex justify-center'>
      <div className='w-full max-w-md flex flex-col h-full'>
        <div className='flex items-center justify-between px-5 pt-6 pb-4 border-b border-hairline'>
          <button onClick={onClose} className='text-muted text-sm'>Close</button>
          <p className='font-display text-ink'>
            {data?.reviewDay ? "Today's homework · review day" : `Today's homework${data ? ` · day ${data.dayCounter}/${data.durationDays}` : ''}`}
          </p>
          <span className='w-10' />
        </div>

        <div className='flex gap-2 px-5 py-3 border-b border-hairline'>
          {TABS.filter(([key]) => key !== 'reading' || (hasReading !== false && !data?.reviewDay)).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === key ? 'bg-accent text-white' : 'bg-bg-card border border-hairline text-muted'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {!data ? (
            <p className='text-muted'>Loading…</p>
          ) : (
            <>
              {tab === 'reading' && data.readingText && (
                <div className='bg-bg-card border border-hairline rounded-2xl p-4 mb-4'>
                  {data.readingText.image && (
                    <img src={resolveImageUrl(data.readingText.image, backendUrl)} alt={data.readingText.title} className='w-full h-32 object-contain bg-bg rounded-xl mb-3' />
                  )}
                  <p className='font-display text-lg text-ink mb-2'>{data.readingText.title}</p>
                  {data.readingText.paragraphs?.map(p => (
                    <p key={p.id} className='text-ink text-sm mb-2 leading-relaxed'>{p.text}</p>
                  ))}
                </div>
              )}

              {exercises.map((ex, i) => {
                const vocabPrompt = tab === 'vocab' ? buildVocabPrompt(ex) : null
                const correctValue = tab === 'vocab' ? ex.correct?._id : ex.correct
                return (
                  <PreviewCard
                    key={ex._id}
                    index={i}
                    question={vocabPrompt ? vocabPrompt.question : (ex.question || 'Match the correct answer')}
                    image={vocabPrompt?.image}
                    options={ex.options}
                    type={ex.type}
                    correctValue={correctValue}
                    backendUrl={backendUrl}
                  />
                )
              })}
              {exercises.length === 0 && (tab !== 'reading' || !data.readingText) && (
                <p className='text-muted text-sm'>Nothing here yet for today.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomeworkPreviewModal
