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
import Level from "../models/Level.js"
import { findImageByName, findImageByFilename } from "./uploadController.js"

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

// bulk-paste banks (word bank / grammar bank) can be huge, and duplicates - a word or question
// that's already sitting on some other day in this same level - shouldn't stop the whole paste or
// silently vanish. This filters them out and reports each one back to the director instead, so a
// batch of hundreds keeps going and nothing gets lost without a trace.
// `existingByKey` is Map<normalizedKey, day> for everything already saved in this level;
// `extract(item)` returns { key, raw } - key is the normalized identity used to compare, raw is
// the original text shown back in the skip notice.
const dedupeAgainstExisting = (items, existingByKey, extract) => {
    const seen = new Map(existingByKey)
    const unique = []
    const skipped = []
    for (const item of items) {
        const { key, raw } = extract(item)
        if (!key) continue
        if (seen.has(key)) {
            const where = seen.get(key)
            skipped.push({ text: raw, reason: where === 'this paste' ? 'duplicate within the pasted list' : `already exists on day ${where}` })
            continue
        }
        seen.set(key, 'this paste')
        unique.push(item)
    }
    return { unique, skipped }
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
            reading: readingText ? { title: readingText.title, image: readingText.image, imageHint: readingText.imageHint, paragraphs: readingText.paragraphs, exercises: readingExercises } : null,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// creates one day's vocab content from a list of {word, example, translations, image?} - shared by
// saveVocab (one day, from the builder form/JSON paste) and fillVocabWordBank (many days at once,
// from a bulk word-bank paste). Fully replaces whatever vocab content already exists for that day.
// If a word has no `image` already resolved, this rechecks server/public/images/vocab by word name
// itself - so a word-bank fill picks up photos the director drops into that folder with no extra
// step, and a normal single-day save gets the same safety net if the frontend's own check missed it.
const createVocabDay = async ({ languageId, levelId, day, words }) => {
    const existing = await Curriculum.findOne({ languageId, levelId, day })
    if (existing) {
        const oldConceptIds = existing.conceptIds
        await WordForm.deleteMany({ conceptId: { $in: oldConceptIds } })
        await Translation.deleteMany({ conceptId: { $in: oldConceptIds } })
        await Concept.deleteMany({ _id: { $in: oldConceptIds } })
        await Curriculum.deleteOne({ _id: existing._id })
    }
    await VocabExercise.deleteMany({ languageId, levelId, day })

    const concepts = []
    for (const w of words) {
        if (!w.word || !w.word.trim()) continue
        const concept = await Concept.create({
            image: w.image || findImageByName('vocab', w.word) || '',
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

    if (concepts.length === 0) return { conceptCount: 0, exerciseCount: 0 }

    await Curriculum.create({ languageId, levelId, day, conceptIds: concepts.map(c => c._id) })

    // auto-generate the vocab test: for each concept, one question of each of the 3 types, each
    // with the concept as the correct answer and 3 distractors drawn from the same day
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

    return { conceptCount: concepts.length, exerciseCount: exercises.length }
}

// ==== save the 10 vocab words for a day (+ auto-generate the 30 test questions) ====
export const saveVocab = async (req, res) => {
    try {
        const { languageId, levelId, day, words } = req.body
        if (!languageId || !levelId || !day || !Array.isArray(words)) {
            return res.status(400).json({ error: 'missing_params' })
        }

        // an empty `words` array is a deliberate clear (see VocabEditor's "Clear vocab" button) and
        // must succeed, not error - the frontend's own form already refuses to submit empty via the
        // normal Save button, so by the time this runs an empty list always means "clear this day"
        const { conceptCount, exerciseCount } = await createVocabDay({ languageId, levelId, day, words })
        res.json({ saved: true, wordCount: conceptCount, exerciseCount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== word bank: paste an unlimited list of words and auto-fill every EMPTY day in this level,
// 10 words per day, in day order, until either the words or the empty days run out. A word that's
// already used somewhere else in this level (or repeated within the same paste) is skipped and
// reported, not silently dropped or allowed to stop the rest of the batch. ====
export const fillVocabWordBank = async (req, res) => {
    try {
        const { languageId, levelId, words } = req.body
        if (!languageId || !levelId || !Array.isArray(words) || words.length === 0) {
            return res.status(400).json({ error: 'missing_params' })
        }

        const level = await Level.findById(levelId).select('durationDays')
        if (!level) return res.status(404).json({ error: 'level_not_found' })
        const durationDays = level.durationDays || 30

        const curricula = await Curriculum.find({ languageId, levelId })
        const filledDays = new Set(curricula.map(c => c.day))
        const emptyDays = []
        for (let d = 1; d <= durationDays; d++) {
            if (!filledDays.has(d)) emptyDays.push(d)
        }

        // every word already sitting on some day in this level, so the bank can skip it instead of
        // creating a second copy of the same word on a different day
        const conceptIdToDay = {}
        curricula.forEach(c => c.conceptIds.forEach(cid => { conceptIdToDay[String(cid)] = c.day }))
        const existingWordForms = await WordForm.find({ conceptId: { $in: Object.keys(conceptIdToDay) }, languageId })
        const existingByKey = new Map(existingWordForms.map(wf => [wf.word.trim().toLowerCase(), conceptIdToDay[String(wf.conceptId)]]))

        const { unique: uniqueWords, skipped } = dedupeAgainstExisting(
            words.filter(w => w.word && w.word.trim()),
            existingByKey,
            (w) => ({ key: w.word.trim().toLowerCase(), raw: w.word.trim() })
        )

        const filled = []
        let cursor = 0
        for (const day of emptyDays) {
            if (cursor >= uniqueWords.length) break
            const batch = uniqueWords.slice(cursor, cursor + 10)
            const { conceptCount } = await createVocabDay({ languageId, levelId, day, words: batch })
            if (conceptCount > 0) {
                cursor += conceptCount
                filled.push({ day, count: conceptCount })
            }
        }

        res.json({
            filled,
            daysFilled: filled.length,
            wordsUsed: cursor,
            wordsRemaining: uniqueWords.length - cursor,
            emptyDaysRemaining: Math.max(0, emptyDays.length - filled.length),
            skipped,
            skippedCount: skipped.length,
        })
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

// ==== grammar bank: paste an unlimited list of grammar exercises and auto-fill every EMPTY day in
// this level, 5 per day, in day order, until either the bank or the empty days run out. A question
// that's already used somewhere else in this level (or repeated within the same paste) is skipped
// and reported, not silently dropped or allowed to stop the rest of the batch. ====
export const fillGrammarBank = async (req, res) => {
    try {
        const { languageId, levelId, exercises } = req.body
        if (!languageId || !levelId || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'missing_params' })
        }

        const level = await Level.findById(levelId).select('durationDays')
        if (!level) return res.status(404).json({ error: 'level_not_found' })
        const durationDays = level.durationDays || 30

        const existingDocs = await GrammarExercise.find({ languageId, levelId }).select('day question')
        const filledDays = new Set(existingDocs.map(d => d.day))
        const emptyDays = []
        for (let d = 1; d <= durationDays; d++) {
            if (!filledDays.has(d)) emptyDays.push(d)
        }

        const existingByKey = new Map(existingDocs.map(d => [d.question.trim().toLowerCase(), d.day]))
        const validExercises = exercises.filter(e => e.question && e.question.trim() && e.correct !== undefined && String(e.correct).trim() !== '')
        const { unique: uniqueExercises, skipped } = dedupeAgainstExisting(
            validExercises,
            existingByKey,
            (e) => ({ key: e.question.trim().toLowerCase(), raw: e.question.trim() })
        )

        const filled = []
        let cursor = 0
        for (const day of emptyDays) {
            if (cursor >= uniqueExercises.length) break
            const batch = uniqueExercises.slice(cursor, cursor + 5)
            const docs = batch.map(e => ({
                languageId, levelId, day,
                type: e.type,
                question: e.question.trim(),
                options: Array.isArray(e.options) ? e.options.filter(o => String(o).trim() !== '') : [],
                correct: String(e.correct),
            }))
            await GrammarExercise.insertMany(docs)
            cursor += docs.length
            filled.push({ day, count: docs.length })
        }

        res.json({
            filled,
            daysFilled: filled.length,
            questionsUsed: cursor,
            questionsRemaining: uniqueExercises.length - cursor,
            emptyDaysRemaining: Math.max(0, emptyDays.length - filled.length),
            skipped,
            skippedCount: skipped.length,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// a reading's `image` is a filename the director named explicitly (not derived from a word like
// vocab), so it's resolved by exact filename rather than a slugified match. Accepts either an
// already-resolved served path (from the single-day form, which resolves client-side before
// submit) or a bare filename hint (from the reading bank, which never touches the frontend) -
// only ever stores a real, existing file's path, never an unresolved filename that would 404.
const resolveReadingImage = (image) => {
    if (!image) return ''
    if (/^(\/static\/|https?:\/\/)/.test(image)) return image
    return findImageByFilename('reading', image)
}

// creates one day's reading content (1 text + up to 10 exercises) - shared by saveReading (one
// day, from the builder form/JSON paste) and fillReadingBank (many days at once, from a bulk
// reading-bank paste). Fully replaces whatever reading content already exists for that day.
const createReadingDay = async ({ languageId, levelId, day, title, image, paragraphs, exercises }) => {
    const old = await ReadingText.findOne({ languageId, levelId, day })
    if (old) {
        await ReadingExercise.deleteMany({ readingTextId: old._id })
        await ReadingText.deleteOne({ _id: old._id })
    }

    if (!title || !title.trim()) return { created: false, exerciseCount: 0 }

    // keep the raw filename hint even when the file isn't on disk yet - the director may paste the
    // JSON before dropping the actual photo onto the server, and without this the filename would be
    // lost forever with no way to recheck it once the file arrives
    const resolvedImage = resolveReadingImage(image)
    const isAlreadyAResolvedPath = image && /^(\/static\/|https?:\/\/)/.test(image)
    const readingText = await ReadingText.create({
        languageId, levelId, day,
        title: title.trim(),
        image: resolvedImage,
        imageHint: resolvedImage ? '' : (isAlreadyAResolvedPath ? '' : (image || '')),
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

    return { created: true, exerciseCount: docs.length }
}

// ==== save the reading text (+ its 10 exercises) for a day ====
export const saveReading = async (req, res) => {
    try {
        const { languageId, levelId, day, title, image, paragraphs, exercises } = req.body
        if (!languageId || !levelId || !day) {
            return res.status(400).json({ error: 'missing_params' })
        }

        const { created, exerciseCount } = await createReadingDay({ languageId, levelId, day, title, image, paragraphs, exercises })
        res.json({ saved: true, cleared: !created, exerciseCount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== reading bank: paste an unlimited list of complete readings and auto-fill every EMPTY day
// in this level, ONE reading per day (a reading is already a complete atomic day, unlike vocab
// words or grammar questions which get batched), in day order, until the bank or the empty days
// run out. A title that's already used somewhere else in this level (or repeated within the same
// paste) is skipped and reported, not silently dropped or allowed to stop the rest of the batch. ====
export const fillReadingBank = async (req, res) => {
    try {
        const { languageId, levelId, readings } = req.body
        if (!languageId || !levelId || !Array.isArray(readings) || readings.length === 0) {
            return res.status(400).json({ error: 'missing_params' })
        }

        const level = await Level.findById(levelId).select('durationDays')
        if (!level) return res.status(404).json({ error: 'level_not_found' })
        const durationDays = level.durationDays || 30

        const existingDocs = await ReadingText.find({ languageId, levelId }).select('day title')
        const filledDays = new Set(existingDocs.map(d => d.day))
        const emptyDays = []
        for (let d = 1; d <= durationDays; d++) {
            if (!filledDays.has(d)) emptyDays.push(d)
        }

        const existingByKey = new Map(existingDocs.map(d => [d.title.trim().toLowerCase(), d.day]))
        const validReadings = readings.filter(r => r.title && r.title.trim())
        const { unique: uniqueReadings, skipped } = dedupeAgainstExisting(
            validReadings,
            existingByKey,
            (r) => ({ key: r.title.trim().toLowerCase(), raw: r.title.trim() })
        )

        const filled = []
        let cursor = 0
        for (const day of emptyDays) {
            if (cursor >= uniqueReadings.length) break
            const r = uniqueReadings[cursor]
            cursor += 1
            const { created } = await createReadingDay({ languageId, levelId, day, title: r.title, image: r.image, paragraphs: r.paragraphs, exercises: r.exercises })
            if (created) filled.push({ day, title: r.title.trim() })
        }

        res.json({
            filled,
            daysFilled: filled.length,
            readingsUsed: cursor,
            readingsRemaining: uniqueReadings.length - cursor,
            emptyDaysRemaining: Math.max(0, emptyDays.length - filled.length),
            skipped,
            skippedCount: skipped.length,
        })
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
