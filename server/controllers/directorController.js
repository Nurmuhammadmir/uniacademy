// director sees every branch with no restriction - this controller only ever calls services/models,
// no business rules are decided in here
import bcrypt from "bcrypt"
import User from "../models/User.js"
import Branch from "../models/Branch.js"
import Payment from "../models/Payment.js"
import Group from "../models/Group.js"
import Pricing from "../models/Pricing.js"
import Language from "../models/Language.js"
import Level from "../models/Level.js"
import Settings from "../models/Settings.js"
import ExamAttempt from "../models/ExamAttempt.js"
import Attendance from "../models/Attendance.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import Room from "../models/Room.js"
import Lesson from "../models/Lesson.js"
import TeacherPayRate, { PAY_RATE_TYPES } from "../models/TeacherPayRate.js"
import Expense, { EXPENSE_METHODS } from "../models/Expense.js"
import { assertNoScheduleConflict } from "../services/scheduleConflict.service.js"
import { computeDayCounter } from "../services/dayCounter.service.js"
import { deleteLevelContent } from "../services/contentCascade.service.js"
import { calculateSalaries, getTeacherSalaryDetail } from "../services/salaryCalculation.service.js"
import { getFinanceOverview as getFinanceOverviewService } from "../services/financeOverview.service.js"
import { startOfLocalDay, endOfLocalDay } from "../services/businessTime.service.js"
import { ensureDefaultCategories } from "../services/expenseCategories.service.js"
import { computeBusinessLedger } from "../services/businessLedger.service.js"

const startOfThisMonth = () => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
}

export const getStats = async (req, res) => {
    try {
        const revenueByBranch = await Payment.aggregate([
            { $lookup: { from: 'users', localField: 'studentId', foreignField: '_id', as: 'student' } },
            { $unwind: '$student' },
            { $group: { _id: '$student.branchId', revenue: { $sum: '$amount' }, payments: { $sum: 1 } } },
        ])

        const studentsByLanguage = await Group.aggregate([
            { $unwind: '$studentIds' },
            { $group: { _id: '$languageId', students: { $sum: 1 } } },
        ])

        // top 3 teachers by current unique active-group student count
        const topTeachersRaw = await Group.aggregate([
            { $match: { status: 'active' } },
            { $unwind: '$studentIds' },
            { $group: { _id: '$teacherId', students: { $addToSet: '$studentIds' } } },
            { $project: { teacherId: '$_id', count: { $size: '$students' } } },
            { $sort: { count: -1 } },
            { $limit: 3 },
        ])
        const teacherDocs = await User.find({ _id: { $in: topTeachersRaw.map(t => t.teacherId) } }).select('name branchId').populate('branchId', 'name')
        const topTeachers = topTeachersRaw.map(t => ({
            teacherId: t.teacherId,
            count: t.count,
            teacher: teacherDocs.find(d => String(d._id) === String(t.teacherId)),
        }))

        // this month's new students, per branch
        const monthlyNewStudentsByBranch = await User.aggregate([
            { $match: { role: 'student', createdAt: { $gte: startOfThisMonth() } } },
            { $group: { _id: '$branchId', count: { $sum: 1 } } },
        ])

        // this month's new course enrollments, per language
        const monthlyNewEnrollmentsByLanguage = await User.aggregate([
            { $match: { role: 'student' } },
            { $unwind: '$courses' },
            { $match: { 'courses.createdAt': { $gte: startOfThisMonth() } } },
            { $group: { _id: '$courses.languageId', count: { $sum: 1 } } },
        ])

        // this month's revenue, for a simple trend indicator
        const monthlyRevenue = await Payment.aggregate([
            { $match: { date: { $gte: startOfThisMonth() } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ])

        // every-day attendance quality per teacher - not "who won today", but "across every session
        // this teacher has ever run, what share of their roster actually showed up". A teacher who
        // consistently gets 90% attendance is doing something right regardless of class size; a
        // one-day snapshot doesn't tell you that.
        const attendanceByTeacherSession = await Attendance.aggregate([
            { $lookup: { from: 'groups', localField: 'groupId', foreignField: '_id', as: 'group' } },
            { $unwind: '$group' },
            { $group: { _id: { teacherId: '$group.teacherId', groupId: '$groupId', day: '$day' }, present: { $sum: 1 }, rosterSize: { $first: { $size: '$group.studentIds' } } } },
            { $group: { _id: '$_id.teacherId', totalPresent: { $sum: '$present' }, totalPossible: { $sum: '$rosterSize' }, sessionCount: { $sum: 1 } } },
        ])
        const allTeacherDocs = await User.find({ role: 'teacher' }).select('name branchId').populate('branchId', 'name')
        const attendanceRateByTeacherId = Object.fromEntries(attendanceByTeacherSession.map(r => [String(r._id), r]))
        const teacherAttendanceRates = allTeacherDocs.map(t => {
            const stat = attendanceRateByTeacherId[String(t._id)]
            return {
                teacherId: t._id,
                name: t.name,
                branchName: t.branchId?.name,
                sessionCount: stat?.sessionCount || 0,
                averageAttendancePercent: stat && stat.totalPossible > 0 ? Math.round((stat.totalPresent / stat.totalPossible) * 100) : null,
            }
        }).sort((a, b) => (b.averageAttendancePercent ?? -1) - (a.averageAttendancePercent ?? -1))

        res.json({
            revenueByBranch, studentsByLanguage, topTeachers,
            monthlyNewStudentsByBranch, monthlyNewEnrollmentsByLanguage,
            monthlyRevenue: monthlyRevenue[0]?.total || 0,
            teacherAttendanceRates,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getMapData = async (req, res) => {
    try {
        const students = await User.find({ role: 'student', 'geo.lat': { $ne: null } }).select('name branchId geo').lean()
        const byBranch = students.reduce((acc, student) => {
            const key = String(student.branchId)
            if (!acc[key]) acc[key] = []
            acc[key].push(student)
            return acc
        }, {})
        res.json({ byBranch })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-passwordHash')
            .populate('branchId', 'name')
            .populate('courses.languageId', 'name')
            .populate('courses.levelId', 'name')
        res.json({ students })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// director version of the student profile - INCLUDES address/geo (admin's version does not)
export const getStudentProfile = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-passwordHash')
            .populate('branchId', 'name')
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

// api for the branch detail modal - who works there, how many students, how much revenue
export const getBranchProfile = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id)
        if (!branch) return res.status(404).json({ error: 'not_found' })

        const admins = await User.find({ role: 'admin', branchId: branch._id }).select('name phone')
        // a teacher may also teach here via additionalBranchIds even if this isn't their home branch
        const teachers = await User.find({
            role: 'teacher',
            $or: [{ branchId: branch._id }, { additionalBranchIds: branch._id }],
        }).select('name phone')
        const students = await User.find({ role: 'student', branchId: branch._id }).select('name phone courses')
        const groups = await Group.find({ branchId: branch._id, status: 'active' }).populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name')

        const revenueAgg = await Payment.aggregate([
            { $lookup: { from: 'users', localField: 'studentId', foreignField: '_id', as: 'student' } },
            { $unwind: '$student' },
            { $match: { 'student.branchId': branch._id } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ])

        res.json({
            branch, admins, teachers, students, groups,
            revenue: revenueAgg[0]?.total || 0,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createAdmin = async (req, res) => {
    try {
        const { name, phone, password, branchId } = req.body
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const admin = await User.create({ name, phone, passwordHash, role: 'admin', branchId })
        res.status(201).json({ admin: { id: admin._id, name: admin.name, branchId: admin.branchId } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listAdmins = async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' }).select('-passwordHash').populate('branchId', 'name')
        res.json({ admins })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateAdmin = async (req, res) => {
    try {
        const { name, phone, branchId, password } = req.body
        const update = { name, phone, branchId }
        if (password) {
            const salt = await bcrypt.genSalt(10)
            update.passwordHash = await bcrypt.hash(password, salt)
        }
        const admin = await User.findOneAndUpdate({ _id: req.params.id, role: 'admin' }, update, { new: true, runValidators: true }).select('-passwordHash')
        if (!admin) return res.status(404).json({ error: 'not_found' })
        res.json({ admin })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the admin profile modal - how many students they've registered overall and this month
export const getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findOne({ _id: req.params.id, role: 'admin' }).select('-passwordHash').populate('branchId', 'name')
        if (!admin) return res.status(404).json({ error: 'not_found' })

        const startOfThisMonthDate = startOfThisMonth()
        const totalStudentsAdded = await User.countDocuments({ role: 'student', createdByAdminId: admin._id })
        const studentsAddedThisMonth = await User.countDocuments({ role: 'student', createdByAdminId: admin._id, createdAt: { $gte: startOfThisMonthDate } })

        res.json({ admin, totalStudentsAdded, studentsAddedThisMonth })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteAdmin = async (req, res) => {
    try {
        await User.findOneAndDelete({ _id: req.params.id, role: 'admin' })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createTeacher = async (req, res) => {
    try {
        const { name, phone, password, branchId, additionalBranchIds } = req.body
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const teacher = await User.create({ name, phone, passwordHash, role: 'teacher', branchId, additionalBranchIds: additionalBranchIds || [] })
        res.status(201).json({ teacher: { id: teacher._id, name: teacher.name, branchId: teacher.branchId, additionalBranchIds: teacher.additionalBranchIds } })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' }).select('-passwordHash').populate('branchId', 'name').populate('additionalBranchIds', 'name')
        const activeGroups = await Group.find({ status: 'active' }).select('teacherId studentIds')

        const withStudentCounts = teachers.map(t => {
            const groupsForTeacher = activeGroups.filter(g => String(g.teacherId) === String(t._id))
            const uniqueStudents = new Set()
            groupsForTeacher.forEach(g => g.studentIds.forEach(id => uniqueStudents.add(String(id))))
            return { ...t.toObject(), activeStudentCount: uniqueStudents.size, activeGroupCount: groupsForTeacher.length }
        })

        res.json({ teachers: withStudentCounts })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getTeacherProfile = async (req, res) => {
    try {
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('-passwordHash').populate('branchId', 'name')
        if (!teacher) return res.status(404).json({ error: 'not_found' })

        const groups = await Group.find({ teacherId: teacher._id })
            .populate('languageId', 'name')
            .populate('levelId', 'name')

        const activeGroups = groups.filter(g => g.status === 'active')
        const uniqueStudentIds = new Set()
        activeGroups.forEach(g => g.studentIds.forEach(id => uniqueStudentIds.add(String(id))))

        res.json({
            teacher,
            employedSince: teacher.createdAt,
            totalStudents: uniqueStudentIds.size,
            activeGroupsCount: activeGroups.length,
            groups,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateTeacher = async (req, res) => {
    try {
        const { name, phone, branchId, password, additionalBranchIds } = req.body
        const update = { name, phone, branchId }
        if (additionalBranchIds !== undefined) update.additionalBranchIds = additionalBranchIds
        if (password) {
            const salt = await bcrypt.genSalt(10)
            update.passwordHash = await bcrypt.hash(password, salt)
        }
        const teacher = await User.findOneAndUpdate({ _id: req.params.id, role: 'teacher' }, update, { new: true, runValidators: true }).select('-passwordHash')
        if (!teacher) return res.status(404).json({ error: 'not_found' })
        res.json({ teacher })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteTeacher = async (req, res) => {
    try {
        await User.findOneAndDelete({ _id: req.params.id, role: 'teacher' })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const upsertPricing = async (req, res) => {
    try {
        const { languageId, levelId, monthlyPrice } = req.body
        const pricing = await Pricing.findOneAndUpdate({ languageId, levelId }, { monthlyPrice }, { upsert: true, new: true })
        res.json({ pricing })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listPricing = async (req, res) => {
    try {
        const pricing = await Pricing.find({}).populate('languageId', 'name code').populate('levelId', 'name order')
        res.json({ pricing })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deletePricing = async (req, res) => {
    try {
        await Pricing.findByIdAndDelete(req.params.id)
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the director-wide attendance overview - one calendar day at a time (defaults to today):
// which teachers checked in, how many students checked in per branch, and a per-group breakdown.
// Uses real scannedAt timestamps (calendar time), not each group's own 1-30 day cycle, so "today"
// or any past date means exactly what it says regardless of where each group's cycle currently is.
export const getAttendanceOverview = async (req, res) => {
    try {
        // UTC throughout, matching teacherController.scanOwnAttendance's write side exactly - a
        // "YYYY-MM-DD" query string is always UTC-parsed by `new Date(...)`, so zeroing locally
        // here (on a server not running in UTC) used to produce a different instant than the write
        // side and silently miss real check-ins. Range match, not exact equality, for the same
        // reason the student Attendance queries below already use $gte/$lt.
        const requestedDate = req.query.date ? new Date(req.query.date) : new Date()
        const startOfDay = new Date(requestedDate); startOfDay.setUTCHours(0, 0, 0, 0)
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

        const teachers = await User.find({ role: 'teacher' }).select('name branchId').populate('branchId', 'name')
        const teacherCheckIns = await TeacherAttendance.find({ date: { $gte: startOfDay, $lt: endOfDay } })
        const checkInByTeacher = Object.fromEntries(teacherCheckIns.map(t => [String(t.teacherId), t.scannedAt]))

        const teacherRows = teachers.map(t => ({
            teacherId: t._id,
            name: t.name,
            branchId: t.branchId?._id,
            branchName: t.branchId?.name,
            checkedIn: !!checkInByTeacher[String(t._id)],
            scannedAt: checkInByTeacher[String(t._id)] || null,
        }))

        const studentAttendanceByBranch = await Attendance.aggregate([
            { $match: { scannedAt: { $gte: startOfDay, $lt: endOfDay } } },
            { $lookup: { from: 'groups', localField: 'groupId', foreignField: '_id', as: 'group' } },
            { $unwind: '$group' },
            { $group: { _id: '$group.branchId', count: { $sum: 1 } } },
        ])

        // "how many came" only means something next to "out of how many total" - without this a
        // branch with 5 students showing 5 check-ins looks identical to a branch with 500 showing 5
        const totalStudentsByBranch = await User.aggregate([
            { $match: { role: 'student' } },
            { $group: { _id: '$branchId', count: { $sum: 1 } } },
        ])
        const totalByBranchId = Object.fromEntries(totalStudentsByBranch.map(r => [String(r._id), r.count]))
        const studentAttendanceByBranchWithPercent = studentAttendanceByBranch.map(row => {
            const total = totalByBranchId[String(row._id)] || 0
            return {
                _id: row._id,
                count: row.count,
                total,
                percent: total > 0 ? Math.round((row.count / total) * 100) : 0,
            }
        })

        const groupAttendanceRaw = await Attendance.aggregate([
            { $match: { scannedAt: { $gte: startOfDay, $lt: endOfDay } } },
            { $group: { _id: '$groupId', count: { $sum: 1 } } },
        ])
        const groupDocs = await Group.find({ _id: { $in: groupAttendanceRaw.map(g => g._id) } })
            .populate('languageId', 'name')
            .populate('levelId', 'name')
            .populate('teacherId', 'name')
            .populate('branchId', 'name')
        const groupRows = groupAttendanceRaw.map(g => {
            const group = groupDocs.find(doc => String(doc._id) === String(g._id))
            return {
                groupId: g._id,
                language: group?.languageId?.name,
                level: group?.levelId?.name,
                teacher: group?.teacherId?.name,
                branch: group?.branchId?.name,
                presentCount: g.count,
                totalCount: group?.studentIds.length || 0,
            }
        })

        res.json({ date: startOfDay, teachers: teacherRows, studentAttendanceByBranch: studentAttendanceByBranchWithPercent, groups: groupRows })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Branches ====

// api to add a new branch
export const createBranch = async (req, res) => {
    try {
        const { name } = req.body
        const branch = await Branch.create({ name })
        res.status(201).json({ branch })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'branch_name_taken' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to rename an existing branch
export const updateBranch = async (req, res) => {
    try {
        const { name } = req.body
        const branch = await Branch.findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true })
        if (!branch) return res.status(404).json({ error: 'not_found' })
        res.json({ branch })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'branch_name_taken' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to remove a branch - only allowed once it's empty (no students, admins, teachers or active
// groups still assigned to it) so deleting one can never silently orphan real people or classes
export const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id)
        if (!branch) return res.status(404).json({ error: 'not_found' })

        const [peopleCount, activeGroupCount] = await Promise.all([
            User.countDocuments({ branchId: branch._id, role: { $in: ['student', 'admin', 'teacher'] } }),
            Group.countDocuments({ branchId: branch._id, status: 'active' }),
        ])
        if (peopleCount > 0 || activeGroupCount > 0) {
            return res.status(409).json({ error: 'branch_not_empty', peopleCount, activeGroupCount })
        }

        await Branch.deleteOne({ _id: branch._id })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Languages (courses) ====

// api to add a new course language (e.g. Spanish)
export const createLanguage = async (req, res) => {
    try {
        const { code, name } = req.body
        const language = await Language.create({ code, name })
        res.status(201).json({ language })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'language_code_taken' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateLanguage = async (req, res) => {
    try {
        const { code, name } = req.body
        const language = await Language.findByIdAndUpdate(req.params.id, { code, name }, { new: true, runValidators: true })
        if (!language) return res.status(404).json({ error: 'not_found' })
        res.json({ language })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'language_code_taken' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to remove a course entirely - deletes every level under it (and each level's homework
// content, pricing, exam) then the language itself. Meant for undoing a wrong "add language".
export const deleteLanguage = async (req, res) => {
    try {
        const language = await Language.findById(req.params.id)
        if (!language) return res.status(404).json({ error: 'not_found' })

        const levelsToRemove = await Level.find({ languageId: language._id })
        for (const level of levelsToRemove) {
            await deleteLevelContent(language._id, level._id)
        }
        await Level.deleteMany({ languageId: language._id })
        await Language.findByIdAndDelete(language._id)

        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Levels ====

// api to add a new level within a language (e.g. Advanced, order 4)
export const createLevel = async (req, res) => {
    try {
        const { languageId, name, order, durationDays } = req.body
        const level = await Level.create({ languageId, name, order, durationDays: durationDays || 300 })
        res.status(201).json({ level })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateLevel = async (req, res) => {
    try {
        const { name, order, durationDays } = req.body
        const update = { name, order }
        if (durationDays !== undefined) update.durationDays = durationDays
        const level = await Level.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
        if (!level) return res.status(404).json({ error: 'not_found' })
        res.json({ level })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to remove a level - deletes its homework content, pricing and exam along with it. Meant for
// undoing a wrong "add level" while setting up a course.
export const deleteLevel = async (req, res) => {
    try {
        const level = await Level.findById(req.params.id)
        if (!level) return res.status(404).json({ error: 'not_found' })

        await deleteLevelContent(level.languageId, level._id)
        await Level.findByIdAndDelete(level._id)

        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Settings ====

// api to update global settings (passport requirement, which languages students may switch the
// student app into) - upserts the single settings document
export const updateSettings = async (req, res) => {
    try {
        const { passportRequired, enabledStudentLanguages } = req.body
        const update = {}
        if (passportRequired !== undefined) update.passportRequired = passportRequired
        if (enabledStudentLanguages !== undefined) update.enabledStudentLanguages = enabledStudentLanguages
        const settings = await Settings.findOneAndUpdate(
            {},
            update,
            { new: true, upsert: true, runValidators: true }
        )
        res.json({ settings })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Groups (director-wide, no branch restriction) ====

// api to list every group across every branch - used for the director's group-limits management view
export const listAllGroups = async (req, res) => {
    try {
        const groups = await Group.find({})
            .populate('branchId', 'name')
            .populate('languageId', 'name')
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

// api for the director to adjust a group's capacity (and, if needed, teacher/schedule/time) -
// same conflict check as the admin version, just without the branch restriction
export const updateGroupLimits = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
        if (!group) return res.status(404).json({ error: 'not_found' })

        const { teacherId, schedulePattern, time, capacity } = req.body
        const nextTeacherId = teacherId || group.teacherId
        const nextSchedule = schedulePattern || group.schedulePattern
        const nextTime = time || group.time

        if (String(nextTeacherId) !== String(group.teacherId) || nextSchedule !== group.schedulePattern || nextTime !== group.time) {
            await assertNoScheduleConflict({
                teacherId: nextTeacherId, schedulePattern: nextSchedule, customDays: group.customDays,
                time: nextTime, durationMinutes: group.durationMinutes, excludeGroupId: group._id,
            })
        }

        group.teacherId = nextTeacherId
        group.schedulePattern = nextSchedule
        group.time = nextTime
        if (capacity) group.capacity = capacity
        await group.save()

        res.json({ group })
    } catch (error) {
        if (error.code === 'teacher_schedule_conflict') return res.status(409).json({ error: error.code })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// director's cross-branch timetable view - a specific branchId must be chosen (rooms/lessons are
// inherently per-branch, there's no single combined "every room across every branch" grid that
// would make sense to render at once)
export const getTodayTimetable = async (req, res) => {
    try {
        if (!req.query.branchId) return res.status(400).json({ error: 'branch_required' })

        const requestedDate = req.query.date ? new Date(req.query.date) : new Date()
        const startOfDay = new Date(Date.UTC(requestedDate.getUTCFullYear(), requestedDate.getUTCMonth(), requestedDate.getUTCDate()))
        const endOfDay = new Date(startOfDay); endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

        const branchGroups = await Group.find({ branchId: req.query.branchId, status: 'active' })
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

        const rooms = await Room.find({ branchId: req.query.branchId }).sort({ name: 1 })

        res.json({ date: startOfDay, rooms, lessons: rows })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Finance / Salary (director) - mirrors adminController's own Finance/Salary endpoints
// exactly, just scoped to whichever branchId the director has explicitly picked from a switcher
// instead of req.auth.branchId, since a director isn't tied to a single home branch. Reuses the
// exact same service functions adminController calls so the numbers can never disagree between
// the two roles' views of the same branch. ====

export const getFinanceOverview = async (req, res) => {
    try {
        if (!req.query.branchId) return res.status(400).json({ error: 'branch_required' })
        const result = await getFinanceOverviewService(req.query.branchId, req.query)
        res.json(result)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getBusinessLedger = async (req, res) => {
    try {
        const { branchId, dateFrom, dateTo } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })
        const result = await computeBusinessLedger(branchId, startOfLocalDay(dateFrom), endOfLocalDay(dateTo))
        res.json(result)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

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
        res.json({ payment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listPayRates = async (req, res) => {
    try {
        if (!req.query.branchId) return res.status(400).json({ error: 'branch_required' })
        const rates = await TeacherPayRate.find({ branchId: req.query.branchId }).populate('teacherId', 'name')
        res.json({ rates })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const setPayRate = async (req, res) => {
    try {
        const { branchId, teacherId, rateType, rateValue } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!PAY_RATE_TYPES.includes(rateType)) return res.status(400).json({ error: 'invalid_rate_type' })

        const rate = await TeacherPayRate.findOneAndUpdate(
            { branchId, teacherId: teacherId || null },
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
        if (!req.query.branchId) return res.status(400).json({ error: 'branch_required' })
        await TeacherPayRate.findOneAndDelete({ _id: req.params.id, branchId: req.query.branchId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const calculateSalary = async (req, res) => {
    try {
        const { branchId, dateFrom, dateTo } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const rates = await TeacherPayRate.find({ branchId })
        const from = startOfLocalDay(dateFrom)
        const to = endOfLocalDay(dateTo)

        const results = await calculateSalaries(branchId, rates, from, to)
        res.json({ results })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getSalaryDetail = async (req, res) => {
    try {
        const { branchId, dateFrom, dateTo } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const rates = await TeacherPayRate.find({ branchId })
        const from = startOfLocalDay(dateFrom)
        const to = endOfLocalDay(dateTo)

        const detail = await getTeacherSalaryDetail(branchId, req.params.teacherId, rates, from, to)
        if (!detail) return res.status(404).json({ error: 'not_found' })
        res.json({ detail })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const paySalary = async (req, res) => {
    try {
        const { branchId, teacherId, amount, dateFrom, dateTo, method } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!teacherId || !amount) return res.status(400).json({ error: 'missing_fields' })
        if (!EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const teacher = await User.findById(teacherId).select('name')
        await ensureDefaultCategories(branchId)
        const expense = await Expense.create({
            branchId, category: 'Salary', amount, teacherId,
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
