// every route here is scoped to req.auth.userId's own childStudentIds - a parent can only ever
// read data for a student id that's actually listed there (403 otherwise), checked explicitly in
// every function below since middleware/auth.js's generic branch-scope check doesn't apply to parents
import User from "../models/User.js"
import Group from "../models/Group.js"
import StudentProgress from "../models/StudentProgress.js"
import Attendance from "../models/Attendance.js"
import LessonAttendance from "../models/LessonAttendance.js"
import ExtraLesson from "../models/ExtraLesson.js"
import Payment from "../models/Payment.js"
import Pricing from "../models/Pricing.js"
import { computeDayCounter } from "../services/dayCounter.service.js"
import { ensureLessonsGenerated } from "../services/lessonGenerator.service.js"

const assertOwnChild = (parent, studentId) => {
    return parent.childStudentIds.some(id => String(id) === String(studentId))
}

export const getMe = async (req, res) => {
    try {
        const parent = await User.findById(req.auth.userId).select('-passwordHash').populate('childStudentIds', 'name phone')
        if (!parent) return res.status(404).json({ error: 'not_found' })
        res.json({ parent, children: parent.childStudentIds })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// how many of this child's classes (across every active group) have they attended so far
export const getChildAttendance = async (req, res) => {
    try {
        const parent = await User.findById(req.auth.userId)
        if (!assertOwnChild(parent, req.params.studentId)) return res.status(403).json({ error: 'not_your_child' })

        const groups = await Group.find({ studentIds: req.params.studentId, status: 'active' })
            .populate('languageId', 'name').populate('levelId', 'name durationDays')

        const perGroup = await Promise.all(groups.map(async (g) => {
            const durationDays = g.levelId?.durationDays || 30
            const dayCounter = computeDayCounter(g.startDate, durationDays)
            const daysSoFar = Math.max(0, dayCounter - 1)
            const present = await Attendance.countDocuments({ studentId: req.params.studentId, groupId: g._id, day: { $lte: daysSoFar } })

            // real-calendar lesson-by-lesson history (not just the day-counter summary above) - which
            // actual class dates have happened so far, and whether this child was marked present at
            // each one. Same LessonAttendance data the teacher's own StudentDetail page shows.
            const today = new Date()
            const rangeEnd = g.endDate && g.endDate < today ? g.endDate : today
            const lessons = await ensureLessonsGenerated(g, g.startDate, rangeEnd)
            const records = await LessonAttendance.find({ lessonId: { $in: lessons.map(l => l._id) }, studentId: req.params.studentId })
            const statusByLesson = Object.fromEntries(records.map(r => [String(r.lessonId), r.status]))
            const lessonHistory = lessons.map(l => ({ date: l.date, status: statusByLesson[String(l._id)] || 'unmarked' })).reverse()

            return {
                groupId: g._id, language: g.languageId?.name, level: g.levelId?.name,
                daysSoFar, present, missed: Math.max(0, daysSoFar - present),
                lessonHistory,
            }
        }))

        res.json({ groups: perGroup })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// homework completion rate per active group - "how much homework are they completing"
export const getChildProgress = async (req, res) => {
    try {
        const parent = await User.findById(req.auth.userId)
        if (!assertOwnChild(parent, req.params.studentId)) return res.status(403).json({ error: 'not_your_child' })

        const groups = await Group.find({ studentIds: req.params.studentId, status: 'active' })
            .populate('languageId', 'name').populate('levelId', 'name durationDays')

        const perGroup = await Promise.all(groups.map(async (g) => {
            const durationDays = g.levelId?.durationDays || 30
            const dayCounter = computeDayCounter(g.startDate, durationDays)
            const rows = await StudentProgress.find({ studentId: req.params.studentId, groupId: g._id })
            const done = rows.filter(r => r.status === 'done').length
            const avg = (key) => {
                const scored = rows.filter(r => r[key] !== null && r[key] !== undefined)
                return scored.length > 0 ? Math.round(scored.reduce((sum, r) => sum + r[key], 0) / scored.length) : null
            }
            return {
                groupId: g._id, language: g.languageId?.name, level: g.levelId?.name,
                dayCounter, durationDays, daysCompleted: done, completionPercent: dayCounter > 0 ? Math.round((done / dayCounter) * 100) : 0,
                accuracy: { vocab: avg('vocabScore'), grammar: avg('grammarScore'), reading: avg('readingScore') },
            }
        }))

        res.json({ groups: perGroup })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// every extra/makeup lesson an admin has ever scheduled for this specific child - a parent should
// see these the same way they'd see a regular class, since it's real class time their child is
// expected at, just outside the group's normal recurring schedule
export const getChildExtraLessons = async (req, res) => {
    try {
        const parent = await User.findById(req.auth.userId)
        if (!assertOwnChild(parent, req.params.studentId)) return res.status(403).json({ error: 'not_your_child' })

        const extraLessons = await ExtraLesson.find({ studentIds: req.params.studentId })
            .populate('teacherId', 'name')
            .populate({ path: 'groupId', select: 'languageId levelId', populate: [{ path: 'languageId', select: 'name' }, { path: 'levelId', select: 'name' }] })
            .sort({ date: -1 })

        res.json({ extraLessons })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// payment history + next-due date per course, same shape family as studentController.getMe's own courses
export const getChildPayments = async (req, res) => {
    try {
        const parent = await User.findById(req.auth.userId)
        if (!assertOwnChild(parent, req.params.studentId)) return res.status(403).json({ error: 'not_your_child' })

        const student = await User.findById(req.params.studentId)
            .populate('courses.languageId', 'name').populate('courses.levelId', 'name')
        if (!student) return res.status(404).json({ error: 'not_found' })

        const courses = await Promise.all(student.courses.map(async (c) => {
            const pricing = c.levelId ? await Pricing.findOne({ languageId: c.languageId._id, levelId: c.levelId._id }) : null
            return { ...c.toObject(), price: pricing?.monthlyPrice ?? null }
        }))

        const payments = await Payment.find({ studentId: student._id, refunded: { $ne: true } }).sort({ date: -1 }).populate('languageId', 'name')

        res.json({ courses, payments })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
