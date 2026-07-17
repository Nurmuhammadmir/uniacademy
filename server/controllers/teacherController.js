// teacher can only ever see their own groups - filtered by req.auth.userId, never trusts a client-supplied id
import crypto from "crypto"
import Group from "../models/Group.js"
import Level from "../models/Level.js"
import User from "../models/User.js"
import StudentProgress from "../models/StudentProgress.js"
import ExamAttempt from "../models/ExamAttempt.js"
import Attendance from "../models/Attendance.js"
import AttendanceSession from "../models/AttendanceSession.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import TeacherAttendanceQR from "../models/TeacherAttendanceQR.js"
import { computeDayCounter } from "../services/dayCounter.service.js"

export const getMyGroups = async (req, res) => {
    try {
        // active only - a completed/archived group still exists for historical reporting (its
        // roster is deliberately kept, see groupPromotion.service.js), but a teacher's own "my
        // groups" list is for classes they're actually running today, not a history browser
        const groups = await Group.find({ teacherId: req.auth.userId, status: 'active' })
            .populate('languageId', 'name code')
            .populate('levelId', 'name order durationDays')

        const groupIds = groups.map(g => g._id)
        const doneRows = await StudentProgress.find({ groupId: { $in: groupIds }, status: 'done' })

        const withFreshDay = groups.map(g => {
            const rowsForGroup = doneRows.filter(r => String(r.groupId) === String(g._id))
            const averageScore = rowsForGroup.length > 0
                ? Math.round(rowsForGroup.reduce((sum, r) => sum + ((r.vocabScore || 0) + (r.grammarScore || 0) + (r.readingScore || 0)) / 3, 0) / rowsForGroup.length)
                : null
            return { ...g.toObject(), dayCounter: computeDayCounter(g.startDate, g.levelId?.durationDays || 30), averageScore }
        })
        res.json({ groups: withFreshDay })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to list one group's students with their completion percentage so far (auto-graded, teacher never scores)
export const getGroupStudents = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.auth.userId }).populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })

        const progressRows = await StudentProgress.find({ groupId: group._id })

        const students = group.studentIds.map(student => {
            const rows = progressRows.filter(p => String(p.studentId) === String(student._id))
            const done = rows.filter(r => r.status === 'done').length
            const total = rows.length || 1
            return {
                id: student._id,
                name: student.name,
                phone: student.phone,
                completionPercent: Math.round((done / total) * 100),
            }
        })

        res.json({ students })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to see one student's full day-by-day breakdown within this group
export const getStudentDayDetail = async (req, res) => {
    try {
        const { id: groupId, studentId } = req.params
        const group = await Group.findOne({ _id: groupId, teacherId: req.auth.userId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const student = await User.findOne({ _id: studentId, role: 'student' }).select('name phone')
        if (!student) return res.status(404).json({ error: 'not_found' })

        const rows = await StudentProgress.find({ groupId, studentId }).sort({ day: 1 })
        const examAttempts = await ExamAttempt.find({ studentId }).sort({ date: -1 })
            .populate({ path: 'examId', populate: [{ path: 'languageId', select: 'name' }, { path: 'levelId', select: 'name' }] })
        res.json({ student, days: rows, examAttempts })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to generate a fresh attendance QR token for today's session - short-lived on purpose (2 min)
// so a screenshot can't be reused after class ends. Calling this again before it expires just
// issues a new one; the old one silently stops working.
export const createAttendanceSession = async (req, res) => {
    try {
        // status:'active' matters now that a completed group's studentIds are kept (not cleared)
        // for historical reporting - without this filter a teacher could still open a live
        // attendance QR for a group that finished and already promoted its students onward
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.auth.userId, status: 'active' })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const level = await Level.findById(group.levelId).select('durationDays')
        const day = computeDayCounter(group.startDate, level?.durationDays || 30)
        const token = crypto.randomBytes(16).toString('hex')
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000)

        const session = await AttendanceSession.create({ groupId: group._id, day, token, expiresAt })
        res.status(201).json({ token: session.token, expiresAt: session.expiresAt, day })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to see who has scanned in for a given day - roster with present/absent per student
export const getAttendanceForDay = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, teacherId: req.auth.userId }).populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })

        const day = Number(req.params.day)
        const records = await Attendance.find({ groupId: group._id, day })
        const presentIds = new Set(records.map(r => String(r.studentId)))

        const roster = group.studentIds.map(s => ({
            studentId: s._id,
            name: s.name,
            present: presentIds.has(String(s._id)),
            scannedAt: records.find(r => String(r.studentId) === String(s._id))?.scannedAt || null,
        }))

        res.json({ day, roster, presentCount: presentIds.size, totalCount: group.studentIds.length })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the teacher's own profile screen
export const getMe = async (req, res) => {
    try {
        const teacher = await User.findById(req.auth.userId).select('-passwordHash').populate('branchId', 'name')
        if (!teacher) return res.status(404).json({ error: 'not_found' })

        const groups = await Group.find({ teacherId: teacher._id })
        const activeGroups = groups.filter(g => g.status === 'active')
        const uniqueStudentIds = new Set()
        activeGroups.forEach(g => g.studentIds.forEach(id => uniqueStudentIds.add(String(id))))

        res.json({
            teacher,
            employedSince: teacher.createdAt,
            activeGroupsCount: activeGroups.length,
            totalStudents: uniqueStudentIds.size,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for a teacher to check THEMSELVES in for today by scanning the QR their admin generated -
// the token must belong to THIS teacher (not just any valid session) and not be expired
export const scanOwnAttendance = async (req, res) => {
    try {
        const { token } = req.body
        const qr = await TeacherAttendanceQR.findOne({ token })
        if (!qr) {
            return res.status(400).json({ error: 'invalid_qr' })
        }

        // UTC, not local server time - directorController.getAttendanceOverview parses "today" from
        // a plain YYYY-MM-DD string, which JS always treats as UTC midnight; zeroing locally here
        // would silently disagree with that read-side calculation on any non-UTC server timezone,
        // making a real check-in invisible to the director's attendance overview
        const today = new Date(); today.setUTCHours(0, 0, 0, 0)
        const existing = await TeacherAttendance.findOne({ teacherId: req.auth.userId, date: today })
        if (existing) return res.json({ alreadyMarked: true })

        try {
            await TeacherAttendance.create({ teacherId: req.auth.userId, date: today })
        } catch (createError) {
            if (createError.code === 11000) return res.json({ alreadyMarked: true })
            throw createError
        }
        res.status(201).json({ alreadyMarked: false })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for a teacher to manually mark a student present/absent - covers students without a phone
// to scan with. Marking present creates the same Attendance record a QR scan would; marking absent
// removes it (a student never has a "false" attendance row, they simply have none for that day).
export const markStudentAttendance = async (req, res) => {
    try {
        const { id: groupId, studentId, day } = req.params
        const { present } = req.body

        // status:'active' - see createAttendanceSession's comment above
        const group = await Group.findOne({ _id: groupId, teacherId: req.auth.userId, status: 'active' })
        if (!group) return res.status(404).json({ error: 'not_found' })

        if (present) {
            await Attendance.findOneAndUpdate(
                { studentId, groupId, day: Number(day) },
                { studentId, groupId, day: Number(day), scannedAt: new Date() },
                { upsert: true }
            )
        } else {
            await Attendance.findOneAndDelete({ studentId, groupId, day: Number(day) })
        }

        res.json({ present: !!present })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
