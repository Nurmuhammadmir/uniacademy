// removes every piece of homework content (+ exam) tied to one level - used when a director deletes
// a level, or a whole language (which deletes each of its levels this way first). Pricing is NOT
// touched here - price is set per-COURSE (per-language), not per-level, so deleting a level never
// affects it. directorController.deleteLanguage cleans up the language's own Pricing row directly.
import Concept from "../models/Concept.js"
import WordForm from "../models/WordForm.js"
import Translation from "../models/Translation.js"
import Curriculum from "../models/Curriculum.js"
import VocabExercise from "../models/VocabExercise.js"
import GrammarExercise from "../models/GrammarExercise.js"
import ReadingText from "../models/ReadingText.js"
import ReadingExercise from "../models/ReadingExercise.js"
import Exam from "../models/Exam.js"

export const deleteLevelContent = async (languageId, levelId) => {
    const curricula = await Curriculum.find({ languageId, levelId })
    const conceptIds = curricula.flatMap(c => c.conceptIds)
    await WordForm.deleteMany({ conceptId: { $in: conceptIds } })
    await Translation.deleteMany({ conceptId: { $in: conceptIds } })
    await Concept.deleteMany({ _id: { $in: conceptIds } })
    await Curriculum.deleteMany({ languageId, levelId })

    await VocabExercise.deleteMany({ languageId, levelId })
    await GrammarExercise.deleteMany({ languageId, levelId })

    const readingTexts = await ReadingText.find({ languageId, levelId })
    await ReadingExercise.deleteMany({ readingTextId: { $in: readingTexts.map(r => r._id) } })
    await ReadingText.deleteMany({ languageId, levelId })

    await Exam.deleteMany({ languageId, levelId })
}

// same cleanup as deleteLevelContent, but scoped to just ONE day - used when the director shrinks
// a level via "delete last lesson" in the Homework builder (the mirror of "+ Add lesson"), so
// undoing an accidental add never leaves orphaned vocab/grammar/reading sitting on a day number
// the level no longer has. Pricing/Exam are level-wide, not per-day, so they're untouched here.
export const deleteDayContent = async (languageId, levelId, day) => {
    const curriculum = await Curriculum.findOne({ languageId, levelId, day })
    if (curriculum) {
        await WordForm.deleteMany({ conceptId: { $in: curriculum.conceptIds } })
        await Translation.deleteMany({ conceptId: { $in: curriculum.conceptIds } })
        await Concept.deleteMany({ _id: { $in: curriculum.conceptIds } })
        await Curriculum.deleteOne({ _id: curriculum._id })
    }

    await VocabExercise.deleteMany({ languageId, levelId, day })
    await GrammarExercise.deleteMany({ languageId, levelId, day })

    const readingText = await ReadingText.findOne({ languageId, levelId, day })
    if (readingText) {
        await ReadingExercise.deleteMany({ readingTextId: readingText._id })
        await ReadingText.deleteOne({ _id: readingText._id })
    }
}
