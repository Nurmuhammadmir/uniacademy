// admin actions are scoped to their own branch (enforced by middleware/auth.js requireRole)
// this file only orchestrates - every business rule call is imported from /services
import bcrypt from "bcrypt"
import crypto from "crypto"
import User from "../models/User.js"
import Group from "../models/Group.js"
import Payment from "../models/Payment.js"
import Pricing from "../models/Pricing.js"
import Exam from "../models/Exam.js"
import ExamAttempt from "../models/ExamAttempt.js"
import Level from "../models/Level.js"
import TeacherAttendanceQR from "../models/TeacherAttendanceQR.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import Attendance from "../models/Attendance.js"
import Settings from "../models/Settings.js"
import TeacherPayRate from "../models/TeacherPayRate.js"
import Expense, { EXPENSE_METHODS } from "../models/Expense.js"
import Lesson from "../models/Lesson.js"
import LessonAttendance from "../models/LessonAttendance.js"
import Room from "../models/Room.js"
import Account from "../models/Account.js"
import LedgerEntry from "../models/LedgerEntry.js"
import AdminNote from "../models/AdminNote.js"
import { ensureLessonsGenerated } from "../services/lessonGenerator.service.js"
import { assertNoScheduleConflict } from "../services/scheduleConflict.service.js"
import { suggestLeastLoadedGroup } from "../services/loadBalance.service.js"
import { enrollStudentMidCycle } from "../services/enrollMidCycle.service.js"
import { computeDayCounter, startDateForTargetDayToday } from "../services/dayCounter.service.js"
import { hardDeleteStudent } from "../services/studentCascade.service.js"
import { hardDeleteGroup } from "../services/groupCascade.service.js"
import { calculateSalaries, getTeacherSalaryDetail } from "../services/salaryCalculation.service.js"
import { getFinanceOverview as getFinanceOverviewService } from "../services/financeOverview.service.js"
import { startOfLocalDay, endOfLocalDay } from "../services/businessTime.service.js"
import { ensureDefaultCategories, ensureCategoryExists, SALARY_CATEGORY, PREPAYMENT_CATEGORY, REFUND_CATEGORY } from "../services/expenseCategories.service.js"
import { computeStudentStatements, computeReconciliation, computeGroupRevenue } from "../services/studentLedger.service.js"
import { earliestLessonTimeOnDate, isLateCheckIn } from "../services/scheduleDays.service.js"
import { computeEffectiveLessonStatuses, computeEffectiveLessonStatus } from "../services/lessonStatus.service.js"
import { computeBusinessLedger } from "../services/businessLedger.service.js"
import { applyDiscountToStudent, deleteDiscountEntry } from "../services/discountApplication.service.js"
import { openMembership, closeMembership } from "../services/groupMembership.service.js"
import { getOrCreateAccount, postTransfer, postEntry, deleteEntries } from "../services/ledger.service.js"
import { recognizeEnrollmentDebt, computeCourseOwed, recomputeEnrollmentStatus, reverseUnusedPeriod } from "../services/billingCycle.service.js"

// api for the teacher profile view, admin version - scoped to admin's own branch. A teacher may
// work in more than one branch (additionalBranchIds), so visibility is membership, not equality -
// the Group lookup below still filters strictly to THIS branch's groups, since that's specifically
// this branch's view of the teacher
export const getTeacherProfile = async (req, res) => {
    try {
        const teacher = await User.findOne({
            _id: req.params.id, role: 'teacher',
            $or: [{ branchId: req.auth.branchId }, { additionalBranchIds: req.auth.branchId }],
        }).select('-passwordHash').lean()
        if (!teacher) return res.status(404).json({ error: 'not_found' })

        const groups = await Group.find({ teacherId: teacher._id, branchId: req.auth.branchId })
            .populate('languageId', 'name')
            .populate('levelId', 'name')
            .lean()

        const activeGroups = groups.filter(g => g.status === 'active' && !g.levelCompletedAt)
        const uniqueStudentIds = new Set()
        activeGroups.forEach(g => g.studentIds.forEach(id => uniqueStudentIds.add(String(id))))

        // real financial history for this teacher - every salary/prepayment payout, newest first,
        // exactly what was asked for: "how much they received, for which month" visible right on
        // their profile
        const account = await getOrCreateAccount('teacher', teacher._id)
        const salaryHistory = await LedgerEntry.find({ accountId: account._id })
            .sort({ date: -1, _id: -1 })
            .lean()

        res.json({
            teacher,
            employedSince: teacher.createdAt,
            activeGroupsCount: activeGroups.length,
            totalStudents: uniqueStudentIds.size,
            groups,
            salaryHistory,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// Davomat-style month grid for ONE teacher, grouped by their own group (a teacher running both an
// odd-day and an even-day group gets two separate date rows, each on its own real lesson dates -
// not one merged/generic row). Each cell is a real Lesson row (generated on demand, same as the
// Group Details Davomat tab) carrying the GROUP's own teacherStatus for that specific lesson -
// this is deliberately separate from TeacherAttendance (branch check-in for the day, not tied to
// any one lesson).
export const getTeacherAttendanceGrid = async (req, res) => {
    try {
        const teacher = await User.findOne({
            _id: req.params.id, role: 'teacher',
            $or: [{ branchId: req.auth.branchId }, { additionalBranchIds: req.auth.branchId }],
        }).select('name').lean()
        if (!teacher) return res.status(404).json({ error: 'not_found' })

        const month = req.query.month || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const rangeStart = new Date(Date.UTC(year, mo - 1, 1))
        const rangeEnd = new Date(Date.UTC(year, mo, 0))

        const groupDocs = await Group.find({ teacherId: teacher._id, status: 'active', levelCompletedAt: null })
            .populate('languageId', 'name').populate('levelId', 'name').lean()

        let conducted = 0, total = 0
        const groups = []
        for (const group of groupDocs) {
            const lessons = await ensureLessonsGenerated(group, rangeStart, rangeEnd)
            const statusByLessonId = await computeEffectiveLessonStatuses(lessons)
            const lessonRows = lessons.map(l => {
                total++
                const teacherStatus = statusByLessonId[String(l._id)]
                if (teacherStatus === 'conducted' || teacherStatus === 'substituted') conducted++
                return {
                    lessonId: l._id, date: l.date.toISOString().slice(0, 10),
                    dayOfWeek: l.date.getUTCDay(), startTime: l.startTime, endTime: l.endTime,
                    teacherStatus, teacherNote: l.teacherNote,
                }
            })
            groups.push({
                groupId: group._id, languageName: group.languageId?.name, levelName: group.levelId?.name,
                lessons: lessonRows,
            })
        }

        res.json({
            teacherName: teacher.name, groups,
            stats: { conducted, total, percent: total > 0 ? Math.round((conducted / total) * 100) : 0 },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// Davomat-style month grid for ONE student, grouped by their own group (a student placed in more
// than one active group - e.g. two groups of the same language - gets a separate date row per
// group, each on THAT group's own real lesson dates). Mirrors getTeacherAttendanceGrid exactly,
// just keyed off this student's own LessonAttendance.status per lesson instead of the lesson's
// teacherStatus - backs the Teachers-panel Attendance tab's "Students attendance" mode.
export const getStudentAttendanceGrid = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, role: 'student', branchId: req.auth.branchId }).select('name').lean()
        if (!student) return res.status(404).json({ error: 'not_found' })

        const month = req.query.month || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const rangeStart = new Date(Date.UTC(year, mo - 1, 1))
        const rangeEnd = new Date(Date.UTC(year, mo, 0))

        const groupDocs = await Group.find({ studentIds: student._id, status: 'active', levelCompletedAt: null })
            .populate('languageId', 'name').populate('levelId', 'name').lean()

        let present = 0, total = 0
        const groups = []
        for (const group of groupDocs) {
            const lessons = await ensureLessonsGenerated(group, rangeStart, rangeEnd)
            const attendanceRows = await LessonAttendance.find({ lessonId: { $in: lessons.map(l => l._id) }, studentId: student._id }).lean()
            const statusByLesson = Object.fromEntries(attendanceRows.map(r => [String(r.lessonId), r.status]))
            const lessonRows = lessons.map(l => {
                total++
                const status = statusByLesson[String(l._id)] || 'unmarked'
                if (status === 'present' || status === 'late') present++
                return {
                    lessonId: l._id, date: l.date.toISOString().slice(0, 10),
                    dayOfWeek: l.date.getUTCDay(), startTime: l.startTime, endTime: l.endTime, status,
                }
            })
            groups.push({ groupId: group._id, languageName: group.languageId?.name, levelName: group.levelId?.name, lessons: lessonRows })
        }

        res.json({
            studentName: student.name, groups,
            stats: { present, total, percent: total > 0 ? Math.round((present / total) * 100) : 0 },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// full detail for ONE real lesson - group/time/room plus every student's attendance for that
// specific lesson, so clicking a date cell can show exactly what happened in that class
export const getLessonDetail = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id).lean()
        if (!lesson) return res.status(404).json({ error: 'not_found' })

        const group = await Group.findOne({ _id: lesson.groupId, branchId: req.auth.branchId })
            .populate('languageId', 'name').populate('levelId', 'name').populate('roomId', 'name').populate('studentIds', 'name phone').lean()
        if (!group) return res.status(404).json({ error: 'not_found' })

        const attendanceRows = await LessonAttendance.find({ lessonId: lesson._id }).lean()
        const statusByStudent = Object.fromEntries(attendanceRows.map(r => [String(r.studentId), r.status]))
        const students = group.studentIds.map(s => ({ studentId: s._id, name: s.name, phone: s.phone, status: statusByStudent[String(s._id)] || 'unmarked' }))

        const substitute = lesson.substituteTeacherId ? await User.findById(lesson.substituteTeacherId).select('name').lean() : null
        const teacherStatus = await computeEffectiveLessonStatus(lesson)

        res.json({
            lesson: {
                lessonId: lesson._id, date: lesson.date.toISOString().slice(0, 10), startTime: lesson.startTime, endTime: lesson.endTime,
                // teacherStatus is the COMPUTED, display-only value (conducted/not_conducted are
                // derived from real attendance, never stored) - isSubstituted reflects the actual
                // stored flag, which is the only part of this an admin can still set/clear
                teacherStatus, isSubstituted: lesson.teacherStatus === 'substituted',
                teacherNote: lesson.teacherNote, substituteTeacherName: substitute?.name || null,
            },
            group: { groupId: group._id, languageName: group.languageId?.name, levelName: group.levelId?.name, roomName: group.roomId?.name || null },
            students,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// admin can no longer assert whether a lesson was conducted or not - that's now always computed
// from real student attendance (see lessonStatus.service.js), so it can't be biased. The ONE thing
// still genuinely a human call is flagging that a substitute taught the class that day (nothing in
// the attendance data could ever tell you that), so this endpoint now only accepts 'substituted'
// (to set it, with substituteTeacherId) or 'unmarked' (to clear a substitution and let the status
// go back to being computed). A note can still be left either way.
export const setLessonTeacherStatus = async (req, res) => {
    try {
        const { teacherStatus, substituteTeacherId, teacherNote } = req.body
        if (!['unmarked', 'substituted'].includes(teacherStatus)) {
            return res.status(400).json({ error: 'invalid_status' })
        }
        const lesson = await Lesson.findById(req.params.id)
        if (!lesson) return res.status(404).json({ error: 'not_found' })

        const group = await Group.findOne({ _id: lesson.groupId, branchId: req.auth.branchId }).lean()
        if (!group) return res.status(404).json({ error: 'not_found' })

        lesson.teacherStatus = teacherStatus
        lesson.substituteTeacherId = teacherStatus === 'substituted' ? (substituteTeacherId || null) : null
        if (teacherNote !== undefined) lesson.teacherNote = teacherNote
        await lesson.save()
        res.json({ lesson })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// same "who checked in today" visibility a teacher already has over their students' attendance,
// just for admin looking at their own branch's teachers - UTC day boundary, matching exactly how
// teacherController.scanOwnAttendance writes the check-in (see that file's comment for why UTC)
export const listBranchTeachers = async (req, res) => {
    try {
        const teachers = await User.find({
            role: 'teacher',
            $or: [{ branchId: req.auth.branchId }, { additionalBranchIds: req.auth.branchId }],
        }).select('name phone')

        const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)
        const checkIns = await TeacherAttendance.find({
            teacherId: { $in: teachers.map(t => t._id) },
            date: { $gte: startOfDay, $lt: endOfDay },
        }).lean()
        const checkInByTeacher = Object.fromEntries(checkIns.map(c => [String(c.teacherId), c.scannedAt]))

        // "on time" is judged against each teacher's own EARLIEST group lesson today, so a teacher
        // with no lesson scheduled today is never flagged late
        const allGroups = await Group.find({ teacherId: { $in: teachers.map(t => t._id) } }).lean()
        const teachersWithAttendance = teachers.map(t => {
            const scannedAt = checkInByTeacher[String(t._id)] || null
            const firstLessonTime = earliestLessonTimeOnDate(allGroups.filter(g => String(g.teacherId) === String(t._id)), startOfDay)
            return {
                ...t.toObject(),
                checkedInToday: !!scannedAt,
                checkedInAt: scannedAt,
                firstLessonTime,
                late: isLateCheckIn(scannedAt, firstLessonTime),
            }
        })

        res.json({ teachers: teachersWithAttendance })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// admin can add/edit teachers for their own branch, but never delete one (confirmed spec) - removing
// a teacher is director-only (directorController.deleteTeacher), since it permanently erases their
// pay-rate history and ledger account; there is deliberately no deleteTeacher exported here and no
// DELETE route wired to it in adminRoute.js. branchId/additionalBranchIds are never accepted from the
// request body - an admin can only ever create/manage a teacher within their own single branch,
// exactly like createStudent already does.
export const createTeacher = async (req, res) => {
    try {
        const { name, phone, password } = req.body
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const teacher = await User.create({ name, phone, passwordHash, role: 'teacher', branchId: req.auth.branchId })
        res.status(201).json({ teacher: { id: teacher._id, name: teacher.name, branchId: teacher.branchId } })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateTeacher = async (req, res) => {
    try {
        const existing = await User.findOne({ _id: req.params.id, role: 'teacher', branchId: req.auth.branchId })
        if (!existing) return res.status(404).json({ error: 'not_found' })

        const { name, phone, password } = req.body
        const update = { name, phone }
        if (password) {
            const salt = await bcrypt.genSalt(10)
            update.passwordHash = await bcrypt.hash(password, salt)
        }
        const teacher = await User.findOneAndUpdate({ _id: req.params.id, role: 'teacher' }, update, { new: true, runValidators: true }).select('-passwordHash')
        res.json({ teacher })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for a full by-date attendance overview scoped to this admin's own branch - a branch-scoped
// mirror of directorController.getAttendanceOverview (which is cross-branch). Complements, not
// replaces, listBranchTeachers' today-only checkedInToday column above.
export const getAttendanceOverview = async (req, res) => {
    try {
        const requestedDate = req.query.date ? new Date(req.query.date) : new Date()
        const startOfDay = new Date(requestedDate); startOfDay.setUTCHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

        const teachers = await User.find({
            role: 'teacher',
            $or: [{ branchId: req.auth.branchId }, { additionalBranchIds: req.auth.branchId }],
        }).select('name phone').lean()
        const teacherCheckIns = await TeacherAttendance.find({
            teacherId: { $in: teachers.map(t => t._id) },
            date: { $gte: startOfDay, $lt: endOfDay },
        }).lean()
        const checkInByTeacher = Object.fromEntries(teacherCheckIns.map(t => [String(t.teacherId), t.scannedAt]))

        // pre-fetch this branch's own groups and match by real ObjectId rather than trying to
        // $match a populated field inside the aggregate below
        const branchGroups = await Group.find({ branchId: req.auth.branchId })
            .populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name').lean()

        const teacherRows = teachers.map(t => {
            const scannedAt = checkInByTeacher[String(t._id)] || null
            const firstLessonTime = earliestLessonTimeOnDate(branchGroups.filter(g => String(g.teacherId?._id || g.teacherId) === String(t._id)), startOfDay)
            return {
                teacherId: t._id, name: t.name, phone: t.phone,
                checkedIn: !!scannedAt, scannedAt,
                firstLessonTime, late: isLateCheckIn(scannedAt, firstLessonTime),
            }
        })
        const groupAttendanceRaw = await Attendance.aggregate([
            { $match: { groupId: { $in: branchGroups.map(g => g._id) }, scannedAt: { $gte: startOfDay, $lt: endOfDay } } },
            { $group: { _id: '$groupId', count: { $sum: 1 } } },
        ])
        const groupRows = groupAttendanceRaw.map(g => {
            const group = branchGroups.find(doc => String(doc._id) === String(g._id))
            return {
                groupId: g._id, language: group?.languageId?.name, level: group?.levelId?.name,
                teacher: group?.teacherId?.name, presentCount: g.count, totalCount: group?.studentIds.length || 0,
            }
        })

        const totalStudents = await User.countDocuments({ role: 'student', branchId: req.auth.branchId })
        const presentCount = groupAttendanceRaw.reduce((sum, g) => sum + g.count, 0)
        const percent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

        res.json({
            date: startOfDay,
            teachers: teacherRows,
            studentAttendance: { count: presentCount, total: totalStudents, percent },
            groups: groupRows,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to create a student record - a first course (languageId, with an optional levelId) can be
// attached right away, or added later via POST /students/:id/courses. If no level is given yet, it
// gets assigned once the student's first payment picks one (or the admin uses "correct level" directly).
// upserts a parent login by phone and links this student as one of their children - a phone
// already registered as a parent just gets this student appended to childStudentIds (siblings
// share one parent login); a brand new phone needs a password to actually create that login.
// Silently no-ops if parentPhone isn't given at all (parent info is optional).
const linkParentToStudent = async (studentId, parentPhone, parentPassword) => {
    if (!parentPhone) return null
    let parent = await User.findOne({ phone: parentPhone, role: 'parent' })
    if (!parent) {
        if (!parentPassword) { const err = new Error('parent_password_required'); err.code = 'parent_password_required'; throw err }
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(parentPassword, salt)
        parent = await User.create({ name: `${parentPhone}'s parent`, phone: parentPhone, passwordHash, role: 'parent', childStudentIds: [studentId] })
    } else {
        if (parentPassword) {
            const salt = await bcrypt.genSalt(10)
            parent.passwordHash = await bcrypt.hash(parentPassword, salt)
        }
        if (!parent.childStudentIds.some(id => String(id) === String(studentId))) parent.childStudentIds.push(studentId)
        await parent.save()
    }
    return parent
}

// groupId is optional - an admin can create a student with no group at all (added later from a
// group's own "add student" flow), or assign one right here. Either path runs through the exact
// same enrollment logic (billingCycle.service.js's recognizeEnrollmentDebt), so a group picked at
// creation time posts its first debt immediately, same as if it had been assigned afterward.
export const createStudent = async (req, res) => {
    try {
        const { name, phone, password, address, dateOfBirth, geo, groupId, passportInfo, parentPhone, parentPassword, registeredAt } = req.body

        const settings = await Settings.findOne({}).lean() || { passportRequired: true }
        if (settings.passportRequired && !passportInfo?.trim()) {
            return res.status(400).json({ error: 'passport_info_required' })
        }
        if (geo?.lat == null || geo?.lng == null) {
            return res.status(400).json({ error: 'location_required' })
        }
        // optional - lets an admin backdate a student who actually joined earlier but is only now
        // being entered into the system, so their real registration date shows correctly instead of
        // "today" everywhere it's displayed. Future dates make no sense for a registration that's
        // happening right now, so those are rejected rather than silently clamped.
        let createdAt
        if (registeredAt) {
            createdAt = new Date(registeredAt)
            if (isNaN(createdAt) || createdAt > new Date()) return res.status(400).json({ error: 'invalid_registration_date' })
        }

        let group = null
        if (groupId) {
            group = await Group.findOne({ _id: groupId, branchId: req.auth.branchId })
            if (!group) return res.status(400).json({ error: 'invalid_group' })
            if (group.studentIds.length >= group.capacity) return res.status(409).json({ error: 'group_full' })
        }

        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const courses = group ? [{ languageId: group.languageId, levelId: group.levelId, groupId: group._id }] : []
        const student = await User.create({
            name, phone, passwordHash, address,
            dateOfBirth: dateOfBirth || null,
            geo: geo || { lat: null, lng: null },
            passportInfo: passportInfo || '',
            courses,
            role: 'student',
            branchId: req.auth.branchId,
            createdByAdminId: req.auth.userId,
            ...(createdAt ? { createdAt } : {}),
        })

        if (group) {
            group.studentIds.push(student._id)
            await group.save()
            await openMembership(student._id, group)
            const level = group.levelId ? await Level.findById(group.levelId).lean() : null
            await enrollStudentMidCycle(student._id, group, level?.durationDays)
            await recognizeEnrollmentDebt(student, student.courses[0], req.auth.userId)
        }

        if (parentPhone) await linkParentToStudent(student._id, parentPhone, parentPassword)
        res.status(201).json({ student })
    } catch (error) {
        if (error.code === 'parent_password_required') return res.status(400).json({ error: 'parent_password_required' })
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student', branchId: req.auth.branchId })
            .select('-passwordHash')
            .populate('courses.languageId', 'name')
            .populate('courses.levelId', 'name order')
            .lean()

        // "how much does each student currently owe" - a direct read of each student's stored
        // Account.balance (one bulk query), instead of replaying/re-deriving anything. This is the
        // app's own default landing page, so this stays a single query no matter how many students.
        // raw signed balance - positive means the student owes that much, negative means they're in
        // credit. The frontend decides how to color/label it; nothing here collapses the sign away.
        const accounts = await Account.find({ ownerType: 'student', ownerId: { $in: students.map(s => s._id) } }).select('ownerId balance').lean()
        const balanceByStudentId = new Map(accounts.map(a => [String(a.ownerId), a.balance]))
        for (const student of students) {
            student.owed = balanceByStudentId.get(String(student._id)) || 0
        }

        res.json({ students })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the full student profile modal - registration date, every course with its price/balance,
// full payment history per course, exam attempt history, and every group they've ever been in.
// Deliberately omits address/geo - only the director is allowed to see a student's home location.
export const getStudentProfile = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId, role: 'student' })
            .select('-passwordHash -address -geo')
            .populate('courses.languageId', 'name')
            .populate('courses.levelId', 'name order')
        if (!student) return res.status(404).json({ error: 'not_found' })

        const account = await getOrCreateAccount('student', student._id)
        const coursesWithPrice = await Promise.all(student.courses.map(async (c) => {
            const group = c.groupId ? await Group.findById(c.groupId).select('price').lean() : null
            const owed = await computeCourseOwed(account._id, c.languageId._id)
            return { ...c.toObject(), price: group?.price ?? null, owed: Math.max(0, owed) }
        }))

        const payments = await Payment.find({ studentId: student._id }).sort({ date: -1 }).populate('adminId', 'name').populate('languageId', 'name').lean()
        const groups = await Group.find({ studentIds: student._id })
            .populate('languageId', 'name')
            .populate('levelId', 'name')
            .populate('teacherId', 'name')
            .lean()
        res.json({
            student,
            courses: coursesWithPrice,
            payments,
            accountBalance: account.balance,
            // net of refunds - refunded:true always means 0, even for legacy rows recorded before
            // refundedAmount existed (theirs stayed 0 and was never backfilled)
            totalPaid: payments.reduce((sum, p) => sum + (p.refunded ? 0 : p.amount - (p.refundedAmount || 0)), 0),
            groups,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateStudent = async (req, res) => {
    try {
        const { name, phone, password, address, dateOfBirth, geo, passportInfo, notes } = req.body
        const update = { name, phone, address, geo }
        if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth || null
        if (passportInfo !== undefined) update.passportInfo = passportInfo
        if (notes !== undefined) update.notes = notes
        if (password) {
            const salt = await bcrypt.genSalt(10)
            update.passwordHash = await bcrypt.hash(password, salt)
        }
        const student = await User.findOneAndUpdate(
            { _id: req.params.id, branchId: req.auth.branchId },
            update,
            { new: true, runValidators: true }
        ).select('-passwordHash')
        if (!student) return res.status(404).json({ error: 'not_found' })
        res.json({ student })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to add/change which parent login can see this student - usable both right after creation and
// later from the student's profile page (e.g. a parent's number changed, or one wasn't set up yet)
export const linkParent = async (req, res) => {
    try {
        const { parentPhone, parentPassword } = req.body
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId, role: 'student' }).lean()
        if (!student) return res.status(404).json({ error: 'not_found' })
        if (!parentPhone) return res.status(400).json({ error: 'parent_phone_required' })

        const parent = await linkParentToStudent(student._id, parentPhone, parentPassword)
        res.json({ parent: { id: parent._id, phone: parent.phone } })
    } catch (error) {
        if (error.code === 'parent_password_required') return res.status(400).json({ error: 'parent_password_required' })
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// applies a discount RIGHT NOW (confirmed spec - see discountApplication.service.js for exactly what
// gets posted) to every student the given scope resolves to:
//   - scope 'students': the exact studentIds given (the existing multi-select-from-the-list flow)
//   - scope 'group': every student currently in ANY of the given groups (multi-select, confirmed -
//     the admin can discount several groups in one action, each priced off its own group.price)
//   - scope 'course': every student currently enrolled in one course (languageId), branch-wide
// Each resolved student is independent - one missing enrollment or zero-priced course just skips
// that student (applyDiscountToStudent returns null) rather than failing the whole batch.
export const applyDiscount = async (req, res) => {
    try {
        const { scope, studentIds, groupIds, languageId: languageIdRaw, type, value } = req.body
        if (!['students', 'group', 'course'].includes(scope)) return res.status(400).json({ error: 'invalid_scope' })
        if (!['percent', 'amount'].includes(type) || !(value > 0)) return res.status(400).json({ error: 'invalid_discount' })

        let targets = [] // [{ student, languageId }]
        if (scope === 'students') {
            if (!Array.isArray(studentIds) || studentIds.length === 0 || !languageIdRaw) return res.status(400).json({ error: 'missing_fields' })
            const students = await User.find({ _id: { $in: studentIds }, branchId: req.auth.branchId, role: 'student' })
            targets = students.map(student => ({ student, languageId: languageIdRaw }))
        } else if (scope === 'group') {
            if (!Array.isArray(groupIds) || groupIds.length === 0) return res.status(400).json({ error: 'missing_fields' })
            const groupsFound = await Group.find({ _id: { $in: groupIds }, branchId: req.auth.branchId }).lean()
            for (const group of groupsFound) {
                const students = await User.find({ _id: { $in: group.studentIds }, role: 'student' })
                targets.push(...students.map(student => ({ student, languageId: group.languageId })))
            }
        } else {
            if (!languageIdRaw) return res.status(400).json({ error: 'missing_fields' })
            const students = await User.find({ branchId: req.auth.branchId, role: 'student', 'courses.languageId': languageIdRaw })
            targets = students.map(student => ({ student, languageId: languageIdRaw }))
        }

        let appliedCount = 0
        let totalAmount = 0
        for (const { student, languageId } of targets) {
            const result = await applyDiscountToStudent({ branchId: req.auth.branchId, student, languageId, type, value, userId: req.auth.userId })
            if (result) { appliedCount++; totalAmount += result.amount }
        }

        res.status(201).json({ appliedCount, skippedCount: targets.length - appliedCount, totalAmount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// undoes one previously-applied discount - the student's balance/debt returns to exactly what it
// was before, verified via the branch scope (an admin can only ever reverse a discount that
// actually belongs to one of their own branch's students)
export const deleteDiscount = async (req, res) => {
    try {
        const entry = await LedgerEntry.findById(req.params.id).lean()
        if (!entry || entry.kind !== 'discount') return res.status(404).json({ error: 'not_found' })
        const student = await User.findOne({ _id: entry.studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        await deleteDiscountEntry(req.params.id)
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// freeze/unfreeze a student's WHOLE account - for when they can't come for a while (e.g. travelling
// abroad). Pauses billing only (confirmed: whole-account, not per-course, not per-group): the daily
// billing-cycle job skips every one of a frozen student's courses, so no new debt accrues anywhere
// on their account while frozen - whatever's already on their balance just sits there instead of
// being consumed by a period they were never billed for. Attendance/homework are completely
// untouched - they're driven by Group.schedulePattern/dayCounter, an entirely separate system.
// Toggled from the student's profile.
export const setStudentFreeze = async (req, res) => {
    try {
        const { frozen, reason } = req.body
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        student.frozen = !!frozen
        student.frozenAt = frozen ? new Date() : null
        student.frozenReason = frozen ? (reason || '') : ''
        await student.save()

        res.json({ student })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// read-only view of course prices for the admin app's new Courses & Pricing section - prices are
// still director-only to SET (directorController.js's upsertPricing/deletePricing), this just lets
// admin see what's been configured, since group creation now needs a price to already exist.
export const listPricingForAdmin = async (req, res) => {
    try {
        const pricing = await Pricing.find({}).populate({ path: 'languageId', select: 'name code categoryIds', populate: { path: 'categoryIds', select: 'name' } }).lean()
        pricing.sort((a, b) => (a.languageId?.name || '').localeCompare(b.languageId?.name || ''))
        res.json({ pricing })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// archives a student rather than hard-deleting them - their payment/course/exam history stays
// intact (a hard delete would orphan every Payment/CoursePeriod row referencing them), they just
// stop showing in the active roster and can no longer log in. Reversible via unarchiveStudent.
export const deleteStudent = async (req, res) => {
    try {
        const student = await User.findOneAndUpdate(
            { _id: req.params.id, branchId: req.auth.branchId, role: 'student' },
            { status: 'archived' },
            { new: true }
        )
        if (!student) return res.status(404).json({ error: 'not_found' })
        res.json({ student })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// genuine, permanent delete - unlike deleteStudent above (which only archives), this actually
// erases the student and every record referencing them (payments, attendance, exam history,
// homework progress, group membership, parent links). Irreversible - the frontend gates this
// behind its own explicit warning confirm before ever calling it.
export const permanentlyDeleteStudent = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId, role: 'student' }).lean()
        if (!student) return res.status(404).json({ error: 'not_found' })
        await hardDeleteStudent(student._id)
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to bring an archived student back to active (undoes an accidental archive)
export const unarchiveStudent = async (req, res) => {
    try {
        const student = await User.findOneAndUpdate(
            { _id: req.params.id, branchId: req.auth.branchId, role: 'student' },
            { status: 'active' },
            { new: true }
        )
        if (!student) return res.status(404).json({ error: 'not_found' })
        res.json({ student })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to record a payment - confirmed spec: a payment is NEVER for one particular course, it's a
// deposit into the student's ONE shared wallet (their overall Account.balance). Posts a real ledger
// transaction (student account decreases, branch account increases); no languageId/groupId/teacherId
// is attached to it at all. Which course(s) that money actually ends up settling - and therefore
// which teacher's revenue share it feeds - is decided entirely afterwards, by
// billingCycle.service.js's account-wide FIFO walk (computeCourseOwed/computeCoveredDebtPeriodsBatch)
// applying the account's total cash oldest-debt-first across EVERY course, not by anything recorded
// here. This also means there's no more "pay for a different level, which re-assigns the course" side
// effect a course-scoped payment used to have - switching a student's level/course now only ever
// happens by moving them to a different group.
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'click', 'payme']

export const createPayment = async (req, res) => {
    try {
        const { studentId, amount, method, date } = req.body
        if (!PAYMENT_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_payment_method' })
        if (!(amount > 0)) return res.status(400).json({ error: 'invalid_amount' })

        const student = await User.findOne({ _id: studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        // optional - lets an admin record a payment that was actually received on an earlier date
        // (e.g. entering yesterday's cash payments this morning) without skewing "today"'s figures.
        const paymentDate = date ? new Date(date) : new Date()
        const payment = await Payment.create({
            studentId, amount, method, date: paymentDate, adminId: req.auth.userId, branchId: req.auth.branchId,
        })

        const studentAccount = await getOrCreateAccount('student', studentId)
        const branchAccount = await getOrCreateAccount('branch', req.auth.branchId)
        const [studentEntry] = await postTransfer({
            fromAccountId: studentAccount._id, toAccountId: branchAccount._id,
            amount, kind: 'payment', method,
            meta: { studentId, sourceType: 'payment', sourceId: payment._id },
            description: `Payment received - ${amount.toLocaleString()} via ${method}`,
            createdBy: req.auth.userId, date: paymentDate,
        }) || []
        if (studentEntry) { payment.ledgerTransactionId = studentEntry.transactionId; await payment.save({ validateModifiedOnly: true }) }

        await recomputeEnrollmentStatus(student)
        await student.save()

        res.status(201).json({ payment, accountBalance: studentAccount.balance })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// the "лицевой счёт" (Statement) page - every course a student has, each as its own chronological
// Debit/Credit ledger with a running balance, computed fresh from real Payment documents (see
// studentLedger.service.js for why this needs no migration and can't drift from the live billing math)
export const getStudentStatement = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId }).lean()
        if (!student) return res.status(404).json({ error: 'not_found' })
        const result = await computeStudentStatements(req.params.id)
        res.json(result)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// the "Акт сверки" (reconciliation) report - opening/charges/payments/closing balance for a date
// range, scoped to one student, one group's roster, or the whole branch
export const getReconciliation = async (req, res) => {
    try {
        const { scope, studentId, groupId, dateFrom, dateTo } = req.query
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const from = startOfLocalDay(dateFrom)
        const to = endOfLocalDay(dateTo)

        let studentIds = []
        let groupRevenue = null
        if (scope === 'student') {
            if (!studentId) return res.status(400).json({ error: 'student_required' })
            const student = await User.findOne({ _id: studentId, branchId: req.auth.branchId }).select('_id').lean()
            if (!student) return res.status(404).json({ error: 'not_found' })
            studentIds = [student._id]
        } else if (scope === 'group') {
            if (!groupId) return res.status(400).json({ error: 'group_required' })
            const group = await Group.findOne({ _id: groupId, branchId: req.auth.branchId }).select('studentIds teacherId').lean()
            if (!group) return res.status(404).json({ error: 'not_found' })
            studentIds = group.studentIds

            // "where does this group's money go" - Credits collected (computeGroupRevenue) alongside
            // the teacher's actual computed salary for the same period as context (see
            // computeGroupRevenue's own comment for why it can't be split precisely per-group for
            // every rate type)
            groupRevenue = await computeGroupRevenue(groupId, from, to)
            if (groupRevenue?.teacherId) {
                const rates = await TeacherPayRate.find({ branchId: req.auth.branchId }).lean()
                const salaryResults = await calculateSalaries(req.auth.branchId, rates, from, to)
                groupRevenue.teacherSalary = salaryResults.find(r => String(r.teacherId) === String(groupRevenue.teacherId)) || null
            }
        } else if (scope === 'branch') {
            const students = await User.find({ branchId: req.auth.branchId, role: 'student' }).select('_id').lean()
            studentIds = students.map(s => s._id)
        } else {
            return res.status(400).json({ error: 'invalid_scope' })
        }

        const result = await computeReconciliation(studentIds, from, to)
        res.json({ ...result, groupRevenue })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// the accounting Ledger page's main "all financial operations" view - every Payment received and
// every Expense paid out (rent, marketing, salary, refunds, everything), merged into one
// chronological timeline with a running balance, for the whole branch - not scoped to any one
// student. Answers "where did every unit of money in this business's account come from and go to".
export const getBusinessLedger = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })
        const result = await computeBusinessLedger(req.auth.branchId, startOfLocalDay(dateFrom), endOfLocalDay(dateTo))
        res.json(result)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// full single-payment detail (every field, fully populated) backing the Finance page's "click a
// transaction row" page - unlike listPayments/getFinanceOverview (list-shaped, trimmed fields),
// this exposes everything about one specific payment: refund audit trail, attribution snapshot,
// the exact course-coverage date it produced, etc.
export const getPaymentDetail = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate('studentId', 'name phone branchId')
            .populate('languageId', 'name')
            .populate('levelId', 'name')
            .populate('groupId', 'schedulePattern time name price')
            .populate('teacherId', 'name')
            .populate('adminId', 'name')
            .populate('refundedBy', 'name')
            .lean()
        if (!payment) return res.status(404).json({ error: 'not_found' })
        // Payment carries its own branchId as of the attribution rework, but older rows predate that
        // field - same student-branch fallback getFinanceOverview already relies on for this reason
        const branchId = payment.branchId || payment.studentId?.branchId
        if (String(branchId) !== String(req.auth.branchId)) return res.status(404).json({ error: 'not_found' })
        res.json({ payment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api backing the Finance "Barcha to'lovlar" (All Payments) page - filterable/sortable/paginated,
// plus a monthly-bucketed total series for the chart and the two summary numbers. Payments carry
// their own branchId as of the enrollment-restructure phase, but older rows predate that field, so
// branch attribution falls back to "this branch's students" for any payment missing it - same
// fallback every branch/revenue read used before branchId existed on Payment at all.
export const getFinanceOverview = async (req, res) => {
    try {
        const result = await getFinanceOverviewService(req.auth.branchId, req.query)
        res.json(result)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// marks (part of) a payment as refunded rather than hard-deleting it, so the ledger keeps an
// honest, auditable record of what was actually given back and by whom. `amount` is optional - a
// specific amount refunds only that much (partial refund); omitting it refunds whatever remains.
// Posts a REVERSING ledger transaction (student account increases - their debt comes back - branch
// account decreases) rather than replaying anything; the original payment's entries stay untouched
// and immutable, this is a new, separate transaction that nets them out.
export const refundPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })

        // rows refunded before refundedAmount existed have refunded:true but refundedAmount:0 - treat
        // that combination as "fully refunded" (what refunded:true always meant back then) rather
        // than letting a stale refundedAmount of 0 imply the whole amount is still refundable
        const remaining = payment.refunded ? 0 : payment.amount - payment.refundedAmount
        if (remaining <= 0) return res.status(400).json({ error: 'already_refunded' })

        const refundAmount = req.body.amount !== undefined ? Number(req.body.amount) : remaining
        if (!(refundAmount > 0) || refundAmount > remaining) return res.status(400).json({ error: 'invalid_refund_amount' })

        payment.refundedAmount += refundAmount
        payment.refunded = payment.refundedAmount >= payment.amount
        payment.refundedAt = new Date()
        payment.refundedBy = req.auth.userId
        await payment.save({ validateModifiedOnly: true })

        const studentAccount = await getOrCreateAccount('student', payment.studentId)
        const branchAccount = await getOrCreateAccount('branch', req.auth.branchId)
        await postTransfer({
            fromAccountId: branchAccount._id, toAccountId: studentAccount._id,
            fromDirection: 'decrease', toDirection: 'increase',
            amount: refundAmount, kind: 'refund', method: payment.method,
            meta: { studentId: payment.studentId, groupId: payment.groupId, languageId: payment.languageId, levelId: payment.levelId, teacherId: payment.teacherId, sourceType: 'payment', sourceId: payment._id },
            description: `Refund of payment ${payment._id} - ${refundAmount.toLocaleString()}`,
            createdBy: req.auth.userId, date: new Date(),
        })

        const student = await User.findById(payment.studentId)
        if (student) { await recomputeEnrollmentStatus(student); await student.save() }

        // the original payment still counts as gross revenue (it happened) - the refund is booked
        // as its own expense instead of retroactively shrinking that revenue figure, so "Total
        // payments" always reads as real money received and "Net profit" is what's left after every
        // real cost (salaries, rent, refunds, ...) is subtracted, not a silently-adjusted revenue line
        await ensureDefaultCategories(req.auth.branchId)
        await ensureCategoryExists(req.auth.branchId, REFUND_CATEGORY, '#C0392B')
        const expense = await Expense.create({
            branchId: req.auth.branchId, category: REFUND_CATEGORY, amount: refundAmount,
            name: `Refund - ${student?.name || 'student'}`, recipient: student?.name || '',
            method: payment.method || 'cash', date: new Date(), createdBy: req.auth.userId,
            refundOfPaymentId: payment._id,
        })
        // this Expense is a bookkeeping record only (matches every other expense) - it does NOT post
        // a second branch decrease of its own, since the ledger transaction above already moved that
        // money out of the branch account. Its own ledgerTransactionId is left null on purpose.
        void expense

        res.json({ payment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// permanently erases a Payment - confirmed product decision: this must leave no trace in the ledger
// at all, not a reversing entry sitting alongside the original forever. deleteEntries walks back
// every ledger entry this payment (its original transfer, any later correction from updatePayment,
// any refund taken against it) ever posted and removes them, so both the student's and the branch's
// balances end up exactly as if this payment never existed.
export const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })
        const student = await User.findOne({ _id: payment.studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        await deleteEntries({ sourceType: 'payment', sourceId: payment._id })
        // any refund taken against this payment gets its own bookkeeping Expense (see refundPayment) -
        // that cost only ever existed because this payment did, so it goes with it
        await Expense.deleteMany({ refundOfPaymentId: payment._id })

        await recomputeEnrollmentStatus(student)
        await student.save()

        await payment.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to correct a mis-entered payment - amount and/or method only. Date is intentionally NOT
// editable here (changing it would reorder which billing chunk it logically belongs to) - to move a
// payment to a different date, refund it and record a fresh one instead. Posts a small ADJUSTING
// ledger transaction for just the delta on an amount change, and updates the method directly on the
// existing ledger entries (a pure metadata correction - doesn't touch any balance).
export const updatePayment = async (req, res) => {
    try {
        const { amount, method } = req.body
        const payment = await Payment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })
        if (payment.refundedAmount > 0) return res.status(400).json({ error: 'already_refunded' })

        if (amount !== undefined && Number(amount) !== payment.amount) {
            const delta = Number(amount) - payment.amount
            const studentAccount = await getOrCreateAccount('student', payment.studentId)
            const branchAccount = await getOrCreateAccount('branch', req.auth.branchId)
            if (delta > 0) {
                await postTransfer({
                    fromAccountId: studentAccount._id, toAccountId: branchAccount._id,
                    amount: delta, kind: 'payment', method: payment.method,
                    meta: { studentId: payment.studentId, groupId: payment.groupId, languageId: payment.languageId, levelId: payment.levelId, teacherId: payment.teacherId, sourceType: 'payment', sourceId: payment._id },
                    description: `Correction to payment ${payment._id} - increased by ${delta.toLocaleString()}`,
                    createdBy: req.auth.userId, date: new Date(),
                })
            } else {
                await postTransfer({
                    fromAccountId: branchAccount._id, toAccountId: studentAccount._id,
                    fromDirection: 'decrease', toDirection: 'increase',
                    amount: -delta, kind: 'payment', method: payment.method,
                    meta: { studentId: payment.studentId, groupId: payment.groupId, languageId: payment.languageId, levelId: payment.levelId, teacherId: payment.teacherId, sourceType: 'payment', sourceId: payment._id },
                    description: `Correction to payment ${payment._id} - decreased by ${(-delta).toLocaleString()}`,
                    createdBy: req.auth.userId, date: new Date(),
                })
            }
            payment.amount = Number(amount)
            const student = await User.findOne({ _id: payment.studentId })
            if (student) { await recomputeEnrollmentStatus(student); await student.save() }
        }
        if (method !== undefined && method !== payment.method) {
            if (!PAYMENT_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_payment_method' })
            if (payment.ledgerTransactionId) await LedgerEntry.updateMany({ transactionId: payment.ledgerTransactionId }, { method })
            payment.method = method
        }
        await payment.save({ validateModifiedOnly: true })

        res.json({ payment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// startDate/endDate are now the group's real billing window (freely chosen, no day-of-month
// constraint - a course can be as short as 15 days), so endDate is required. price is looked up
// from Pricing (director-set, per COURSE - not per-level, see Pricing.js) ONCE and locked onto the
// group at creation - a later director price change never silently reprices a group that's already
// running, matching how Payment already snapshots teacherId/groupId at creation time. levelId is
// only required when the course actually HAS at least one level defined - a course can legitimately
// have zero levels (a flat course with no sub-divisions), in which case its groups have no level either.
export const createGroup = async (req, res) => {
    try {
        const { name, languageId, levelId, teacherId, schedulePattern, customDays, time, durationMinutes, startDate, endDate, capacity, roomId } = req.body
        if (!endDate) return res.status(400).json({ error: 'end_date_required' })
        // caught here, not just left to silently mean "this group can never bill anyone" - endDate is
        // the billing-cycle job's own stop condition (see recognizeNextPeriod), so an end date on or
        // before the start date isn't a valid "very short course", it's a group that's already over
        // before it begins and will never recognize a single day of debt for any student added to it
        if (new Date(endDate) <= new Date(startDate)) return res.status(400).json({ error: 'end_date_before_start_date' })
        await assertNoScheduleConflict({ teacherId, roomId, schedulePattern, customDays, time, durationMinutes })

        const courseHasLevels = await Level.exists({ languageId })
        if (courseHasLevels && !levelId) return res.status(400).json({ error: 'level_required' })

        const pricing = await Pricing.findOne({ languageId }).lean()
        if (!pricing) return res.status(400).json({ error: 'no_pricing_set' })

        const level = levelId ? await Level.findById(levelId).select('durationDays').lean() : null
        const group = await Group.create({
            branchId: req.auth.branchId, name: name || '',
            languageId, levelId: levelId || null, teacherId, schedulePattern, customDays, time, durationMinutes, startDate, endDate, roomId,
            capacity: capacity || 20,
            price: pricing.monthlyPrice,
            dayCounter: computeDayCounter({ startDate, schedulePattern, customDays }, level?.durationDays || 30),
        })
        res.status(201).json({ group })
    } catch (error) {
        if (error.code === 'teacher_schedule_conflict' || error.code === 'room_schedule_conflict') return res.status(409).json({ error: error.code })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listGroups = async (req, res) => {
    try {
        const groups = await Group.find({ branchId: req.auth.branchId })
            .populate('languageId', 'name code')
            .populate('levelId', 'name order durationDays')
            .populate('teacherId', 'name')
            .populate('roomId', 'name')
        const withFreshDay = groups.map(g => ({ ...g.toObject(), dayCounter: computeDayCounter(g, g.levelId?.durationDays || 30) }))
        res.json({ groups: withFreshDay })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getGroupProfile = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
            .populate('languageId', 'name')
            .populate('levelId', 'name durationDays')
            .populate('teacherId', 'name phone')
            .populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })
        res.json({ group: { ...group.toObject(), dayCounter: computeDayCounter(group, group.levelId?.durationDays || 30) } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateGroup = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const { name, teacherId, schedulePattern, customDays, time, durationMinutes, capacity, day, roomId, startDate, endDate } = req.body
        const nextTeacherId = teacherId || group.teacherId
        const nextSchedule = schedulePattern || group.schedulePattern
        const nextCustomDays = customDays !== undefined ? customDays : group.customDays
        const nextTime = time || group.time
        const nextDuration = durationMinutes || group.durationMinutes
        const nextRoomId = roomId !== undefined ? (roomId || null) : group.roomId

        const scheduleChanged = String(nextTeacherId) !== String(group.teacherId) || nextSchedule !== group.schedulePattern ||
            nextTime !== group.time || nextDuration !== group.durationMinutes || String(nextRoomId) !== String(group.roomId)
        if (scheduleChanged) {
            await assertNoScheduleConflict({
                teacherId: nextTeacherId, roomId: nextRoomId, schedulePattern: nextSchedule,
                customDays: nextCustomDays, time: nextTime, durationMinutes: nextDuration, excludeGroupId: group._id,
            })
        }

        if (name !== undefined) group.name = name
        group.teacherId = nextTeacherId
        group.schedulePattern = nextSchedule
        group.customDays = nextCustomDays
        group.time = nextTime
        group.durationMinutes = nextDuration
        if (capacity) group.capacity = capacity
        group.roomId = nextRoomId
        if (startDate !== undefined) group.startDate = startDate
        // endDate is required (drives the billing-cycle stop condition - see billingCycle.service.js)
        // so an edit can only ever move it, never clear it back to null
        if (endDate) group.endDate = endDate
        // same guard as createGroup - checked against the EFFECTIVE dates after this update applies,
        // since a request might only touch one of the two fields
        if (new Date(group.endDate) <= new Date(group.startDate)) return res.status(400).json({ error: 'end_date_before_start_date' })

        const level = await Level.findById(group.levelId).select('durationDays').lean()
        const durationDays = level?.durationDays || 30

        // the group's day counter is never stored as its own source of truth - it's always
        // recomputed from `startDate` (see dayCounter.service.computeDayCounter), so "editing the
        // day" really means back-dating startDate so that TODAY computes out to the requested day.
        // Lesson-day aware: walks backward counting only this group's own scheduled weekdays (see
        // startDateForTargetDayToday), not raw calendar days, now that non-lesson days don't count.
        if (day !== undefined && day !== null && day !== '') {
            const targetDay = Math.min(Math.max(1, Number(day)), durationDays)
            group.startDate = startDateForTargetDayToday(group, targetDay)
        }

        await group.save()

        res.json({ group: { ...group.toObject(), dayCounter: computeDayCounter(group, durationDays) } })
    } catch (error) {
        if (error.code === 'teacher_schedule_conflict' || error.code === 'room_schedule_conflict') return res.status(409).json({ error: error.code })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findOneAndUpdate(
            { _id: req.params.id, branchId: req.auth.branchId },
            { status: 'archived' },
            { new: true }
        )
        if (!group) return res.status(404).json({ error: 'not_found' })
        res.json({ group })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const permanentlyDeleteGroup = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId }).lean()
        if (!group) return res.status(404).json({ error: 'not_found' })
        await hardDeleteGroup(group._id)
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to bring an archived group back to active (undoes an accidental archive)
export const unarchiveGroup = async (req, res) => {
    try {
        const group = await Group.findOneAndUpdate(
            { _id: req.params.id, branchId: req.auth.branchId },
            { status: 'active' },
            { new: true }
        )
        if (!group) return res.status(404).json({ error: 'not_found' })
        res.json({ group })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const removeStudentFromGroup = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        group.studentIds = group.studentIds.filter(id => String(id) !== req.params.studentId)
        // confirmed spec: the system never auto-changes a group's status, ever - an empty group
        // stays exactly 'active' (or whatever it already was) until an admin explicitly archives it.
        // This does mean an emptied-out group keeps its teacher+schedule+time slot reserved
        // (scheduleConflict.service.js) until someone archives it - that's the deliberate tradeoff:
        // manual control over "is this group actually done" always wins over an automatic guess.
        await group.save()
        await closeMembership(req.params.studentId, group._id)

        // the student's OWN course entry must stop pointing at this group too - the daily billing
        // job (billingCycle.service.js) only ever looks at course.groupId, never at whether the
        // student is still actually in this group's own studentIds. Without this, a removed
        // student keeps getting billed for this group's price every month forever - being taken
        // out of the roster had literally no effect on their own billing. Balance/history is
        // untouched (whatever they already owed for this course stays exactly as it was); this
        // just stops the course from being tied to a group they're no longer part of, the same
        // "taking a course, not currently placed in a group" state a fresh enrollment starts in.
        const student = await User.findById(req.params.studentId)
        const course = student?.courses.find(c => String(c.groupId) === String(group._id))
        if (course) {
            // confirmed spec: removing a student mid-period returns the unused days of whatever
            // billing period is currently in progress back to their balance, rather than keeping the
            // full period as if they'd stayed through the end of it - see billingCycle.service.js's
            // reverseUnusedPeriod for exactly how that's prorated (and why it correctly shrinks the
            // teacher's revenue share for those days too, unlike a discount).
            await reverseUnusedPeriod(student, course, group, req.auth.userId)

            // a course that was never actually billed (removed the same day they were added, or a
            // mistaken add) leaves nothing worth keeping - just drop the entry entirely instead of a
            // permanent "unpaid, no price, no group" ghost row that clutters the profile forever.
            // One that DOES have real ledger history stays (groupId cleared, same as before) so the
            // admin can still see what this student was ever billed for that course.
            const studentAccount = await getOrCreateAccount('student', student._id)
            const hasHistory = await LedgerEntry.exists({ accountId: studentAccount._id, languageId: course.languageId })
            if (hasHistory) course.groupId = null
            else student.courses = student.courses.filter(c => c._id.toString() !== course._id.toString())
            // this course no longer participates in the pooled active/inactive flip (its groupId is
            // gone, so recomputeEnrollmentStatus's own loop already skips it going forward) - but
            // every course this student is STILL actually placed in deserves a fresh read of the
            // account's current overall balance too, not a status left over from before this removal
            await recomputeEnrollmentStatus(student)
            await student.save()
        }

        res.json({ group })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const suggestGroup = async (req, res) => {
    try {
        const { languageId, levelId } = req.query
        const suggestion = await suggestLeastLoadedGroup(req.auth.branchId, languageId, levelId || null)
        res.json({ suggestion })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to add a student into a group - no payment gate anymore (the old "must already be active/paid
// for this exact language+level" rule is gone): the student joins immediately, their course for this
// language starts 'inactive', and the group's price posts as a debt right away (see
// billingCycle.service.js's recognizeEnrollmentDebt) - "add now, debt now, active once paid" instead
// of "must already be paid to even join". A student may be in several active groups at once, even of
// the same language (e.g. two English groups) - the only real restriction is not joining the exact
// same group twice.
export const addStudentToGroup = async (req, res) => {
    try {
        const { studentId } = req.body
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        if (group.studentIds.some(id => String(id) === String(studentId))) {
            return res.status(409).json({ error: 'already_in_this_group' })
        }
        if (group.studentIds.length >= group.capacity) {
            return res.status(409).json({ error: 'group_full' })
        }

        const student = await User.findOne({ _id: studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        group.studentIds.push(studentId)
        await group.save()
        await openMembership(studentId, group)
        const level = await Level.findById(group.levelId).select('durationDays').lean()
        await enrollStudentMidCycle(studentId, group, level?.durationDays || 30)

        let course = student.courses.find(c => String(c.languageId) === String(group.languageId))
        if (course) { course.groupId = group._id; course.levelId = group.levelId }
        else { student.courses.push({ languageId: group.languageId, levelId: group.levelId, groupId: group._id }); course = student.courses[student.courses.length - 1] }
        // save now, not only as a side effect of recognizeEnrollmentDebt below - that call is a no-op
        // (returns without saving anything) whenever the group's billing window has already ended or
        // the student is frozen, which would otherwise silently drop this course assignment entirely:
        // the student would show up in the group's own roster (group.studentIds, saved above) but their
        // own profile would have no matching course entry at all.
        await student.save()
        await recognizeEnrollmentDebt(student, course, req.auth.userId)

        res.json({ group })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for a manual admin-entered retake or level correction. This is the ONLY place a student's
// course level changes based on an exam score - the automatic self-service exam (studentController
// .submitExam) only ever records a score and never touches group/level, since the whole group
// advances together at the end of the level regardless of individual results (see
// groupPromotion.service.js). An admin uses this after reviewing a student's ExamAttempt history
// to move them to a different level than their cohort - passing updates their course level;
// payment is never touched either way.
export const retakeExam = async (req, res) => {
    try {
        const { id: examId, studentId } = req.params
        const { score } = req.body

        const exam = await Exam.findById(examId).lean()
        if (!exam) return res.status(404).json({ error: 'not_found' })

        const student = await User.findById(studentId)
        if (!student) return res.status(404).json({ error: 'not_found' })

        const attemptCount = await ExamAttempt.countDocuments({ studentId, examId })
        const passed = score >= exam.passScore
        const attempt = await ExamAttempt.create({ studentId, examId, score, passed, attemptNumber: attemptCount + 1, source: 'admin_retake' })

        const courseEntry = student.courses.find(c => String(c.languageId) === String(exam.languageId))
        let outcome = passed ? 'course_completed' : 'failed_final'

        if (passed) {
            const currentLevel = await Level.findById(exam.levelId).lean()
            const nextLevel = currentLevel
                ? await Level.findOne({ languageId: exam.languageId, order: { $gt: currentLevel.order } }).sort({ order: 1 }).lean()
                : null
            if (nextLevel && courseEntry) {
                courseEntry.levelId = nextLevel._id
                await student.save()
                outcome = 'promoted_manual'
            }
        }

        res.json({ attempt, outcome })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the admin's own profile screen
export const getMe = async (req, res) => {
    try {
        const admin = await User.findById(req.auth.userId).select('-passwordHash').populate('branchId', 'name').lean()
        if (!admin) return res.status(404).json({ error: 'not_found' })

        const studentCount = await User.countDocuments({ role: 'student', branchId: req.auth.branchId })
        const activeGroupCount = await Group.countDocuments({ branchId: req.auth.branchId, status: 'active' })

        res.json({ admin, studentCount, activeGroupCount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to generate a fresh, short-lived (2 min) teacher check-in QR for this branch - any teacher
// who scans it before it expires gets marked present for today under their own identity. Meant to
// be called repeatedly by the admin app's live display (every ~90s) rather than once - a code that
// never expired could be photographed and reused to check in at any time of day.
export const createTeacherAttendanceQR = async (req, res) => {
    try {
        const token = crypto.randomBytes(16).toString('hex')
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000)
        const qr = await TeacherAttendanceQR.create({ branchId: req.auth.branchId, token, expiresAt })
        res.status(201).json({ qr })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to list this branch's recent check-in QR codes - kept for reference, no longer used by the
// live-display flow (which reads createTeacherAttendanceQR's own response directly)
export const listTeacherAttendanceQRs = async (req, res) => {
    try {
        const qrs = await TeacherAttendanceQR.find({ branchId: req.auth.branchId }).sort({ createdAt: -1 }).lean()
        res.json({ qrs })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Salary ("Ish haqi") ====

// lists this branch's pay rates - one row with teacherId:null (the branch default, if configured)
// plus any per-teacher overrides
// runs the calculation fresh every time (nothing persisted until "Pay"/"Prepay" is clicked) - see
// salaryCalculation.service.js for exactly how each rate type is applied, and for how paidAmount/
// remaining are derived from real Salary+Prepayment expenses already recorded for this exact period.
// No lock-in step: since `total` is always a live recalculation, if a new student pays after a
// previous payout for this same period, `remaining` on the next Hisoblang simply reflects the new
// gap - the admin just pays that gap, nothing needs to be "finalized" first.
// Rate configuration (rateType/rateValue - the "Hisoblash usuli") is director-only now (confirmed) -
// an admin presses Hisoblang and pays, but never sees or sets what percentage/method a teacher is
// actually paid at, so rateType/rateValue are stripped from the response entirely rather than just
// hidden client-side (a network tab would otherwise still reveal them).
export const calculateSalary = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const rates = await TeacherPayRate.find({ branchId: req.auth.branchId }).lean()
        const from = startOfLocalDay(dateFrom)
        const to = endOfLocalDay(dateTo)

        const results = await calculateSalaries(req.auth.branchId, rates, from, to)
        const sanitized = results.map(({ rateType, rateValue, ...rest }) => rest)
        res.json({ results: sanitized })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// itemized "Details" view for one teacher - which groups/students/lessons their total was built
// from, reusing the exact same computation calculateSalaries uses so the numbers always agree.
// Same rate-hiding as calculateSalary above - amounts/students/groups stay visible, the
// rateType/rateValue behind each group's total does not.
export const getSalaryDetail = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const rates = await TeacherPayRate.find({ branchId: req.auth.branchId }).lean()
        const from = startOfLocalDay(dateFrom)
        const to = endOfLocalDay(dateTo)

        const detail = await getTeacherSalaryDetail(req.auth.branchId, req.params.teacherId, rates, from, to)
        if (!detail) return res.status(404).json({ error: 'not_found' })
        const { rateType, rateValue, groups, ...restDetail } = detail
        const sanitizedGroups = groups.map(({ rateType, rateValue, ...rest }) => rest)
        res.json({ detail: { ...restDetail, groups: sanitizedGroups } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// records a salary payout as a branch Expense - this is what makes it show up as a cost against
// the Finance page's net-profit figure, and what makes this teacher show as "paid" for this exact
// date range next time the calculator runs
export const paySalary = async (req, res) => {
    try {
        const { teacherId, amount, dateFrom, dateTo, method } = req.body
        if (!teacherId || !amount) return res.status(400).json({ error: 'missing_fields' })
        if (!EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const teacher = await User.findById(teacherId).select('name').lean()
        // guarantees a real "Ish haqi MENTOR" category exists (correct name/color) whether this is a
        // brand new branch (ensureDefaultCategories seeds its whole starter set) or one that was
        // already active before this category existed under this exact name (ensureCategoryExists
        // creates just this one, same as prepaySalary already does for "Avans")
        await ensureDefaultCategories(req.auth.branchId)
        await ensureCategoryExists(req.auth.branchId, SALARY_CATEGORY, '#3E7CB1')
        // the expense is always dated TODAY (when the money actually left the business), never the
        // end of whatever period is being compensated - dateFrom/dateTo only describe WHAT the
        // payout covers (kept in name/note for context), not WHEN it happened. Dating it to a future
        // dateTo (e.g. paying for "this month" on the 20th, with dateTo the 31st) used to make the
        // expense invisible to any date filter not yet reaching that future date, and wrongly kept
        // it out of "how much money do we actually have right now" until that date arrived.
        const expense = await Expense.create({
            branchId: req.auth.branchId, category: SALARY_CATEGORY, amount, teacherId,
            name: dateFrom && dateTo ? `Salary for ${dateFrom} — ${dateTo}` : 'Salary payout',
            recipient: teacher?.name || '', method,
            date: new Date(),
            note: dateFrom && dateTo ? `Salary for ${dateFrom} — ${dateTo}` : 'Salary payout',
            createdBy: req.auth.userId,
        })
        const branchAccount = await getOrCreateAccount('branch', req.auth.branchId)
        const entry = await postEntry({
            accountId: branchAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expense.date,
        })
        if (entry) { expense.ledgerTransactionId = entry.transactionId; await expense.save({ validateModifiedOnly: true }) }

        // teacher's own account decreases by the same amount - this is what makes their running
        // balance (Account.balance, "how much the center currently owes this teacher") actually mean
        // something: it goes down here, up whenever a period is finalized (finalizeSalary), and
        // negative if they've been paid/advanced more than they've accrued so far (exactly the
        // "teacher is in debt to the center" case for a prepayment given ahead of being earned).
        const teacherAccount = await getOrCreateAccount('teacher', teacherId)
        await postEntry({
            accountId: teacherAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expense.date,
        })

        res.status(201).json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// records an advance/prepayment (category "Avans", not "Ish haqi MENTOR") for a teacher - for when
// they need money urgently before the period's full amount is calculated/settled. Both this and a
// real salary payout count toward the same `paidAmount`/`remaining` figures calculateSalaries
// computes, so there's no separate "already paid" gate here - the admin just sees `remaining`
// shrink after either kind of payout, and can keep giving advances or a final payout until it hits zero.
export const prepaySalary = async (req, res) => {
    try {
        const { teacherId, amount, dateFrom, dateTo, method } = req.body
        if (!teacherId || !amount) return res.status(400).json({ error: 'missing_fields' })
        if (!EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const teacher = await User.findById(teacherId).select('name').lean()
        await ensureCategoryExists(req.auth.branchId, PREPAYMENT_CATEGORY, '#E67E22')
        const expense = await Expense.create({
            branchId: req.auth.branchId, category: PREPAYMENT_CATEGORY, amount, teacherId,
            name: dateFrom && dateTo ? `Prepayment for ${dateFrom} — ${dateTo}` : 'Salary prepayment',
            recipient: teacher?.name || '', method,
            date: new Date(),
            note: dateFrom && dateTo ? `Prepayment for ${dateFrom} — ${dateTo}` : 'Salary prepayment',
            createdBy: req.auth.userId,
        })
        const branchAccount = await getOrCreateAccount('branch', req.auth.branchId)
        const entry = await postEntry({
            accountId: branchAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expense.date,
        })
        if (entry) { expense.ledgerTransactionId = entry.transactionId; await expense.save({ validateModifiedOnly: true }) }

        // decreases the teacher's own balance too, same as a real payout - an advance given BEFORE
        // that period is finalized naturally pushes their balance negative (they now owe the center
        // that advance until it's earned back), exactly the "prepayment = teacher in debt to the
        // center for now" behavior confirmed with the user.
        const teacherAccount = await getOrCreateAccount('teacher', teacherId)
        await postEntry({
            accountId: teacherAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expense.date,
        })

        res.status(201).json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// a private personal scratchpad - scoped to req.auth.userId only, never branch-wide or visible to
// other admins/director
export const listMyNotes = async (req, res) => {
    try {
        const notes = await AdminNote.find({ adminId: req.auth.userId }).sort({ createdAt: -1 }).lean()
        res.json({ notes })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createMyNote = async (req, res) => {
    try {
        const { text } = req.body
        if (!text?.trim()) return res.status(400).json({ error: 'text_required' })
        const note = await AdminNote.create({ adminId: req.auth.userId, text: text.trim() })
        res.status(201).json({ note })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteMyNote = async (req, res) => {
    try {
        await AdminNote.findOneAndDelete({ _id: req.params.id, adminId: req.auth.userId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
