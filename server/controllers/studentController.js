// every route in this file sits behind requireRole('student') AND requireActiveSubscription (rule #2)
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
import Pricing from "../models/Pricing.js"
import Payment from "../models/Payment.js"
import Attendance from "../models/Attendance.js"
import AttendanceSession from "../models/AttendanceSession.js"
import { computeDayCounter, isRestDay } from "../services/dayCounter.service.js"
import { resolveDayStatus } from "../services/homeworkWindow.service.js"
import { handleExamResult } from "../services/examPromotion.service.js"

// a level's homework window is however many days the director set (Level.durationDays), not a
// fixed 30 - resolved here so every caller below gets a dayCounter capped against the level this
// group actually belongs to
const getGroupAndSyncWindow = async (studentId) => {
    const group = await Group.findOne({ studentIds: studentId, status: 'active' })
    if (!group) return null

    const level = await Level.findById(group.levelId).select('durationDays')
    const durationDays = level?.durationDays || 30
    group.dayCounter = computeDayCounter(group.startDate, durationDays)

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
        // native-language translation live on WordForm/Translation. The frontend needs all three to
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
        // 'ru' is the shared default across branches - there's no per-student native-language
        // preference stored anywhere yet, so this is the one language every student can read
        const translations = await Translation.find({ conceptId: { $in: [...conceptIds] }, nativeLanguageCode: 'ru' })
        const translationByConceptId = Object.fromEntries(translations.map(t => [String(t.conceptId), t.text]))

        const withWord = (concept) => {
            if (!concept) return concept
            const obj = concept.toObject ? concept.toObject() : concept
            const wf = wordFormByConceptId[String(obj._id)]
            return { ...obj, word: wf?.word || '', example: wf?.example || '', translation: translationByConceptId[String(obj._id)] || '' }
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
    if (!row) row = await StudentProgress.create({ studentId, groupId, day, status: 'open' })
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

export const getExam = async (req, res) => {
    try {
        const exam = await Exam.findOne({ levelId: req.params.levelId })
        if (!exam) return res.status(404).json({ error: 'not_found' })
        res.json({ exam })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const submitExam = async (req, res) => {
    try {
        const { score } = req.body
        const exam = await Exam.findById(req.params.id)
        if (!exam) return res.status(404).json({ error: 'not_found' })

        // a student can only ever self-submit an exam ONCE - any retake after that is admin-only
        // (adminController.retakeExam), matching the "one manual retake" business rule
        const alreadyAttempted = await ExamAttempt.exists({ studentId: req.auth.userId, examId: exam._id })
        if (alreadyAttempted) {
            return res.status(403).json({ error: 'exam_already_attempted' })
        }

        const group = await Group.findOne({ studentIds: req.auth.userId, levelId: exam.levelId })
        const student = await User.findById(req.auth.userId)

        const result = await handleExamResult({ student, exam, group, score })
        res.json(result)
    } catch (error) {
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

        const group = await Group.findOne({ _id: session.groupId, studentIds: req.auth.userId })
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
