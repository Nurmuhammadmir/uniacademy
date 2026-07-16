// shared between ExerciseModal (daily homework) and Exam - a VocabExercise only stores
// {type, conceptId, options, correct}; the actual question ("what do you show the student")
// depends on the type: picture_match shows the concept's picture, translation_match shows all 3
// native translations at once (not just Russian - the student body isn't only Russian speakers),
// fill_gap shows its example sentence with the word blanked out. The options are always the same
// (words) - only what's being asked differs.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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
    const blanked = c.example.replace(new RegExp(`\\b${escapeRegExp(c.word)}\\b`, 'i'), '____')
    return { image: null, question: blanked }
  }
  return { image: null, question: c.example || t('fillInBlank') }
}
