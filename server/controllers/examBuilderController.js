// Director-side exam builder: quantity/pass-mark/time-limit settings, plus a level-wide question
// bank built via JSON paste (vocab/grammar/reading questions mixed freely) - mirrors the homework
// content banks. Paste as many as you like across as many pastes as you like; duplicates are
// skipped and reported, never silently dropped or allowed to stop the batch. The bank can be much
// bigger than any single exam attempt - questionCount controls how many are drawn per attempt (see
// studentController.getExam).
import Exam from "../models/Exam.js"
import Level from "../models/Level.js"
import { findImageByName, findImageByFilename } from "./uploadController.js"

const NATIVE_CODES = ['ru', 'uz', 'kaa']

const resolveQuestionImage = (q) => {
    if (q.image) {
        if (/^(\/static\/|https?:\/\/)/.test(q.image)) return q.image
        return findImageByFilename(q.section === 'vocab' ? 'vocab' : 'reading', q.image) || ''
    }
    if (q.section === 'vocab' && q.word) return findImageByName('vocab', q.word) || ''
    return ''
}

// vocab questions can be authored from a bare word (translation_match/picture_match derive their
// own prompt text and correct answer from it) or fully spelled out like grammar/reading questions
const buildQuestionDoc = (q) => {
    const doc = {
        section: q.section,
        type: q.type,
        passage: q.passage || '',
        question: q.question || '',
        image: resolveQuestionImage(q),
        options: Array.isArray(q.options) ? q.options : [],
        correct: q.correct,
    }
    if (q.section === 'vocab' && q.word) {
        if (q.type === 'translation_match' && !doc.question) {
            const parts = NATIVE_CODES.map(c => q.translations?.[c]).filter(Boolean)
            doc.question = parts.length ? `Translate: ${parts.join(' / ')}` : `Translate: ${q.word}`
        }
        if (q.type === 'picture_match' && !doc.question) doc.question = 'Which word matches this picture?'
        if (doc.correct === undefined || doc.correct === null || doc.correct === '') doc.correct = q.word
    }
    return doc
}

export const getExamConfig = async (req, res) => {
    try {
        const { languageId, levelId } = req.query
        if (!languageId || !levelId) return res.status(400).json({ error: 'missing_params' })
        const exam = await Exam.findOne({ languageId, levelId })
        res.json({
            exam: exam
                ? { _id: exam._id, questionCount: exam.questionCount, durationMinutes: exam.durationMinutes, passScore: exam.passScore, questions: exam.questions }
                : { questionCount: 100, durationMinutes: 60, passScore: 70, questions: [] },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const saveExamConfig = async (req, res) => {
    try {
        const { languageId, levelId, questionCount, durationMinutes, passScore } = req.body
        if (!languageId || !levelId) return res.status(400).json({ error: 'missing_params' })
        const exam = await Exam.findOneAndUpdate(
            { languageId, levelId },
            { languageId, levelId, questionCount: questionCount || 100, durationMinutes: durationMinutes || 60, passScore: passScore ?? 70 },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        )
        res.json({ exam })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const addExamQuestions = async (req, res) => {
    try {
        const { languageId, levelId, questions } = req.body
        if (!languageId || !levelId || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: 'missing_params' })
        }

        const level = await Level.findById(levelId)
        if (!level) return res.status(404).json({ error: 'level_not_found' })

        let exam = await Exam.findOne({ languageId, levelId })
        if (!exam) exam = new Exam({ languageId, levelId, questionCount: 100, durationMinutes: 60, passScore: 70, questions: [] })

        const seen = new Map(exam.questions.map(q => [String(q.question || q.correct).trim().toLowerCase(), true]))
        const added = []
        const skipped = []
        for (const q of questions) {
            if (!q.section || !q.type) { skipped.push({ text: q.question || q.word || '(unlabeled)', reason: 'missing section or type' }); continue }
            const doc = buildQuestionDoc(q)
            if (doc.correct === undefined || doc.correct === null || String(doc.correct).trim() === '') {
                skipped.push({ text: doc.question || q.word || '(unlabeled)', reason: 'missing a correct answer' })
                continue
            }
            const key = String(doc.question || doc.correct).trim().toLowerCase()
            if (seen.has(key)) {
                skipped.push({ text: doc.question || String(doc.correct), reason: 'duplicate within the bank/pasted list' })
                continue
            }
            seen.set(key, true)
            added.push(doc)
        }

        exam.questions.push(...added)
        await exam.save()

        res.json({
            saved: true,
            addedCount: added.length,
            totalInBank: exam.questions.length,
            skipped,
            skippedCount: skipped.length,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// wipes the question bank clean (settings - questionCount/duration/passScore - are untouched) -
// for when a director wants to start the bank over rather than live with a bad bulk paste
export const clearExamQuestions = async (req, res) => {
    try {
        const { languageId, levelId } = req.query
        if (!languageId || !levelId) return res.status(400).json({ error: 'missing_params' })
        await Exam.findOneAndUpdate({ languageId, levelId }, { questions: [] })
        res.json({ cleared: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
