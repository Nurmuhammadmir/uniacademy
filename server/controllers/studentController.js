// every route in this file sits behind requireRole('student'); only the homework read/submit
// routes additionally require requireActiveSubscription (see studentRoute.js) - exam, progress,
// ranking and attendance routes are deliberately left ungated so an unpaid student still moves
// on with their cohort at the end of a level (see groupPromotion.service.js) instead of being
// blocked from ever finding out their group has advanced
import Group from "../models/Group.js"
import Level from "../models/Level.js"
import User from "../models/User.js"
import StudentProgress from "../models/StudentProgress.js"
import Curriculum from "../models/Curriculum.js"
import Concept from "../models/Concept.js" // required so mongoose can resolve populate('conceptId'/'options'/'correct') refs below
import WordForm from "../models/WordForm.js"
import Translation from "../models/Translation.js"
import VocabExercise from "../models/VocabExercise.js"
import GrammarExercise from "../models/GrammarExercise.js"
import ReadingText from "../models/ReadingText.js"
import ReadingExercise from "../models/ReadingExercise.js"
import Exam from "../models/Exam.js"
import ExamAttempt from "../models/ExamAttempt.js"
import ExamSession from "../models/ExamSession.js"
import Pricing from "../models/Pricing.js"
import Payment from "../models/Payment.js"
import Attendance from "../models/Attendance.js"
import AttendanceSession from "../models/AttendanceSession.js"
import { computeDayCounter, isRestDay } from "../services/dayCounter.service.js"
import { resolveDayStatus } from "../services/homeworkWindow.service.js"
import { handleExamResult } from "../services/examPromotion.service.js"
import { promoteGroupIfLevelComplete } from "../services/groupPromotion.service.js"

// a level's homework window is however many days the director set (Level.durationDays), not a
// fixed 30 - resolved here so every caller below gets a dayCounter capped against the level this
// group actually belongs to
const getGroupAndSyncWindow = async (studentId) => {
    let group = await Group.findOne({ studentIds: studentId, status: 'active' })
    if (!group) return null

    const level = await Level.findById(group.levelId).select('durationDays')
    const durationDays = level?.durationDays || 30
    group.dayCounter = computeDayCounter(group.startDate, durationDays)

    // the whole group moves to the next level together once it finishes this one - independent of
    // any individual exam result (see groupPromotion.service.js) - so re-fetch afterwards in case
    // this request is what just tipped the group over that line and this student landed elsewhere
    await promoteGroupIfLevelComplete(group, durationDays)
    if (group.status !== 'active') {
        group = await Group.findOne({ studentIds: studentId, status: 'active' })
        if (!group) return null
        const newLevel = await Level.findById(group.levelId).select('durationDays')
        return { group, durationDays: newLevel?.durationDays || 30 }
    }

    const rows = await StudentProgress.find({ studentId, groupId: group._id })
    for (const row of rows) {
        if (row.status === 'done') continue
        const freshStatus = resolveDayStatus(row.day, group.dayCounter)
        if (freshStatus !== row.status) {
            row.status = freshStatus
            await row.save()
        }
    }

    return { group, durationDays }
}

export const getHomeworkWeek = async (req, res) => {
    try {
        const result = await getGroupAndSyncWindow(req.auth.userId)
        if (!result) return res.status(404).json({ error: 'no_active_group' })
        const { group, durationDays } = result

        const windowStart = Math.max(1, group.dayCounter - 2)
        const dayNumbers = []
        for (let d = windowStart; d <= group.dayCounter; d++) dayNumbers.push(d)

        const rows = await StudentProgress.find({ studentId: req.auth.userId, groupId: group._id, day: { $in: dayNumbers } })
        const rowByDay = Object.fromEntries(rows.map(r => [r.day, r]))

        const days = dayNumbers.map(day => {
            const row = rowByDay[day]
            const restDay = isRestDay(group.startDate, day)
            return {
                day,
                restDay,
                status: restDay ? 'rest' : (row?.status || 'open'),
                vocabDone: row?.vocabDone || false,
                grammarDone: row?.grammarScore !== null && row?.grammarScore !== undefined,
                readingDone: row?.readingScore !== null && row?.readingScore !== undefined,
            }
        })

        const exam = await Exam.findOne({ levelId: group.levelId })
        const examAttempted = exam ? await ExamAttempt.exists({ studentId: req.auth.userId, examId: exam._id }) : false

        res.json({
            groupId: group._id,
            groupDayCounter: group.dayCounter,
            durationDays,
            days,
            examAvailable: group.dayCounter >= durationDays,
            examAttempted: !!examAttempted,
            levelId: group.levelId,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to get one specific day's homework content - day must be inside the open window, or already done
export const getHomeworkForDay = async (req, res) => {
    try {
        const result = await getGroupAndSyncWindow(req.auth.userId)
        if (!result) return res.status(404).json({ error: 'no_active_group' })
        const { group } = result

        // BUG FIX: reject a non-numeric day param up front (was crashing mongoose with a NaN cast
        // when the frontend requested a day before it had actually loaded one)
        const day = Number(req.params.day)
        if (!Number.isInteger(day) || day < 1) {
            return res.status(400).json({ error: 'invalid_day' })
        }

        const status = resolveDayStatus(day, group.dayCounter)
        const row = await StudentProgress.findOne({ studentId: req.auth.userId, groupId: group._id, day })

        if (status === 'locked' && (!row || row.status !== 'done')) {
            return res.status(403).json({ error: 'day_locked' })
        }
        if (status === 'expired' && (!row || row.status !== 'done')) {
            return res.status(403).json({ error: 'day_expired' })
        }

        if (isRestDay(group.startDate, day)) {
            return res.json({ restDay: true, day, groupId: group._id })
        }

        const curriculum = await Curriculum.findOne({ languageId: group.languageId, levelId: group.levelId, day }).populate('conceptIds')
        const vocab = await VocabExercise.find({ languageId: group.languageId, levelId: group.levelId, day })
            .populate('conceptId')
            .populate('options')
            .populate('correct')
        const grammar = await GrammarExercise.find({ languageId: group.languageId, levelId: group.levelId, day })
        const readingText = await ReadingText.findOne({ languageId: group.languageId, levelId: group.levelId, day })
        const readingExercises = readingText
            ? await ReadingExercise.find({ readingTextId: readingText._id })
            : []

        // Concept only holds { image, category } - the actual word, its example sentence and its
        // native-language translations live on WordForm/Translation. The frontend needs all three to
        // render a vocab question (picture/word/translation), so attach them here rather than
        // leaving the frontend to work with a bare Concept id.
        const conceptIds = new Set()
        ;(curriculum?.conceptIds || []).forEach(c => conceptIds.add(String(c._id)))
        vocab.forEach(v => {
            if (v.conceptId) conceptIds.add(String(v.conceptId._id))
            ;(v.options || []).forEach(o => conceptIds.add(String(o._id)))
            if (v.correct) conceptIds.add(String(v.correct._id))
        })
        const wordForms = await WordForm.find({ conceptId: { $in: [...conceptIds] }, languageId: group.languageId })
        const wordFormByConceptId = Object.fromEntries(wordForms.map(w => [String(w.conceptId), w]))
        // every native language (ru/uz/kaa), not just one - a translation question shows all three
        // at once (e.g. "день / kun / kún") so it works for the whole student body, not just Russian
        // speakers
        const translations = await Translation.find({ conceptId: { $in: [...conceptIds] } })
        const translationsByConceptId = {}
        translations.forEach(t => {
            const key = String(t.conceptId)
            if (!translationsByConceptId[key]) translationsByConceptId[key] = {}
            translationsByConceptId[key][t.nativeLanguageCode] = t.text
        })

        const withWord = (concept) => {
            if (!concept) return concept
            const obj = concept.toObject ? concept.toObject() : concept
            const wf = wordFormByConceptId[String(obj._id)]
            const tr = translationsByConceptId[String(obj._id)] || {}
            return { ...obj, word: wf?.word || '', example: wf?.example || '', translations: { ru: tr.ru || '', uz: tr.uz || '', kaa: tr.kaa || '' } }
        }

        const enrichedConcepts = (curriculum?.conceptIds || []).map(withWord)
        const enrichedVocab = vocab.map(v => ({
            ...v.toObject(),
            conceptId: withWord(v.conceptId),
            options: (v.options || []).map(withWord),
            correct: withWord(v.correct),
        }))

        res.json({
            restDay: false,
            day,
            groupId: group._id,
            concepts: enrichedConcepts,
            vocab: enrichedVocab,
            grammar,
            readingText,
            readingExercises,
            progress: row ? { vocabDone: row.vocabDone, vocabScore: row.vocabScore, grammarScore: row.grammarScore, readingScore: row.readingScore, status: row.status } : null,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

const assertDayIsOpen = async (studentId, groupId, day) => {
    let row = await StudentProgress.findOne({ studentId, groupId, day })
    if (!row) {
        try {
            row = await StudentProgress.create({ studentId, groupId, day, status: 'open' })
        } catch (error) {
            // two sections (vocab/grammar/reading) for the same day share one StudentProgress row
            // and can race to create it on their first-ever submit - the unique {studentId,groupId,
            // day} index rejects the loser, which just means the winner's row already exists
            if (error.code === 11000) row = await StudentProgress.findOne({ studentId, groupId, day })
            else throw error
        }
    }
    if (row.status === 'done') { const err = new Error('day_already_completed'); err.status = 403; err.code = 'day_already_completed'; throw err }
    if (row.status === 'expired') { const err = new Error('day_expired'); err.status = 403; err.code = 'day_expired'; throw err }
    if (row.status === 'locked') { const err = new Error('day_locked'); err.status = 403; err.code = 'day_locked'; throw err }
    return row
}

const maybeMarkDone = async (row) => {
    if (row.vocabDone && row.grammarScore !== null && row.readingScore !== null) {
        row.status = 'done'
        row.completedAt = new Date()
    }
    await row.save()
}

export const submitVocab = async (req, res) => {
    try {
        const { groupId, day, answers } = req.body
        const row = await assertDayIsOpen(req.auth.userId, groupId, day)

        const exercises = await VocabExercise.find({ _id: { $in: answers.map(a => a.exerciseId) } })
        let correctCount = 0
        for (const answer of answers) {
            const exercise = exercises.find(e => String(e._id) === String(answer.exerciseId))
            if (exercise && String(exercise.correct) === String(answer.chosenConceptId)) correctCount++
        }
        const score = Math.round((correctCount / (answers.length || 1)) * 100)

        row.vocabDone = true
        row.vocabScore = score
        await maybeMarkDone(row)

        res.json({ score, dayStatus: row.status })
    } catch (error) {
        if (error.code) return res.status(error.status).json({ error: error.code })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const submitGrammar = async (req, res) => {
    try {
        const { groupId, day, answers } = req.body
        const row = await assertDayIsOpen(req.auth.userId, groupId, day)

        const exercises = await GrammarExercise.find({ _id: { $in: answers.map(a => a.exerciseId) } })
        let correctCount = 0
        for (const answer of answers) {
            const exercise = exercises.find(e => String(e._id) === String(answer.exerciseId))
            if (exercise && String(exercise.correct).trim().toLowerCase() === String(answer.answer).trim().toLowerCase()) correctCount++
        }
        const score = Math.round((correctCount / (answers.length || 1)) * 100)

        row.grammarScore = score
        await maybeMarkDone(row)

        res.json({ score, dayStatus: row.status })
    } catch (error) {
        if (error.code) return res.status(error.status).json({ error: error.code })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const submitReading = async (req, res) => {
    try {
        const { groupId, day, answers } = req.body
        const row = await assertDayIsOpen(req.auth.userId, groupId, day)

        const exercises = await ReadingExercise.find({ _id: { $in: answers.map(a => a.exerciseId) } })
        let correctCount = 0
        for (const answer of answers) {
            const exercise = exercises.find(e => String(e._id) === String(answer.exerciseId))
            if (!exercise) continue
            // scalar answers (true_false as 'true'/'false' strings, short text) compare as
            // normalized strings - JSON.stringify(true) !== JSON.stringify("true"), so a strict
            // JSON comparison would never match a boolean `correct` against a string answer from
            // the client. Only fall back to JSON comparison for genuinely structured answers
            // (arrays/objects, e.g. sequencing or multi-blank gap-fill).
            const isStructured = typeof exercise.correct === 'object' && exercise.correct !== null
            const isMatch = isStructured
                ? JSON.stringify(exercise.correct) === JSON.stringify(answer.answer)
                : String(exercise.correct).trim().toLowerCase() === String(answer.answer).trim().toLowerCase()
            if (isMatch) correctCount++
        }
        const score = Math.round((correctCount / (answers.length || 1)) * 100)

        row.readingScore = score
        await maybeMarkDone(row)

        res.json({ score, dayStatus: row.status })
    } catch (error) {
        if (error.code) return res.status(error.status).json({ error: error.code })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getProgress = async (req, res) => {
    try {
        const result = await getGroupAndSyncWindow(req.auth.userId)
        if (!result) return res.status(404).json({ error: 'no_active_group' })
        const { group, durationDays } = result

        const rows = await StudentProgress.find({ studentId: req.auth.userId, groupId: group._id }).sort({ day: 1 })

        let streak = 0
        for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i].status === 'done') streak++
            else break
        }

        const avg = (key) => {
            const scored = rows.filter(r => r[key] !== null && r[key] !== undefined)
            if (scored.length === 0) return null
            return Math.round(scored.reduce((sum, r) => sum + r[key], 0) / scored.length)
        }

        res.json({
            streak,
            durationDays,
            accuracy: { vocab: avg('vocabScore'), grammar: avg('grammarScore'), reading: avg('readingScore') },
            days: rows,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the student's own profile screen - now includes course, price, balance, next payment due
export const getMe = async (req, res) => {
    try {
        const student = await User.findById(req.auth.userId).select('-passwordHash')
            .populate('branchId', 'name')
            .populate('courses.languageId', 'name')
            .populate('courses.levelId', 'name order')
        if (!student) return res.status(404).json({ error: 'not_found' })

        const courses = await Promise.all(student.courses.map(async (c) => {
            const pricing = await Pricing.findOne({ languageId: c.languageId._id, levelId: c.levelId._id })
            const payments = await Payment.find({ studentId: student._id, languageId: c.languageId._id })
            return {
                ...c.toObject(),
                price: pricing?.monthlyPrice ?? null,
                totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
            }
        }))

        res.json({ student, courses })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getGroupRanking = async (req, res) => {
    try {
        const result = await getGroupAndSyncWindow(req.auth.userId)
        if (!result) return res.status(404).json({ error: 'no_active_group' })
        const { group } = result

        const rows = await StudentProgress.find({ groupId: group._id, status: 'done' })

        const byStudent = {}
        for (const row of rows) {
            const key = String(row.studentId)
            if (!byStudent[key]) byStudent[key] = { total: 0, count: 0 }
            const avgRow = ((row.vocabScore || 0) + (row.grammarScore || 0) + (row.readingScore || 0)) / 3
            byStudent[key].total += avgRow
            byStudent[key].count += 1
        }

        const students = await User.find({ _id: { $in: Object.keys(byStudent) } }).select('name')
        const nameById = Object.fromEntries(students.map(s => [String(s._id), s.name]))

        const ranking = Object.entries(byStudent)
            .map(([studentId, { total, count }]) => ({ studentId, name: nameById[studentId], averageScore: Math.round(total / count) }))
            .sort((a, b) => b.averageScore - a.averageScore)

        res.json({ ranking, myId: String(req.auth.userId), myRank: ranking.findIndex(r => r.studentId === String(req.auth.userId)) + 1 })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the enhanced group view - every student in the group with their own day-by-day array,
// so the student app can show a real roster with daily progress bars, not just a done-only leaderboard
export const getGroupProgress = async (req, res) => {
    try {
        const result = await getGroupAndSyncWindow(req.auth.userId)
        if (!result) return res.status(404).json({ error: 'no_active_group' })
        const { group, durationDays } = result

        await group.populate('languageId', 'name')
        await group.populate('levelId', 'name')
        await group.populate('teacherId', 'name')

        const students = await User.find({ _id: { $in: group.studentIds } }).select('name')
        const rows = await StudentProgress.find({ groupId: group._id }).sort({ day: 1 })

        const roster = students.map(s => ({
            studentId: s._id,
            name: s.name,
            days: rows.filter(r => String(r.studentId) === String(s._id)),
        }))

        res.json({
            groupDayCounter: group.dayCounter,
            durationDays,
            roster,
            group: {
                language: group.languageId?.name,
                level: group.levelId?.name,
                teacher: group.teacherId?.name,
                schedulePattern: group.schedulePattern,
                time: group.time,
            },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

const shuffle = (arr) => {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

// picks `count` exercises by repeatedly choosing a random already-learned day, then one random
// exercise from that day's pool - so a student can draw the same day more than once (there aren't
// always 25+ learned days), but each draw is still "a random exercise from a random day" rather
// than a flat sample across the whole level's content
const pickOnePerRandomDay = (byDay, count) => {
    const days = Object.keys(byDay)
    const picked = []
    if (days.length === 0) return picked
    for (let i = 0; i < count; i++) {
        const day = days[Math.floor(Math.random() * days.length)]
        const pool = byDay[day]
        picked.push(pool[Math.floor(Math.random() * pool.length)])
    }
    return picked
}

// The exam is no longer a director-curated bank - it's assembled once per attempt straight from
// content the student has already been taught: 25 vocab + 25 grammar exercises (one random
// exercise from one random already-learned day, drawn 25 times each) plus 3 whole reading texts
// (each kept intact with all 10 of its own exercises) from already-learned days. `correct` is
// never sent to the client - grading happens entirely server-side in submitExam, by looking the
// same exercise ids back up in their source collections.
//
// The drawn set is persisted in ExamSession the FIRST time a student opens the exam, and every
// later call just replays that same snapshot - closing the tab and reopening (or refreshing right
// before a bad answer) can never re-roll a fresh, easier set. `startedAt` anchors the countdown
// server-side too, so the remaining time keeps counting down in the background regardless of how
// many times the page is reloaded.
export const getExam = async (req, res) => {
    try {
        const group = await Group.findOne({ studentIds: req.auth.userId, levelId: req.params.levelId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        // exam settings (pass mark / time limit) default to 90 min / 70% the moment a level's exam
        // is actually needed, rather than 404ing just because a director never separately visited
        // that level's Homework page to click "Save settings" - the exam itself no longer needs any
        // director authoring, so requiring a settings visit first would be a pointless manual step
        let exam = await Exam.findOne({ levelId: req.params.levelId })
        if (!exam) {
            exam = await Exam.create({ languageId: group.languageId, levelId: req.params.levelId, durationMinutes: 90, passScore: 70 })
        }

        const alreadyAttempted = await ExamAttempt.exists({ studentId: req.auth.userId, examId: exam._id })
        if (alreadyAttempted) return res.status(403).json({ error: 'exam_already_attempted' })

        const existingSession = await ExamSession.findOne({ studentId: req.auth.userId, examId: exam._id })
        if (existingSession) {
            return res.json({
                examId: exam._id,
                durationMinutes: exam.durationMinutes,
                startedAt: existingSession.startedAt,
                questions: existingSession.questions,
                readingTexts: existingSession.readingTexts,
            })
        }

        const level = await Level.findById(req.params.levelId).select('durationDays')
        const durationDays = level?.durationDays || 30
        const dayCounter = computeDayCounter(group.startDate, durationDays)

        const learnedDays = []
        for (let d = 1; d <= Math.min(dayCounter, durationDays); d++) learnedDays.push(d)
        if (learnedDays.length === 0) return res.status(404).json({ error: 'not_enough_content' })

        // ---- vocab: 25 slots ----
        const vocabDocs = await VocabExercise.find({ languageId: exam.languageId, levelId: exam.levelId, day: { $in: learnedDays } })
            .populate('conceptId').populate('options')
        const vocabByDay = {}
        vocabDocs.forEach(v => { (vocabByDay[v.day] = vocabByDay[v.day] || []).push(v) })
        const pickedVocab = pickOnePerRandomDay(vocabByDay, 25)

        // vocab prompts need each concept's word/example/translations (same enrichment
        // getHomeworkForDay does) - batched here across every concept the 25 picks touch
        const conceptIds = new Set()
        pickedVocab.forEach(v => {
            if (v.conceptId) conceptIds.add(String(v.conceptId._id))
            ;(v.options || []).forEach(o => conceptIds.add(String(o._id)))
        })
        const wordForms = await WordForm.find({ conceptId: { $in: [...conceptIds] }, languageId: exam.languageId })
        const wordFormByConceptId = Object.fromEntries(wordForms.map(w => [String(w.conceptId), w]))
        const translations = await Translation.find({ conceptId: { $in: [...conceptIds] } })
        const translationsByConceptId = {}
        translations.forEach(t => {
            const key = String(t.conceptId)
            if (!translationsByConceptId[key]) translationsByConceptId[key] = {}
            translationsByConceptId[key][t.nativeLanguageCode] = t.text
        })
        const withWord = (concept) => {
            if (!concept) return concept
            const obj = concept.toObject ? concept.toObject() : concept
            const wf = wordFormByConceptId[String(obj._id)]
            const tr = translationsByConceptId[String(obj._id)] || {}
            return { ...obj, word: wf?.word || '', example: wf?.example || '', translations: { ru: tr.ru || '', uz: tr.uz || '', kaa: tr.kaa || '' } }
        }
        const vocabQuestions = pickedVocab.map(v => ({
            _id: v._id, section: 'vocab', type: v.type,
            conceptId: withWord(v.conceptId),
            options: (v.options || []).map(withWord),
        }))

        // ---- grammar: 25 slots ----
        const grammarDocs = await GrammarExercise.find({ languageId: exam.languageId, levelId: exam.levelId, day: { $in: learnedDays } })
        const grammarByDay = {}
        grammarDocs.forEach(g => { (grammarByDay[g.day] = grammarByDay[g.day] || []).push(g) })
        const pickedGrammar = pickOnePerRandomDay(grammarByDay, 25)
        const grammarQuestions = pickedGrammar.map(g => ({
            _id: g._id, section: 'grammar', type: g.type, question: g.question, options: g.options,
        }))

        // ---- reading: 3 DISTINCT whole texts, each kept with all of its own exercises ----
        const readingCandidates = await ReadingText.find({ languageId: exam.languageId, levelId: exam.levelId, day: { $in: learnedDays } })
        const chosenReadingTexts = shuffle(readingCandidates).slice(0, 3)
        const readingTexts = []
        for (const rt of chosenReadingTexts) {
            const exercises = await ReadingExercise.find({ readingTextId: rt._id })
            readingTexts.push({
                readingTextId: rt._id,
                title: rt.title,
                image: rt.image,
                paragraphs: rt.paragraphs,
                exercises: shuffle(exercises).map(e => ({ _id: e._id, type: e.type, question: e.question, options: e.options })),
            })
        }

        // a level with no homework content ever built would otherwise come back as a "successful"
        // but completely empty exam - the submit button has nothing to enable and the student gets
        // stuck on a blank page, so treat it the same as "not enough content" instead
        if (vocabQuestions.length === 0 && grammarQuestions.length === 0 && readingTexts.length === 0) {
            return res.status(404).json({ error: 'not_enough_content' })
        }

        const questions = shuffle([...vocabQuestions, ...grammarQuestions])
        const session = await ExamSession.create({ studentId: req.auth.userId, examId: exam._id, questions, readingTexts })

        res.json({
            examId: exam._id,
            durationMinutes: exam.durationMinutes,
            startedAt: session.startedAt,
            questions,
            readingTexts,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const submitExam = async (req, res) => {
    try {
        const { answers } = req.body // [{ questionId, answer }] - only the questions this attempt was actually shown
        const exam = await Exam.findById(req.params.id)
        if (!exam) return res.status(404).json({ error: 'not_found' })

        // a student can only ever self-submit an exam ONCE - any retake after that is admin-only
        // (adminController.retakeExam), matching the "one manual retake" business rule
        const alreadyAttempted = await ExamAttempt.exists({ studentId: req.auth.userId, examId: exam._id })
        if (alreadyAttempted) {
            return res.status(403).json({ error: 'exam_already_attempted' })
        }

        // must have actually opened this exam via getExam first (which creates the session) -
        // closes off submitting a guessed/discovered examId for a level never taken
        const session = await ExamSession.findOne({ studentId: req.auth.userId, examId: exam._id })
        if (!session) return res.status(404).json({ error: 'no_exam_session' })

        const list = Array.isArray(answers) ? answers : []
        const ids = list.map(a => a.questionId)
        // exam questions are just VocabExercise/GrammarExercise/ReadingExercise docs drawn at
        // random - grading looks the submitted ids back up in whichever collection they came from,
        // using the exact same per-section comparison rules as daily homework (submitVocab/
        // submitGrammar/submitReading above) so an exam and a practice day always agree on "correct"
        const [vocabDocs, grammarDocs, readingDocs] = await Promise.all([
            VocabExercise.find({ _id: { $in: ids } }),
            GrammarExercise.find({ _id: { $in: ids } }),
            ReadingExercise.find({ _id: { $in: ids } }),
        ])
        const vocabById = new Map(vocabDocs.map(v => [String(v._id), v]))
        const grammarById = new Map(grammarDocs.map(g => [String(g._id), g]))
        const readingById = new Map(readingDocs.map(r => [String(r._id), r]))

        let correctCount = 0
        for (const a of list) {
            const id = String(a.questionId)
            if (vocabById.has(id)) {
                if (String(vocabById.get(id).correct) === String(a.answer)) correctCount++
            } else if (grammarById.has(id)) {
                if (String(grammarById.get(id).correct).trim().toLowerCase() === String(a.answer).trim().toLowerCase()) correctCount++
            } else if (readingById.has(id)) {
                const ex = readingById.get(id)
                const isStructured = typeof ex.correct === 'object' && ex.correct !== null
                const isMatch = isStructured
                    ? JSON.stringify(ex.correct) === JSON.stringify(a.answer)
                    : String(ex.correct).trim().toLowerCase() === String(a.answer).trim().toLowerCase()
                if (isMatch) correctCount++
            }
        }
        const score = Math.round((correctCount / (list.length || 1)) * 100)

        const student = await User.findById(req.auth.userId)

        const result = await handleExamResult({ student, exam, score })
        // the in-progress snapshot is fully consumed now that a real ExamAttempt exists - clear it
        // so nothing is left lying around once this attempt is done
        await ExamSession.deleteOne({ studentId: req.auth.userId, examId: exam._id })
        res.json({ score, ...result })
    } catch (error) {
        // the exists-then-create check above has a race window - a double-click/double-submit can
        // slip both requests past it before either commits. ExamAttempt's partial unique index
        // (source:'self') is the real backstop; a duplicate-key error here just means the OTHER
        // concurrent request won, so report it the same as the normal "already attempted" case
        // instead of a confusing 500.
        if (error.code === 11000) return res.status(403).json({ error: 'exam_already_attempted' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to mark yourself present by scanning your teacher's QR code - the token must be fresh
// (2-minute window), you must actually be a member of that session's group, and you can only be
// marked present once per group per day (repeat scans just confirm you're already checked in)
export const scanAttendance = async (req, res) => {
    try {
        const { token } = req.body
        const session = await AttendanceSession.findOne({ token })
        if (!session || session.expiresAt < new Date()) {
            return res.status(400).json({ error: 'qr_expired' })
        }

        // status:'active' - a completed group's roster is kept for historical reporting (see
        // groupPromotion.service.js), so matching on studentIds alone could otherwise let a stale
        // QR scan register attendance against a group the student has already moved on from
        const group = await Group.findOne({ _id: session.groupId, studentIds: req.auth.userId, status: 'active' })
        if (!group) {
            return res.status(403).json({ error: 'not_in_this_group' })
        }

        const existing = await Attendance.findOne({ studentId: req.auth.userId, groupId: group._id, day: session.day })
        if (existing) {
            return res.json({ alreadyMarked: true, day: session.day })
        }

        try {
            await Attendance.create({ studentId: req.auth.userId, groupId: group._id, day: session.day })
        } catch (createError) {
            // duplicate key = another request for the same student+group+day won the race - that's
            // fine, it means they're already checked in, not a real error
            if (createError.code === 11000) {
                return res.json({ alreadyMarked: true, day: session.day })
            }
            throw createError
        }
        res.status(201).json({ alreadyMarked: false, day: session.day })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
