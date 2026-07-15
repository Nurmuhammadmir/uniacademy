// Homework-builder backend. The director builds the fixed daily programme here:
// per (languageId, levelId, day) they author 10 vocab words, 5 grammar exercises and 1 reading
// text with 10 exercises. Everything is idempotent - re-saving a day fully replaces that day's
// content (upsert by {languageId, levelId, day}), so the builder is safe to re-open and re-save.
//
// The 30 vocab test questions are NOT authored by hand: saveVocab generates them from the 10 words
// (10 picture->word + 10 native->word + 10 word->native, distractors drawn only from the same 10),
// exactly the rule in the content spec.
import Concept from "../models/Concept.js"
import WordForm from "../models/WordForm.js"
import Translation from "../models/Translation.js"
import Curriculum from "../models/Curriculum.js"
import VocabExercise from "../models/VocabExercise.js"
import GrammarExercise from "../models/GrammarExercise.js"
import ReadingText from "../models/ReadingText.js"
import ReadingExercise from "../models/ReadingExercise.js"
import Language from "../models/Language.js"

const NATIVE_CODES = ['ru', 'uz', 'kaa']

// pick `count` distinct random items from `pool` excluding `exclude`
const pickDistractors = (pool, exclude, count) => {
    const candidates = pool.filter(c => String(c._id) !== String(exclude._id))
    // Fisher-Yates on a copy, take the first `count`
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    return candidates.slice(0, count)
}

const shuffle = (arr) => {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

// ==== read one day's content for the builder ====
export const getDayContent = async (req, res) => {
    try {
        const { languageId, levelId } = req.query
        const day = Number(req.query.day)
        if (!languageId || !levelId || !Number.isInteger(day)) {
            return res.status(400).json({ error: 'missing_params' })
        }

        const curriculum = await Curriculum.findOne({ languageId, levelId, day }).populate('conceptIds')
        const concepts = curriculum?.conceptIds || []
        const wordForms = await WordForm.find({ conceptId: { $in: concepts.map(c => c._id) }, languageId })
        const translations = await Translation.find({ conceptId: { $in: concepts.map(c => c._id) } })

        // shape vocab back into the builder's row format
        const vocab = concepts.map(concept => {
            const wf = wordForms.find(w => String(w.conceptId) === String(concept._id))
            const tr = translations.filter(t => String(t.conceptId) === String(concept._id))
            return {
                word: wf?.word || '',
                example: wf?.example || '',
                image: concept.image || '',
                translations: {
                    ru: tr.find(t => t.nativeLanguageCode === 'ru')?.text || '',
                    uz: tr.find(t => t.nativeLanguageCode === 'uz')?.text || '',
                    kaa: tr.find(t => t.nativeLanguageCode === 'kaa')?.text || '',
                },
            }
        })

        const grammar = await GrammarExercise.find({ languageId, levelId, day }).sort({ createdAt: 1 })
        const readingText = await ReadingText.findOne({ languageId, levelId, day })
        const readingExercises = readingText
            ? await ReadingExercise.find({ readingTextId: readingText._id }).sort({ createdAt: 1 })
            : []

        res.json({
            day,
            vocab,
            vocabCount: concepts.length,
            grammar,
            reading: readingText ? { title: readingText.title, image: readingText.image, paragraphs: readingText.paragraphs, exercises: readingExercises } : null,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== save the 10 vocab words for a day (+ auto-generate the 30 test questions) ====
export const saveVocab = async (req, res) => {
    try {
        const { languageId, levelId, day, words } = req.body
        if (!languageId || !levelId || !day || !Array.isArray(words)) {
            return res.status(400).json({ error: 'missing_params' })
        }

        // wipe this day's existing vocab content so a re-save is a clean replace, not a duplicate
        const existing = await Curriculum.findOne({ languageId, levelId, day })
        if (existing) {
            const oldConceptIds = existing.conceptIds
            await WordForm.deleteMany({ conceptId: { $in: oldConceptIds } })
            await Translation.deleteMany({ conceptId: { $in: oldConceptIds } })
            await Concept.deleteMany({ _id: { $in: oldConceptIds } })
            await Curriculum.deleteOne({ _id: existing._id })
        }
        await VocabExercise.deleteMany({ languageId, levelId, day })

        // create the concepts + word forms + translations
        const concepts = []
        for (const w of words) {
            if (!w.word || !w.word.trim()) continue
            const concept = await Concept.create({
                image: w.image || '',
                category: `day-${day}`,
            })
            await WordForm.create({
                conceptId: concept._id,
                languageId,
                word: w.word.trim(),
                example: w.example || '',
            })
            for (const code of NATIVE_CODES) {
                const text = w.translations?.[code]
                if (text && text.trim()) {
                    await Translation.create({ conceptId: concept._id, nativeLanguageCode: code, text: text.trim() })
                }
            }
            concepts.push(concept)
        }

        if (concepts.length === 0) {
            return res.status(400).json({ error: 'no_words' })
        }

        await Curriculum.create({ languageId, levelId, day, conceptIds: concepts.map(c => c._id) })

        // auto-generate the vocab test: for each concept, one question of each of the 3 types,
        // each with the concept as the correct answer and 3 distractors drawn from the same day
        const exercises = []
        for (const concept of concepts) {
            const distractors = pickDistractors(concepts, concept, 3)
            const options = shuffle([concept, ...distractors]).map(c => c._id)
            for (const type of ['picture_match', 'translation_match', 'fill_gap']) {
                exercises.push({
                    languageId, levelId, day, type,
                    conceptId: concept._id,
                    options,
                    correct: concept._id,
                })
            }
        }
        await VocabExercise.insertMany(exercises)

        res.json({ saved: true, wordCount: concepts.length, exerciseCount: exercises.length })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== save the 5 grammar exercises for a day ====
export const saveGrammar = async (req, res) => {
    try {
        const { languageId, levelId, day, exercises } = req.body
        if (!languageId || !levelId || !day || !Array.isArray(exercises)) {
            return res.status(400).json({ error: 'missing_params' })
        }

        await GrammarExercise.deleteMany({ languageId, levelId, day })

        const docs = exercises
            .filter(e => e.question && e.question.trim() && e.correct !== undefined && String(e.correct).trim() !== '')
            .map(e => ({
                languageId, levelId, day,
                type: e.type,
                question: e.question.trim(),
                options: Array.isArray(e.options) ? e.options.filter(o => String(o).trim() !== '') : [],
                correct: String(e.correct),
            }))
        if (docs.length) await GrammarExercise.insertMany(docs)

        res.json({ saved: true, exerciseCount: docs.length })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== save the reading text (+ its 10 exercises) for a day ====
export const saveReading = async (req, res) => {
    try {
        const { languageId, levelId, day, title, image, paragraphs, exercises } = req.body
        if (!languageId || !levelId || !day) {
            return res.status(400).json({ error: 'missing_params' })
        }

        // remove the day's existing reading text and its exercises before re-creating
        const old = await ReadingText.findOne({ languageId, levelId, day })
        if (old) {
            await ReadingExercise.deleteMany({ readingTextId: old._id })
            await ReadingText.deleteOne({ _id: old._id })
        }

        if (!title || !title.trim()) {
            return res.json({ saved: true, cleared: true })
        }

        const readingText = await ReadingText.create({
            languageId, levelId, day,
            title: title.trim(),
            image: image || '',
            paragraphs: Array.isArray(paragraphs) ? paragraphs.filter(p => p.id && p.text && p.text.trim()) : [],
        })

        const docs = (Array.isArray(exercises) ? exercises : [])
            .filter(e => e.question !== undefined || e.items !== undefined)
            .map(e => ({
                readingTextId: readingText._id,
                type: e.type,
                paragraphRef: e.paragraphRef || '',
                question: e.question || '',
                options: e.options !== undefined ? e.options : (e.items !== undefined ? e.items : []),
                correct: e.correct !== undefined ? e.correct : (e.correctOrder !== undefined ? e.correctOrder : ''),
            }))
        if (docs.length) await ReadingExercise.insertMany(docs)

        res.json({ saved: true, exerciseCount: docs.length })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== overview: which days already have content, per level ====
export const getLevelContentSummary = async (req, res) => {
    try {
        const { languageId, levelId } = req.query
        if (!languageId || !levelId) return res.status(400).json({ error: 'missing_params' })

        const curricula = await Curriculum.find({ languageId, levelId }).select('day conceptIds')
        const grammar = await GrammarExercise.find({ languageId, levelId }).select('day')
        const reading = await ReadingText.find({ languageId, levelId }).select('day')

        const vocabDays = Object.fromEntries(curricula.map(c => [c.day, c.conceptIds.length]))
        const grammarDays = new Set(grammar.map(g => g.day))
        const readingDays = new Set(reading.map(r => r.day))

        // all days that have any content
        const allDays = new Set([...curricula.map(c => c.day), ...grammarDays, ...readingDays])
        const summary = {}
        for (const day of allDays) {
            summary[day] = {
                vocab: (vocabDays[day] || 0) > 0,
                vocabCount: vocabDays[day] || 0,
                grammar: grammarDays.has(day),
                reading: readingDays.has(day),
            }
        }
        res.json({ summary })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
