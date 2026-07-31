// Sunday's homework isn't new content - it's a recap of whatever this group already covered in
// its last few real lessons. Shared by studentController (the real thing, submittable) and
// teacherController (read-only preview of the same pool) so both draw from identical logic.
import VocabExercise from "../models/VocabExercise.js"
import GrammarExercise from "../models/GrammarExercise.js"

const REVIEW_VOCAB_COUNT = 5
const REVIEW_GRAMMAR_COUNT = 3
const REVIEW_LOOKBACK_LESSONS = 3

const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v)

// picks a random handful of vocab/grammar exercises from the most recent already-covered lesson
// days (up to the last REVIEW_LOOKBACK_LESSONS) - a fresh random draw every time this is called,
// same technique the exam's own question-pool assembly already uses. Returns raw (unenriched,
// unpopulated) VocabExercise/GrammarExercise docs - callers do their own populate/word-enrichment,
// matching how every other homework-content read in this codebase already works.
export const pickReviewExercises = async (group, currentLessonDay) => {
    const fromDay = Math.max(1, currentLessonDay - (REVIEW_LOOKBACK_LESSONS - 1))
    const recentDays = []
    for (let d = fromDay; d <= currentLessonDay; d++) recentDays.push(d)

    const vocabPool = await VocabExercise.find({ languageId: group.languageId, levelId: group.levelId, day: { $in: recentDays } })
        .populate('conceptId').populate('options').populate('correct')
    const grammarPool = await GrammarExercise.find({ languageId: group.languageId, levelId: group.levelId, day: { $in: recentDays } })

    return {
        vocab: shuffle(vocabPool).slice(0, REVIEW_VOCAB_COUNT),
        grammar: shuffle(grammarPool).slice(0, REVIEW_GRAMMAR_COUNT),
    }
}
