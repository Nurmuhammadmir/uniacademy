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
import TeacherPayRate, { PAY_RATE_TYPES } from "../models/TeacherPayRate.js"
import Expense, { EXPENSE_METHODS } from "../models/Expense.js"
import Lesson from "../models/Lesson.js"
import LessonAttendance from "../models/LessonAttendance.js"
import Room from "../models/Room.js"
import CoursePeriod from "../models/CoursePeriod.js"
import AdminNote from "../models/AdminNote.js"
import { assertStudentHasPaid } from "../services/paymentGate.service.js"
import { ensureLessonsGenerated } from "../services/lessonGenerator.service.js"
import { assertNoScheduleConflict } from "../services/scheduleConflict.service.js"
import { suggestLeastLoadedGroup } from "../services/loadBalance.service.js"
import { enrollStudentMidCycle } from "../services/enrollMidCycle.service.js"
import { computeDayCounter } from "../services/dayCounter.service.js"
import { calculateSalaries, getTeacherSalaryDetail } from "../services/salaryCalculation.service.js"
import { getFinanceOverview as getFinanceOverviewService } from "../services/financeOverview.service.js"
import { startOfLocalDay, endOfLocalDay } from "../services/businessTime.service.js"
import { ensureDefaultCategories, ensureCategoryExists } from "../services/expenseCategories.service.js"
import { computeStudentStatements, computeReconciliation, computeGroupRevenue } from "../services/studentLedger.service.js"
import { earliestLessonTimeOnDate, isLateCheckIn } from "../services/scheduleDays.service.js"
import { computeEffectiveLessonStatuses, computeEffectiveLessonStatus } from "../services/lessonStatus.service.js"
import { computeBusinessLedger } from "../services/businessLedger.service.js"
import { applyDiscount } from "../services/discount.service.js"
import Discount from "../models/Discount.js"
import { openMembership, closeMembership } from "../services/groupMembership.service.js"
import { splitPeriodByMembership } from "../services/attribution.service.js"

// calendar-month billing helpers (UTC, matching this codebase's established day-boundary
// convention) - every chunk of subscription time purchased runs from its start through the LAST
// day of that calendar month, not a rolling +30 days, so a student's paid-through date always
// lands on a month boundary. This is what lets revenue/salary reporting work in clean monthly
// buckets instead of every student drifting to a different renewal day.
const endOfMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
const startOfNextMonthUTC = (endOfMonthDate) => new Date(Date.UTC(endOfMonthDate.getUTCFullYear(), endOfMonthDate.getUTCMonth() + 1, 1))
const daysInMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()

// re-derives ONE course's balance/isActive/subscriptionExpiresAt from scratch by replaying every
// payment made for that language, in order, against the course's CURRENT level price. A full
// recompute (instead of incrementally patching numbers) means voiding/refunding an old payment, or
// a level changing mid-course, can never leave billing state inconsistent with reality.
// Exported (not just used locally) so a one-time backfill can re-trigger it per student/course.
export const recalculateCourseBilling = async (studentId, languageId) => {
    const student = await User.findById(studentId)
    if (!student) return null

    const course = student.courses.find(c => String(c.languageId) === String(languageId))
    if (!course) return null

    const pricing = course.levelId ? await Pricing.findOne({ languageId, levelId: course.levelId }) : null
    const price = pricing?.monthlyPrice ?? null

    const payments = await Payment.find({ studentId, languageId }).sort({ date: 1 })

    let balance = 0
    let subscriptionExpiresAt = null
    let isActive = false

    for (const payment of payments) {
        // a partially (or fully) refunded payment only contributes its NET remaining amount - a
        // fully refunded row nets to 0 and is effectively skipped, same as the old binary exclusion.
        // `refunded: true` always means net 0, even on legacy rows from before refundedAmount
        // existed (which never got backfilled and would otherwise still read as 0 refunded)
        balance += payment.refunded ? 0 : payment.amount - (payment.refundedAmount || 0)
        if (price && price > 0) {
            while (true) {
                // if we're already paid up into the future, this payment's chunk starts right after
                // that (start of the following month) - otherwise it starts fresh from today
                const windowStart = subscriptionExpiresAt && subscriptionExpiresAt > payment.date
                    ? startOfNextMonthUTC(subscriptionExpiresAt)
                    : new Date(Date.UTC(payment.date.getUTCFullYear(), payment.date.getUTCMonth(), payment.date.getUTCDate()))
                const daysInMonth = daysInMonthUTC(windowStart)
                const dayOfMonth = windowStart.getUTCDate()
                const isFullMonth = dayOfMonth === 1
                const daysRemaining = daysInMonth - dayOfMonth + 1
                const rawCost = isFullMonth ? price : Math.round(price * daysRemaining / daysInMonth)
                // a discount is a genuine price reduction (not an expense) - see discount.service.js
                const { cost } = await applyDiscount(rawCost, studentId, languageId, windowStart)
                if (cost <= 0 || balance < cost) break
                balance -= cost
                const windowEnd = endOfMonthUTC(windowStart)

                // split this period's cost DAY-BY-DAY across whichever group(s) the student was
                // actually enrolled with during it (GroupMembership), so a mid-period switch credits
                // each teacher only for the days they actually had the student - snapshotted once,
                // the first time this exact period is ever consumed, and never touched again on
                // later replays (see CoursePeriod.js's own comment for why that immutability matters)
                const alreadyRecorded = await CoursePeriod.exists({ studentId, languageId, periodKey: windowStart })
                if (!alreadyRecorded) {
                    // NOT (windowEnd - windowStart)/86400000 - windowEnd carries a 23:59:59.999
                    // end-of-day time component, which rounds that division UP an extra whole day
                    // (e.g. a real 13-day period was computing as 14), silently shortchanging every
                    // teacher's percent_of_revenue share by ~(1/period-length). daysRemaining/
                    // daysInMonth above are already the correct, clean day counts - reuse them.
                    const totalDays = isFullMonth ? daysInMonth : daysRemaining
                    const segments = await splitPeriodByMembership(studentId, languageId, windowStart, windowEnd)
                    for (const segment of segments) {
                        const segmentDays = Math.round((segment.segmentEnd - segment.segmentStart) / 86400000) + 1
                        await CoursePeriod.create({
                            studentId, languageId, levelId: course.levelId,
                            periodKey: windowStart, periodStart: segment.segmentStart, periodEnd: segment.segmentEnd,
                            amount: Math.round(cost * segmentDays / totalDays),
                            groupId: segment.groupId || null, teacherId: segment.teacherId || null,
                        })
                    }
                }

                subscriptionExpiresAt = windowEnd
                isActive = true
            }
        }
        if (String(payment.subscriptionEnd) !== String(subscriptionExpiresAt)) {
            payment.subscriptionEnd = subscriptionExpiresAt
            // validateModifiedOnly - a legacy Payment row predating a newer required field (e.g.
            // languageId, added after some rows already existed) must still be re-saveable when only
            // subscriptionEnd changes; a full-document revalidation would otherwise reject it for a
            // field this save never touches
            await payment.save({ validateModifiedOnly: true })
        }
    }

    course.balance = balance
    course.subscriptionExpiresAt = subscriptionExpiresAt
    course.isActive = isActive
    await student.save()

    return { price, balance, subscriptionExpiresAt, isActive, amountStillNeeded: price ? Math.max(0, price - balance) : null }
}

// api for the teacher profile view, admin version - scoped to admin's own branch. A teacher may
// work in more than one branch (additionalBranchIds), so visibility is membership, not equality -
// the Group lookup below still filters strictly to THIS branch's groups, since that's specifically
// this branch's view of the teacher
export const getTeacherProfile = async (req, res) => {
    try {
        const teacher = await User.findOne({
            _id: req.params.id, role: 'teacher',
            $or: [{ branchId: req.auth.branchId }, { additionalBranchIds: req.auth.branchId }],
        }).select('-passwordHash')
        if (!teacher) return res.status(404).json({ error: 'not_found' })

        const groups = await Group.find({ teacherId: teacher._id, branchId: req.auth.branchId })
            .populate('languageId', 'name')
            .populate('levelId', 'name')

        const activeGroups = groups.filter(g => g.status === 'active')
        const uniqueStudentIds = new Set()
        activeGroups.forEach(g => g.studentIds.forEach(id => uniqueStudentIds.add(String(id))))

        res.json({
            teacher,
            employedSince: teacher.createdAt,
            activeGroupsCount: activeGroups.length,
            totalStudents: uniqueStudentIds.size,
            groups,
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
        }).select('name')
        if (!teacher) return res.status(404).json({ error: 'not_found' })

        const month = req.query.month || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const rangeStart = new Date(Date.UTC(year, mo - 1, 1))
        const rangeEnd = new Date(Date.UTC(year, mo, 0))

        const groupDocs = await Group.find({ teacherId: teacher._id, status: 'active' })
            .populate('languageId', 'name').populate('levelId', 'name')

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
        const student = await User.findOne({ _id: req.params.id, role: 'student', branchId: req.auth.branchId }).select('name')
        if (!student) return res.status(404).json({ error: 'not_found' })

        const month = req.query.month || new Date().toISOString().slice(0, 7)
        const [year, mo] = month.split('-').map(Number)
        const rangeStart = new Date(Date.UTC(year, mo - 1, 1))
        const rangeEnd = new Date(Date.UTC(year, mo, 0))

        const groupDocs = await Group.find({ studentIds: student._id, status: 'active' })
            .populate('languageId', 'name').populate('levelId', 'name')

        let present = 0, total = 0
        const groups = []
        for (const group of groupDocs) {
            const lessons = await ensureLessonsGenerated(group, rangeStart, rangeEnd)
            const attendanceRows = await LessonAttendance.find({ lessonId: { $in: lessons.map(l => l._id) }, studentId: student._id })
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
        const lesson = await Lesson.findById(req.params.id)
        if (!lesson) return res.status(404).json({ error: 'not_found' })

        const group = await Group.findOne({ _id: lesson.groupId, branchId: req.auth.branchId })
            .populate('languageId', 'name').populate('levelId', 'name').populate('roomId', 'name').populate('studentIds', 'name phone')
        if (!group) return res.status(404).json({ error: 'not_found' })

        const attendanceRows = await LessonAttendance.find({ lessonId: lesson._id })
        const statusByStudent = Object.fromEntries(attendanceRows.map(r => [String(r.studentId), r.status]))
        const students = group.studentIds.map(s => ({ studentId: s._id, name: s.name, phone: s.phone, status: statusByStudent[String(s._id)] || 'unmarked' }))

        const substitute = lesson.substituteTeacherId ? await User.findById(lesson.substituteTeacherId).select('name') : null
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

        const group = await Group.findOne({ _id: lesson.groupId, branchId: req.auth.branchId })
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
        })
        const checkInByTeacher = Object.fromEntries(checkIns.map(c => [String(c.teacherId), c.scannedAt]))

        // "on time" is judged against each teacher's own EARLIEST group lesson today, so a teacher
        // with no lesson scheduled today is never flagged late
        const allGroups = await Group.find({ teacherId: { $in: teachers.map(t => t._id) } })
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
        }).select('name phone')
        const teacherCheckIns = await TeacherAttendance.find({
            teacherId: { $in: teachers.map(t => t._id) },
            date: { $gte: startOfDay, $lt: endOfDay },
        })
        const checkInByTeacher = Object.fromEntries(teacherCheckIns.map(t => [String(t.teacherId), t.scannedAt]))

        // pre-fetch this branch's own groups and match by real ObjectId rather than trying to
        // $match a populated field inside the aggregate below
        const branchGroups = await Group.find({ branchId: req.auth.branchId })
            .populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name')

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

// api to create a student record - a first course (just a languageId, no level required yet) can
// optionally be attached right away, or added later via POST /students/:id/courses. The level gets
// assigned once the student's first payment picks one (or the admin uses "correct level" directly).
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

export const createStudent = async (req, res) => {
    try {
        const { name, phone, password, address, geo, languageId, passportInfo, parentPhone, parentPassword } = req.body

        const settings = await Settings.findOne({}) || { passportRequired: true }
        if (settings.passportRequired && !passportInfo?.trim()) {
            return res.status(400).json({ error: 'passport_info_required' })
        }

        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const courses = languageId ? [{ languageId, levelId: null, isActive: false, balance: 0 }] : []
        const student = await User.create({
            name, phone, passwordHash, address,
            geo: geo || { lat: null, lng: null },
            passportInfo: passportInfo || '',
            courses,
            role: 'student',
            branchId: req.auth.branchId,
            createdByAdminId: req.auth.userId,
        })
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

        const coursesWithPrice = await Promise.all(student.courses.map(async (c) => {
            const pricing = c.levelId ? await Pricing.findOne({ languageId: c.languageId._id, levelId: c.levelId._id }) : null
            return { ...c.toObject(), price: pricing?.monthlyPrice ?? null }
        }))

        const payments = await Payment.find({ studentId: student._id }).sort({ date: -1 }).populate('adminId', 'name').populate('languageId', 'name')
        const groups = await Group.find({ studentIds: student._id })
            .populate('languageId', 'name')
            .populate('levelId', 'name')
            .populate('teacherId', 'name')
        const examAttempts = await ExamAttempt.find({ studentId: student._id }).sort({ date: -1 })
            .populate({ path: 'examId', populate: [{ path: 'languageId', select: 'name' }, { path: 'levelId', select: 'name' }] })

        res.json({
            student,
            courses: coursesWithPrice,
            payments,
            // net of refunds - refunded:true always means 0, even for legacy rows recorded before
            // refundedAmount existed (theirs stayed 0 and was never backfilled)
            totalPaid: payments.reduce((sum, p) => sum + (p.refunded ? 0 : p.amount - (p.refundedAmount || 0)), 0),
            groups,
            examAttempts,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateStudent = async (req, res) => {
    try {
        const { name, phone, password, address, geo, passportInfo, notes } = req.body
        const update = { name, phone, address, geo }
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
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId, role: 'student' })
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

// api to correct a student's level within an EXISTING course (manual override - e.g. an admin
// placement-testing a student directly into a higher level). Triggers a billing recompute since a
// different level usually has a different price.
export const updateStudentCourse = async (req, res) => {
    try {
        const { levelId } = req.body
        // an empty string (e.g. a <select> that hadn't actually been touched by the admin yet)
        // would otherwise reach Mongoose's ObjectId cast and 500 the whole request - reject cleanly
        if (!levelId) return res.status(400).json({ error: 'level_required' })

        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const course = student.courses.id(req.params.courseId)
        if (!course) return res.status(404).json({ error: 'course_not_found' })

        course.levelId = levelId
        await student.save()
        await recalculateCourseBilling(student._id, course.languageId)

        res.json({ student })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// sets (or replaces) one student's discount for one course, for ONE specific calendar month - a
// genuine price reduction applied inside the billing engine (see discount.service.js), not an
// expense. Upserted so re-submitting the same student+course+month just replaces the old value
// instead of stacking discounts. Triggers a billing recompute so a discount for the CURRENT/future
// period takes effect immediately - a discount for an ALREADY-consumed past month does not
// retroactively reprice it (see discount.service.js's own comment for why).
export const setStudentDiscount = async (req, res) => {
    try {
        const { languageId, month, type, value } = req.body
        if (!languageId || !month || !['percent', 'amount'].includes(type) || !(value > 0)) {
            return res.status(400).json({ error: 'invalid_discount' })
        }
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const discount = await Discount.findOneAndUpdate(
            { studentId: req.params.id, languageId, month },
            { branchId: req.auth.branchId, type, value, createdBy: req.auth.userId },
            { upsert: true, new: true },
        )
        const result = await recalculateCourseBilling(req.params.id, languageId)

        res.status(201).json({ discount, ...result })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to enroll a student into an additional language. A student studying a language they're
// already enrolled in is NOT an error - the admin gets a heads-up client-side beforehand (see
// AdminContext.addStudentCourse), but this endpoint itself never blocks: it just hands back the
// existing course entry untouched instead of creating a second row for the same language, since the
// whole billing/subscription/exam pipeline (recalculateCourseBilling, paymentGate, groupPromotion,
// etc.) keys off "one courses[] entry per language" and a genuine duplicate would silently corrupt
// that everywhere it's looked up by languageId alone.
export const addStudentCourse = async (req, res) => {
    try {
        const { languageId } = req.body
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const existing = student.courses.find(c => String(c.languageId) === String(languageId))
        if (existing) return res.status(200).json({ student, alreadyEnrolled: true })

        // no level yet - assigned once the first payment for this course picks one
        student.courses.push({ languageId, levelId: null, isActive: false, balance: 0 })
        await student.save()
        res.status(201).json({ student })
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

// api to record a payment against ONE course - amount is credited to that course's balance, then
// as much of the course price as the balance covers is converted into subscription time. A payment
// smaller than the price is recorded but does NOT activate the course on its own - the response
// tells the admin exactly how much more is still needed. A level is required on every payment - a
// student can be paying for a different level than the course currently has (switching levels or
// picking a different course track), so the payment freely re-assigns the course's level to
// whatever was chosen here rather than rejecting a mismatch.
const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'click']

export const createPayment = async (req, res) => {
    try {
        const { studentId, languageId, levelId, amount, method } = req.body
        if (!PAYMENT_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_payment_method' })
        if (!levelId) return res.status(400).json({ error: 'level_required' })

        const student = await User.findOne({ _id: studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const course = student.courses.find(c => String(c.languageId) === String(languageId))
        if (!course) return res.status(400).json({ error: 'student_has_no_course' })

        // a payment for a different level than the course currently has just re-assigns it (the
        // student switched levels/courses) - same effect as the "correct level" tool, just folded
        // into the payment itself so the admin doesn't need a separate step
        if (String(course.levelId || '') !== String(levelId)) {
            course.levelId = levelId
            await student.save()
        }

        // attribution snapshot - which group/teacher this payment is actually funding, resolved from
        // whichever active group the student is in at this exact language+level right now. Stays
        // null if they haven't been placed in a group yet - that's fine, it just means this payment
        // can't be attributed to a specific teacher for salary/finance purposes until they are.
        const group = await Group.findOne({ studentIds: studentId, languageId, levelId, status: 'active' })

        const payment = await Payment.create({
            studentId, languageId, levelId, amount, method, date: new Date(), adminId: req.auth.userId,
            groupId: group?._id || null, teacherId: group?.teacherId || null, branchId: req.auth.branchId,
        })
        const result = await recalculateCourseBilling(studentId, languageId)

        res.status(201).json({ payment, ...result })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// read-only dry-run of recalculateCourseBilling's next-chunk proration math, used by the payment
// form to show "paying now covers you through <date>, for <cost>" BEFORE the admin actually submits
// anything - mirrors createPayment/recalculateCourseBilling's exact window/cost formula but never
// persists a Payment or mutates the student's course
export const getPaymentPreview = async (req, res) => {
    try {
        const { studentId, languageId, levelId } = req.query
        if (!studentId || !languageId || !levelId) return res.status(400).json({ error: 'missing_params' })

        const student = await User.findOne({ _id: studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const pricing = await Pricing.findOne({ languageId, levelId })
        const price = pricing?.monthlyPrice ?? null
        if (!price) return res.json({ price: null })

        const course = student.courses.find(c => String(c.languageId) === String(languageId))
        // only trust the course's existing paid-through date/balance if it's already at this SAME
        // level - paying into a different level (a level switch, same as createPayment does) starts
        // proration fresh from today, same as a brand new course would
        const sameLevel = course && String(course.levelId || '') === String(levelId)
        const subscriptionExpiresAt = sameLevel ? course.subscriptionExpiresAt : null
        const balance = sameLevel ? course.balance : 0

        const now = new Date()
        const windowStart = subscriptionExpiresAt && subscriptionExpiresAt > now
            ? startOfNextMonthUTC(subscriptionExpiresAt)
            : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        const daysInMonth = daysInMonthUTC(windowStart)
        const dayOfMonth = windowStart.getUTCDate()
        const isFullMonth = dayOfMonth === 1
        const daysRemaining = daysInMonth - dayOfMonth + 1
        const rawCost = isFullMonth ? price : Math.round(price * daysRemaining / daysInMonth)
        const { cost, discount } = await applyDiscount(rawCost, studentId, languageId, windowStart)
        const windowEnd = endOfMonthUTC(windowStart)

        res.json({
            price, balance, cost, windowStart, windowEnd, isFullMonth, daysInMonth, daysRemaining,
            amountStillNeeded: Math.max(0, cost - balance),
            discount: discount ? { type: discount.type, value: discount.value, rawCost } : null,
        })
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
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId })
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
            const student = await User.findOne({ _id: studentId, branchId: req.auth.branchId }).select('_id')
            if (!student) return res.status(404).json({ error: 'not_found' })
            studentIds = [student._id]
        } else if (scope === 'group') {
            if (!groupId) return res.status(400).json({ error: 'group_required' })
            const group = await Group.findOne({ _id: groupId, branchId: req.auth.branchId }).select('studentIds teacherId')
            if (!group) return res.status(404).json({ error: 'not_found' })
            studentIds = group.studentIds

            // "where does this group's money go" - Credits collected (computeGroupRevenue) alongside
            // the teacher's actual computed salary for the same period as context (see
            // computeGroupRevenue's own comment for why it can't be split precisely per-group for
            // every rate type)
            groupRevenue = await computeGroupRevenue(groupId, from, to)
            if (groupRevenue?.teacherId) {
                const rates = await TeacherPayRate.find({ branchId: req.auth.branchId })
                const salaryResults = await calculateSalaries(req.auth.branchId, rates, from, to)
                groupRevenue.teacherSalary = salaryResults.find(r => String(r.teacherId) === String(groupRevenue.teacherId)) || null
            }
        } else if (scope === 'branch') {
            const students = await User.find({ branchId: req.auth.branchId, role: 'student' }).select('_id')
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
            .populate('groupId', 'schedulePattern time')
            .populate('teacherId', 'name')
            .populate('adminId', 'name')
            .populate('refundedBy', 'name')
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

export const listPayments = async (req, res) => {
    try {
        const students = await User.find({ branchId: req.auth.branchId, role: 'student' }).select('_id')
        const payments = await Payment.find({ studentId: { $in: students.map(s => s._id) } }).sort({ date: -1 }).populate('languageId', 'name')
        res.json({ payments })
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
// recalculateCourseBilling then replays using (amount - refundedAmount) as the payment's real net
// contribution, unwinding exactly the refunded portion's effect on balance/subscription.
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
        // validateModifiedOnly - see recalculateCourseBilling's identical comment above: a legacy
        // Payment row missing a newer required field (languageId) must still be refundable
        await payment.save({ validateModifiedOnly: true })
        await recalculateCourseBilling(payment.studentId, payment.languageId)

        // the original payment still counts as gross revenue (it happened) - the refund is booked
        // as its own expense instead of retroactively shrinking that revenue figure, so "Total
        // payments" always reads as real money received and "Net profit" is what's left after every
        // real cost (salaries, rent, refunds, ...) is subtracted, not a silently-adjusted revenue line
        await ensureDefaultCategories(req.auth.branchId)
        const student = await User.findById(payment.studentId).select('name')
        await Expense.create({
            branchId: req.auth.branchId, category: 'Refund', amount: refundAmount,
            name: `Refund - ${student?.name || 'student'}`, recipient: student?.name || '',
            method: payment.method || 'cash', date: new Date(), createdBy: req.auth.userId,
        })

        res.json({ payment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// permanently erases a Payment - deliberately separate from refundPayment, which keeps the row (just
// marked refunded) so the ledger stays honest and auditable. This is the opposite: for a genuine
// mistake/test entry that should leave no trace at all, as if it was never recorded. Only reachable
// from the accounting Ledger page, never from the regular Payments table (which only offers Refund),
// and always recomputes billing afterward so balance/subscriptionExpiresAt end up exactly as if this
// payment had never existed.
export const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })
        const student = await User.findOne({ _id: payment.studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const { studentId, languageId } = payment
        await payment.deleteOne()
        await recalculateCourseBilling(studentId, languageId)

        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to correct a mis-entered payment - amount and/or method only. Date is intentionally NOT
// editable here (changing it would reorder the replay in recalculateCourseBilling and could shift
// which chunk covers which month in confusing ways) - to move a payment to a different date, refund
// it and record a fresh one instead.
export const updatePayment = async (req, res) => {
    try {
        const { amount, method } = req.body
        const payment = await Payment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })
        if (payment.refundedAmount > 0) return res.status(400).json({ error: 'already_refunded' })

        if (amount !== undefined) payment.amount = amount
        if (method !== undefined) {
            if (!PAYMENT_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_payment_method' })
            payment.method = method
        }
        // validateModifiedOnly - see recalculateCourseBilling's identical comment above: a legacy
        // Payment row missing a newer required field (languageId) must still be editable
        await payment.save({ validateModifiedOnly: true })
        const result = await recalculateCourseBilling(payment.studentId, payment.languageId)

        res.json({ payment, ...result })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createGroup = async (req, res) => {
    try {
        const { name, languageId, levelId, teacherId, schedulePattern, customDays, time, durationMinutes, startDate, capacity, roomId } = req.body
        await assertNoScheduleConflict({ teacherId, roomId, schedulePattern, customDays, time, durationMinutes })

        const level = await Level.findById(levelId).select('durationDays')
        const group = await Group.create({
            branchId: req.auth.branchId, name: name || '',
            languageId, levelId, teacherId, schedulePattern, customDays, time, durationMinutes, startDate, roomId,
            capacity: capacity || 20,
            dayCounter: computeDayCounter(startDate, level?.durationDays || 30),
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
        const withFreshDay = groups.map(g => ({ ...g.toObject(), dayCounter: computeDayCounter(g.startDate, g.levelId?.durationDays || 30) }))
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
        res.json({ group: { ...group.toObject(), dayCounter: computeDayCounter(group.startDate, group.levelId?.durationDays || 30) } })
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
        if (endDate !== undefined) group.endDate = endDate || null

        const level = await Level.findById(group.levelId).select('durationDays')
        const durationDays = level?.durationDays || 30

        // the group's day counter is never stored as its own source of truth - it's always
        // recomputed from `startDate` (see dayCounter.service.computeDayCounter), so "editing the
        // day" really means back-dating startDate so that TODAY computes out to the requested day.
        // e.g. asking for "day 10" on a 30-day level sets startDate to 9 days ago.
        if (day !== undefined && day !== null && day !== '') {
            const targetDay = Math.min(Math.max(1, Number(day)), durationDays)
            const newStartDate = new Date()
            newStartDate.setHours(0, 0, 0, 0)
            newStartDate.setDate(newStartDate.getDate() - (targetDay - 1))
            group.startDate = newStartDate
        }

        await group.save()

        res.json({ group: { ...group.toObject(), dayCounter: computeDayCounter(group.startDate, durationDays) } })
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
        // an empty active group serves no purpose and would otherwise sit at status:'active'
        // forever - nothing can ever trigger groupPromotion.service's lazy student-driven
        // promotion check for a group with nobody left in it, and while active it permanently
        // blocks its teacher+schedule+time slot from being reused (scheduleConflict.service.js)
        if (group.studentIds.length === 0) group.status = 'completed'
        await group.save()
        await closeMembership(req.params.studentId, group._id)
        res.json({ group })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const suggestGroup = async (req, res) => {
    try {
        const { languageId, levelId } = req.query
        const suggestion = await suggestLeastLoadedGroup(req.auth.branchId, languageId, levelId)
        res.json({ suggestion })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to add a student into an existing group - requires an active (paid-up) course matching the
// group's exact language+level (rule #1), starts them mid-cycle (rule #6). A student may now be in
// several active groups at once, even of the same language (e.g. two English groups) - the only
// real restriction is not joining the exact same group twice, which the studentIds push below
// would just no-op/duplicate on if not for the capacity check catching it in practice.
export const addStudentToGroup = async (req, res) => {
    try {
        const { studentId } = req.body
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        if (group.studentIds.some(id => String(id) === String(studentId))) {
            return res.status(409).json({ error: 'already_in_this_group' })
        }

        await assertStudentHasPaid(studentId, group.languageId, group.levelId)

        if (group.studentIds.length >= group.capacity) {
            return res.status(409).json({ error: 'group_full' })
        }

        group.studentIds.push(studentId)
        await group.save()
        await openMembership(studentId, group)
        const level = await Level.findById(group.levelId).select('durationDays')
        await enrollStudentMidCycle(studentId, group, level?.durationDays || 30)

        res.json({ group })
    } catch (error) {
        if (error.code === 'payment_required') return res.status(403).json({ error: error.code })
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

        const exam = await Exam.findById(examId)
        if (!exam) return res.status(404).json({ error: 'not_found' })

        const student = await User.findById(studentId)
        if (!student) return res.status(404).json({ error: 'not_found' })

        const attemptCount = await ExamAttempt.countDocuments({ studentId, examId })
        const passed = score >= exam.passScore
        const attempt = await ExamAttempt.create({ studentId, examId, score, passed, attemptNumber: attemptCount + 1, source: 'admin_retake' })

        const courseEntry = student.courses.find(c => String(c.languageId) === String(exam.languageId))
        let outcome = passed ? 'course_completed' : 'failed_final'

        if (passed) {
            const currentLevel = await Level.findById(exam.levelId)
            const nextLevel = currentLevel
                ? await Level.findOne({ languageId: exam.languageId, order: { $gt: currentLevel.order } }).sort({ order: 1 })
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
        const admin = await User.findById(req.auth.userId).select('-passwordHash').populate('branchId', 'name')
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
        const qrs = await TeacherAttendanceQR.find({ branchId: req.auth.branchId }).sort({ createdAt: -1 })
        res.json({ qrs })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Salary ("Ish haqi") ====

// lists this branch's pay rates - one row with teacherId:null (the branch default, if configured)
// plus any per-teacher overrides
export const listPayRates = async (req, res) => {
    try {
        const rates = await TeacherPayRate.find({ branchId: req.auth.branchId }).populate('teacherId', 'name')
        res.json({ rates })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// upserts either the branch default (teacherId omitted) or one teacher's override (teacherId given)
export const setPayRate = async (req, res) => {
    try {
        const { teacherId, rateType, rateValue } = req.body
        if (!PAY_RATE_TYPES.includes(rateType)) return res.status(400).json({ error: 'invalid_rate_type' })

        const rate = await TeacherPayRate.findOneAndUpdate(
            { branchId: req.auth.branchId, teacherId: teacherId || null },
            { rateType, rateValue },
            { upsert: true, new: true, runValidators: true }
        )
        res.status(201).json({ rate })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deletePayRate = async (req, res) => {
    try {
        await TeacherPayRate.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// runs the calculation fresh every time (nothing persisted until "Pay" is clicked) - see
// salaryCalculation.service.js for exactly how each rate type is applied
export const calculateSalary = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const rates = await TeacherPayRate.find({ branchId: req.auth.branchId })
        const from = startOfLocalDay(dateFrom)
        const to = endOfLocalDay(dateTo)

        const results = await calculateSalaries(req.auth.branchId, rates, from, to)
        res.json({ results })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// itemized "Details" view for one teacher - which groups/students/lessons their total was built
// from, reusing the exact same computation calculateSalaries uses so the numbers always agree
export const getSalaryDetail = async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const rates = await TeacherPayRate.find({ branchId: req.auth.branchId })
        const from = startOfLocalDay(dateFrom)
        const to = endOfLocalDay(dateTo)

        const detail = await getTeacherSalaryDetail(req.auth.branchId, req.params.teacherId, rates, from, to)
        if (!detail) return res.status(404).json({ error: 'not_found' })
        res.json({ detail })
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

        const teacher = await User.findById(teacherId).select('name')
        // guarantees a real "Salary" category exists (correct name/color) even if this branch's
        // admin has never opened the Expenses tab yet - a payout should never depend on that
        await ensureDefaultCategories(req.auth.branchId)
        // the expense is always dated TODAY (when the money actually left the business), never the
        // end of whatever period is being compensated - dateFrom/dateTo only describe WHAT the
        // payout covers (kept in name/note for context), not WHEN it happened. Dating it to a future
        // dateTo (e.g. paying for "this month" on the 20th, with dateTo the 31st) used to make the
        // expense invisible to any date filter not yet reaching that future date, and wrongly kept
        // it out of "how much money do we actually have right now" until that date arrived.
        const expense = await Expense.create({
            branchId: req.auth.branchId, category: 'Salary', amount, teacherId,
            name: dateFrom && dateTo ? `Salary for ${dateFrom} — ${dateTo}` : 'Salary payout',
            recipient: teacher?.name || '', method,
            date: new Date(),
            note: dateFrom && dateTo ? `Salary for ${dateFrom} — ${dateTo}` : 'Salary payout',
            createdBy: req.auth.userId,
        })
        res.status(201).json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// records an advance/prepayment (category 'Prepayment', not 'Salary') for a teacher - for when
// they need money urgently before the period's real payout is due. Blocked once the real salary
// for this exact period has already been paid, since there's nothing left to advance against at
// that point. The reverse isn't blocked here: paySalary itself just shows a warning (built from
// calculateSalaries' `prepayments` field) so the admin can see what was already advanced before
// deciding how much more to actually pay out.
export const prepaySalary = async (req, res) => {
    try {
        const { teacherId, amount, dateFrom, dateTo, method } = req.body
        if (!teacherId || !amount) return res.status(400).json({ error: 'missing_fields' })
        if (!EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        if (dateFrom && dateTo) {
            const alreadyPaid = await Expense.exists({
                branchId: req.auth.branchId, category: 'Salary', teacherId,
                date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
            })
            if (alreadyPaid) return res.status(409).json({ error: 'salary_already_paid' })
        }

        const teacher = await User.findById(teacherId).select('name')
        await ensureCategoryExists(req.auth.branchId, 'Prepayment', '#E67E22')
        const expense = await Expense.create({
            branchId: req.auth.branchId, category: 'Prepayment', amount, teacherId,
            name: dateFrom && dateTo ? `Prepayment for ${dateFrom} — ${dateTo}` : 'Salary prepayment',
            recipient: teacher?.name || '', method,
            date: new Date(),
            note: dateFrom && dateTo ? `Prepayment for ${dateFrom} — ${dateTo}` : 'Salary prepayment',
            createdBy: req.auth.userId,
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
        const notes = await AdminNote.find({ adminId: req.auth.userId }).sort({ createdAt: -1 })
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
