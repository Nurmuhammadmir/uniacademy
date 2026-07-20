// backs the admin "Group Details" CRM page (left info panel + Davomat/Materials/Discount/Exams/
// History/Comments tabs) plus branch room management and the today's-lessons timetable. Kept in
// its own file since adminController.js was already large before this feature existed.
import Group from "../models/Group.js"
import Room from "../models/Room.js"
import Lesson from "../models/Lesson.js"
import LessonAttendance from "../models/LessonAttendance.js"
import GroupComment from "../models/GroupComment.js"
import GroupMaterial from "../models/GroupMaterial.js"
import Exam from "../models/Exam.js"
import ExamAttempt from "../models/ExamAttempt.js"
import Level from "../models/Level.js"
import ExtraLesson from "../models/ExtraLesson.js"
import { ensureLessonsGenerated } from "../services/lessonGenerator.service.js"

// ==== Rooms ====

export const listRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ branchId: req.auth.branchId }).sort({ name: 1 })
        res.json({ rooms })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createRoom = async (req, res) => {
    try {
        const { name, capacity } = req.body
        const room = await Room.create({ branchId: req.auth.branchId, name, capacity: capacity || 20 })
        res.status(201).json({ room })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateRoom = async (req, res) => {
    try {
        const { name, capacity } = req.body
        const room = await Room.findOneAndUpdate({ _id: req.params.id, branchId: req.auth.branchId }, { name, capacity }, { new: true })
        if (!room) return res.status(404).json({ error: 'not_found' })
        res.json({ room })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteRoom = async (req, res) => {
    try {
        await Room.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
        await Group.updateMany({ roomId: req.params.id }, { roomId: null })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Group Details ====

export const getGroupDetails = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
            .populate('languageId', 'name').populate('levelId', 'name durationDays')
            .populate('teacherId', 'name phone').populate('roomId', 'name capacity')
            .populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })
        res.json({ group })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateGroupDiscount = async (req, res) => {
    try {
        const { discountPercent } = req.body
        const group = await Group.findOneAndUpdate(
            { _id: req.params.id, branchId: req.auth.branchId },
            { discountPercent: Math.max(0, Math.min(100, Number(discountPercent) || 0)) },
            { new: true }
        )
        if (!group) return res.status(404).json({ error: 'not_found' })
        res.json({ group })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Davomat (real-calendar attendance grid) ====

// month = 'YYYY-MM' - generates any missing Lesson rows for that month (clamped to the group's
// active window) then returns the lessons + every student's status per lesson (unmarked if no row exists)
export const getGroupAttendanceGrid = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId }).populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })

        const month = req.query.month || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const rangeStart = new Date(Date.UTC(year, mo - 1, 1))
        const rangeEnd = new Date(Date.UTC(year, mo, 0))

        const lessons = await ensureLessonsGenerated(group, rangeStart, rangeEnd)
        const lessonIds = lessons.map(l => l._id)
        const records = await LessonAttendance.find({ lessonId: { $in: lessonIds } })
        const statusByKey = Object.fromEntries(records.map(r => [`${r.lessonId}_${r.studentId}`, r.status]))

        const students = group.studentIds.map(s => ({
            studentId: s._id, name: s.name, phone: s.phone,
            attendance: lessons.map(l => statusByKey[`${l._id}_${s._id}`] || 'unmarked'),
        }))

        res.json({ lessons: lessons.map(l => ({ _id: l._id, date: l.date, startTime: l.startTime, endTime: l.endTime })), students })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// cycles/sets one cell - autosaves immediately, no separate save step (per the spec)
export const setLessonAttendance = async (req, res) => {
    try {
        const { lessonId, studentId, status } = req.body
        if (!['unmarked', 'present', 'absent', 'late', 'excused'].includes(status)) {
            return res.status(400).json({ error: 'invalid_status' })
        }
        const record = await LessonAttendance.findOneAndUpdate(
            { lessonId, studentId },
            { status },
            { upsert: true, new: true, runValidators: true }
        )
        res.json({ record })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Materials ====

export const listGroupMaterials = async (req, res) => {
    try {
        const materials = await GroupMaterial.find({ groupId: req.params.id }).sort({ createdAt: -1 })
        res.json({ materials })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const addGroupMaterial = async (req, res) => {
    try {
        const { title, url } = req.body
        const material = await GroupMaterial.create({ groupId: req.params.id, title, url, addedBy: req.auth.userId })
        res.status(201).json({ material })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteGroupMaterial = async (req, res) => {
    try {
        await GroupMaterial.findOneAndDelete({ _id: req.params.materialId, groupId: req.params.id })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Extra/makeup lessons ====
// one-off sessions for specific students (e.g. someone who missed a regular class) - see
// ExtraLesson.js for why this is a separate model from Lesson rather than another row on it

export const listExtraLessons = async (req, res) => {
    try {
        const extraLessons = await ExtraLesson.find({ groupId: req.params.id })
            .populate('studentIds', 'name').populate('teacherId', 'name').sort({ date: -1 })
        res.json({ extraLessons })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createExtraLesson = async (req, res) => {
    try {
        const { studentIds, teacherId, date, startTime, endTime, notes } = req.body
        if (!teacherId || !date || !startTime || !endTime) return res.status(400).json({ error: 'missing_fields' })
        if (!studentIds || studentIds.length === 0) return res.status(400).json({ error: 'students_required' })

        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const extraLesson = await ExtraLesson.create({
            groupId: req.params.id, branchId: req.auth.branchId, studentIds, teacherId,
            date: new Date(date), startTime, endTime, notes: notes || '', createdBy: req.auth.userId,
        })
        res.status(201).json({ extraLesson })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteExtraLesson = async (req, res) => {
    try {
        await ExtraLesson.findOneAndDelete({ _id: req.params.extraLessonId, groupId: req.params.id })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Comments ====

export const listGroupComments = async (req, res) => {
    try {
        const comments = await GroupComment.find({ groupId: req.params.id }).sort({ createdAt: -1 }).populate('authorId', 'name')
        res.json({ comments })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const addGroupComment = async (req, res) => {
    try {
        const { text } = req.body
        if (!text?.trim()) return res.status(400).json({ error: 'text_required' })
        const comment = await GroupComment.create({ groupId: req.params.id, authorId: req.auth.userId, text: text.trim() })
        const populated = await comment.populate('authorId', 'name')
        res.status(201).json({ comment: populated })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteGroupComment = async (req, res) => {
    try {
        await GroupComment.findOneAndDelete({ _id: req.params.commentId, groupId: req.params.id })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Exams tab (reuses existing Exam/ExamAttempt data, just scoped to this group's roster+level) ====

export const getGroupExamsTab = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const exam = await Exam.findOne({ levelId: group.levelId })
        const attempts = exam
            ? await ExamAttempt.find({ examId: exam._id, studentId: { $in: group.studentIds } }).sort({ date: -1 }).populate('studentId', 'name')
            : []

        res.json({ exam, attempts })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Timetable (today's lessons across every room, this branch) ====

export const getTodayTimetable = async (req, res) => {
    try {
        const requestedDate = req.query.date ? new Date(req.query.date) : new Date()
        const startOfDay = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate()))
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

        const branchGroups = await Group.find({ branchId: req.auth.branchId, status: 'active' })
            .populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name').populate('roomId', 'name')
        const groupIds = branchGroups.map(g => g._id)

        const lessons = await Lesson.find({ groupId: { $in: groupIds }, date: { $gte: startOfDay, $lt: endOfDay } }).sort({ startTime: 1 })
        const rows = lessons.map(l => {
            const group = branchGroups.find(g => String(g._id) === String(l.groupId))
            return {
                lessonId: l._id, startTime: l.startTime, endTime: l.endTime,
                room: group?.roomId?.name || '—', roomId: group?.roomId?._id || null,
                name: group?.name || null, language: group?.languageId?.name, level: group?.levelId?.name, teacher: group?.teacherId?.name,
                groupId: group?._id,
            }
        })

        const rooms = await Room.find({ branchId: req.auth.branchId }).sort({ name: 1 })

        res.json({ date: startOfDay, rooms, lessons: rows })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
