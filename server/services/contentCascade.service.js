// removes every piece of homework content (+ pricing + exam) tied to one level - used when a
// director deletes a level, or a whole language (which deletes each of its levels this way first)
import Concept from "../models/Concept.js"
import WordForm from "../models/WordForm.js"
import Translation from "../models/Translation.js"
import Curriculum from "../models/Curriculum.js"
import VocabExercise from "../models/VocabExercise.js"
import GrammarExercise from "../models/GrammarExercise.js"
import ReadingText from "../models/ReadingText.js"
import ReadingExercise from "../models/ReadingExercise.js"
import Pricing from "../models/Pricing.js"
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

    await Pricing.deleteMany({ languageId, levelId })
    await Exam.deleteMany({ languageId, levelId })
}
