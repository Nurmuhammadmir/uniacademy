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
import Settings from "../models/Settings.js"
import { assertStudentHasPaid } from "../services/paymentGate.service.js"
import { assertNoTeacherConflict } from "../services/scheduleConflict.service.js"
import { suggestLeastLoadedGroup } from "../services/loadBalance.service.js"
import { enrollStudentMidCycle } from "../services/enrollMidCycle.service.js"
import { computeDayCounter } from "../services/dayCounter.service.js"

// re-derives ONE course's balance/isActive/subscriptionExpiresAt from scratch by replaying every
// payment made for that language, in order, against the course's CURRENT level price. A full
// recompute (instead of incrementally patching numbers) means voiding an old payment, or a level
// changing mid-course, can never leave billing state inconsistent with reality.
const recalculateCourseBilling = async (studentId, languageId) => {
    const student = await User.findById(studentId)
    if (!student) return null

    const course = student.courses.find(c => String(c.languageId) === String(languageId))
    if (!course) return null

    const pricing = await Pricing.findOne({ languageId, levelId: course.levelId })
    const price = pricing?.monthlyPrice ?? null

    const payments = await Payment.find({ studentId, languageId }).sort({ date: 1 })

    let balance = 0
    let subscriptionExpiresAt = null
    let isActive = false

    for (const payment of payments) {
        balance += payment.amount
        if (price && price > 0) {
            while (balance >= price) {
                balance -= price
                const base = subscriptionExpiresAt && subscriptionExpiresAt > payment.date ? subscriptionExpiresAt : payment.date
                subscriptionExpiresAt = new Date(base)
                subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 30)
                isActive = true
            }
        }
        if (String(payment.subscriptionEnd) !== String(subscriptionExpiresAt)) {
            payment.subscriptionEnd = subscriptionExpiresAt
            await payment.save()
        }
    }

    course.balance = balance
    course.subscriptionExpiresAt = subscriptionExpiresAt
    course.isActive = isActive
    await student.save()

    return { price, balance, subscriptionExpiresAt, isActive, amountStillNeeded: price ? Math.max(0, price - balance) : null }
}

// api for the teacher profile view, admin version - scoped to admin's own branch
export const getTeacherProfile = async (req, res) => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher', branchId: req.auth.branchId }).select('-passwordHash')
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

// same "who checked in today" visibility a teacher already has over their students' attendance,
// just for admin looking at their own branch's teachers - UTC day boundary, matching exactly how
// teacherController.scanOwnAttendance writes the check-in (see that file's comment for why UTC)
export const listBranchTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher', branchId: req.auth.branchId }).select('name phone')

        const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)
        const checkIns = await TeacherAttendance.find({
            teacherId: { $in: teachers.map(t => t._id) },
            date: { $gte: startOfDay, $lt: endOfDay },
        })
        const checkInByTeacher = Object.fromEntries(checkIns.map(c => [String(c.teacherId), c.scannedAt]))

        const teachersWithAttendance = teachers.map(t => ({
            ...t.toObject(),
            checkedInToday: !!checkInByTeacher[String(t._id)],
            checkedInAt: checkInByTeacher[String(t._id)] || null,
        }))

        res.json({ teachers: teachersWithAttendance })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to create a student record - a first course (languageId+levelId) can optionally be attached
// right away, or added later via POST /students/:id/courses
export const createStudent = async (req, res) => {
    try {
        const { name, phone, password, address, geo, languageId, levelId, passportInfo } = req.body

        const settings = await Settings.findOne({}) || { passportRequired: true }
        if (settings.passportRequired && !passportInfo?.trim()) {
            return res.status(400).json({ error: 'passport_info_required' })
        }

        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const courses = languageId && levelId ? [{ languageId, levelId, isActive: false, balance: 0 }] : []
        const student = await User.create({
            name, phone, passwordHash, address,
            geo: geo || { lat: null, lng: null },
            passportInfo: passportInfo || '',
            courses,
            role: 'student',
            branchId: req.auth.branchId,
            createdByAdminId: req.auth.userId,
        })
        res.status(201).json({ student })
    } catch (error) {
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
            const pricing = await Pricing.findOne({ languageId: c.languageId._id, levelId: c.levelId._id })
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
            totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
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
        const { name, phone, password, address, geo, passportInfo } = req.body
        const update = { name, phone, address, geo }
        if (passportInfo !== undefined) update.passportInfo = passportInfo
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

// api to correct a student's level within an EXISTING course (manual override - e.g. an admin
// placement-testing a student directly into a higher level). Triggers a billing recompute since a
// different level usually has a different price.
export const updateStudentCourse = async (req, res) => {
    try {
        const { levelId } = req.body
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

// api to enroll a student into an additional language - a student may study several languages at
// once, but never the same language twice
export const addStudentCourse = async (req, res) => {
    try {
        const { languageId, levelId } = req.body
        const student = await User.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const alreadyEnrolled = student.courses.some(c => String(c.languageId) === String(languageId))
        if (alreadyEnrolled) return res.status(409).json({ error: 'language_already_enrolled' })

        student.courses.push({ languageId, levelId, isActive: false, balance: 0 })
        await student.save()
        res.status(201).json({ student })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteStudent = async (req, res) => {
    try {
        await User.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to record a payment against ONE course - amount is credited to that course's balance, then
// as much of the course price as the balance covers is converted into subscription time. A payment
// smaller than the price is recorded but does NOT activate the course on its own - the response
// tells the admin exactly how much more is still needed.
export const createPayment = async (req, res) => {
    try {
        const { studentId, languageId, amount } = req.body

        const student = await User.findOne({ _id: studentId, branchId: req.auth.branchId })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const hasCourse = student.courses.some(c => String(c.languageId) === String(languageId))
        if (!hasCourse) return res.status(400).json({ error: 'student_has_no_course' })

        const payment = await Payment.create({ studentId, languageId, amount, date: new Date(), adminId: req.auth.userId })
        const result = await recalculateCourseBilling(studentId, languageId)

        res.status(201).json({ payment, ...result })
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

export const deletePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })

        await Payment.findByIdAndDelete(req.params.id)
        await recalculateCourseBilling(payment.studentId, payment.languageId)

        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createGroup = async (req, res) => {
    try {
        const { languageId, levelId, teacherId, schedulePattern, time, startDate, capacity } = req.body
        await assertNoTeacherConflict(teacherId, schedulePattern, time)

        const level = await Level.findById(levelId).select('durationDays')
        const group = await Group.create({
            branchId: req.auth.branchId,
            languageId, levelId, teacherId, schedulePattern, time, startDate,
            capacity: capacity || 20,
            dayCounter: computeDayCounter(startDate, level?.durationDays || 30),
        })
        res.status(201).json({ group })
    } catch (error) {
        if (error.code === 'teacher_schedule_conflict') return res.status(409).json({ error: error.code })
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

        const { teacherId, schedulePattern, time, capacity, day } = req.body
        const nextTeacherId = teacherId || group.teacherId
        const nextSchedule = schedulePattern || group.schedulePattern
        const nextTime = time || group.time

        if (String(nextTeacherId) !== String(group.teacherId) || nextSchedule !== group.schedulePattern || nextTime !== group.time) {
            await assertNoTeacherConflict(nextTeacherId, nextSchedule, nextTime, group._id)
        }

        group.teacherId = nextTeacherId
        group.schedulePattern = nextSchedule
        group.time = nextTime
        if (capacity) group.capacity = capacity

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
        if (error.code === 'teacher_schedule_conflict') return res.status(409).json({ error: error.code })
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
// group's exact language+level (rule #1), starts them mid-cycle (rule #6). A student can study
// several DIFFERENT languages at once, but can never be in two active groups of the SAME language
// simultaneously (e.g. two English groups) - that's checked here before anything else.
export const addStudentToGroup = async (req, res) => {
    try {
        const { studentId } = req.body
        const group = await Group.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!group) return res.status(404).json({ error: 'not_found' })

        const alreadyInSameLanguage = await Group.exists({
            studentIds: studentId,
            languageId: group.languageId,
            status: 'active',
        })
        if (alreadyInSameLanguage) {
            return res.status(409).json({ error: 'already_in_language_group' })
        }

        await assertStudentHasPaid(studentId, group.languageId, group.levelId)

        if (group.studentIds.length >= group.capacity) {
            return res.status(409).json({ error: 'group_full' })
        }

        group.studentIds.push(studentId)
        await group.save()
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

// api to generate a shared, permanent teacher check-in QR for this branch - any teacher who scans
// it gets marked present for today under their own identity. Never expires; admins can generate
// more than one (e.g. to print at a second entrance).
export const createTeacherAttendanceQR = async (req, res) => {
    try {
        const token = crypto.randomBytes(16).toString('hex')
        const qr = await TeacherAttendanceQR.create({ branchId: req.auth.branchId, token })
        res.status(201).json({ qr })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to list this branch's existing check-in QR codes, so an admin can reprint an old one instead
// of generating a fresh one every time
export const listTeacherAttendanceQRs = async (req, res) => {
    try {
        const qrs = await TeacherAttendanceQR.find({ branchId: req.auth.branchId }).sort({ createdAt: -1 })
        res.json({ qrs })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
