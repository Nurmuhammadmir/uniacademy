// shared between ExerciseModal (daily homework) and Exam - a VocabExercise only stores
// {type, conceptId, options, correct}; the actual question ("what do you show the student")
// depends on the type: picture_match shows the concept's picture, translation_match shows all 3
// native translations at once (not just Russian - the student body isn't only Russian speakers),
// fill_gap shows its example sentence with the word blanked out. The options are always the same
// (words) - only what's being asked differs.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// a small table of common irregular English verbs - the fill_gap blank only forms if the exact
// text appears somewhere in the example sentence, but a word bank almost always stores the base/
// dictionary form ("catch") while a natural example sentence uses an inflected form ("caught").
// Covers the base forms a general vocab course is likely to use; base -> extra forms to also try.
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
// literally found in the example - the literal word itself is tried first (so already-correct
// entries are untouched), then irregular forms, then regular plural/3rd-person-s, -ed, -ing
// (handling e-drop, y->ied/ies, CVC consonant doubling, British double-L). Only the FIRST token
// of a multi-word phrase ("look after") gets inflected, the rest stays literal, and each side of a
// slash-alternate ("have/has") is tried independently.
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

// tries every inflected candidate against the example, returns the blanked sentence for the first
// one actually found - falls back to the untouched example if truly nothing matches (a genuine
// content mismatch between the word and its example, e.g. a missing possessive: "change mind" vs
// "she changed HER mind" - rare, and no worse than the old always-literal behavior)
const blankOutWord = (example, word) => {
  for (const candidate of inflectionCandidates(word)) {
    const re = new RegExp(`\\b${escapeRegExp(candidate)}\\b`, 'i')
    if (re.test(example)) return example.replace(re, '____')
  }
  return example
}

export const buildVocabPrompt = (ex, t) => {
  const c = ex.conceptId || {}
  if (ex.type === 'picture_match') {
    return { image: c.image || null, question: t('whichWordMatches') }
  }
  if (ex.type === 'translation_match') {
    const parts = [c.translations?.ru, c.translations?.uz, c.translations?.kaa].filter(Boolean)
    return { image: null, question: parts.length ? `${t('translateWord')}: ${parts.join(' / ')}` : t('translateWord') }
  }
  // fill_gap
  if (c.example && c.word) {
    return { image: null, question: blankOutWord(c.example, c.word) }
  }
  return { image: null, question: c.example || t('fillInBlank') }
}
