// director sees every branch with no restriction - this controller only ever calls services/models,
// no business rules are decided in here
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import User from "../models/User.js"
import Branch from "../models/Branch.js"
import Payment from "../models/Payment.js"
import Group from "../models/Group.js"
import Pricing from "../models/Pricing.js"
import { getOrCreateAccount, postEntry, deleteEntries, formatAmount } from "../services/ledger.service.js"
import Account from "../models/Account.js"
import { computeCourseOwed, recomputeEnrollmentStatus } from "../services/billingCycle.service.js"
import Language from "../models/Language.js"
import CourseCategory from "../models/CourseCategory.js"
import Level from "../models/Level.js"
import Settings from "../models/Settings.js"
import ExamAttempt from "../models/ExamAttempt.js"
import Attendance from "../models/Attendance.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import Room from "../models/Room.js"
import Lesson from "../models/Lesson.js"
import TeacherPayRate, { PAY_RATE_TYPES } from "../models/TeacherPayRate.js"
import Expense, { EXPENSE_METHODS } from "../models/Expense.js"
import ExpenseCategory from "../models/ExpenseCategory.js"
import LedgerEntry from "../models/LedgerEntry.js"
import { assertNoScheduleConflict } from "../services/scheduleConflict.service.js"
import { computeDayCounter } from "../services/dayCounter.service.js"
import { earliestLessonTimeOnDate, isLateCheckIn } from "../services/scheduleDays.service.js"
import { deleteLevelContent, deleteDayContent } from "../services/contentCascade.service.js"
import { calculateSalaries, getTeacherSalaryDetail } from "../services/salaryCalculation.service.js"
import { getFinanceOverview as getFinanceOverviewService } from "../services/financeOverview.service.js"
import { startOfLocalDay, endOfLocalDay } from "../services/businessTime.service.js"
import { ensureDefaultCategories, ensureCategoryExists, SALARY_CATEGORY, PREPAYMENT_CATEGORY, OTHER_CATEGORY } from "../services/expenseCategories.service.js"
import { computeBusinessLedger } from "../services/businessLedger.service.js"
import { hardDeleteStudent } from "../services/studentCascade.service.js"
import { hardDeleteTeacher } from "../services/teacherCascade.service.js"

const startOfThisMonth = () => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
}

// sub_director is a director scoped to exactly one branch (see requireRole gating in
// directorRoute.js - Overview/Admins/Homework routes never reach these functions at all for that
// role). Everywhere else, a real director sees everything; a sub_director gets these filters
// merged in so every list/lookup below is silently narrowed to their own branchId.
const isSubDirector = (req) => req.auth.role === 'sub_director'
const branchOnlyFilter = (req, field = 'branchId') => isSubDirector(req) ? { [field]: req.auth.branchId } : {}
// teachers can belong to a branch via their home branchId OR via additionalBranchIds (Phase 1.5
// multi-branch support) - membership, not equality, same convention used everywhere else a
// teacher's branch access is checked
const teacherBranchMembershipFilter = (req) => isSubDirector(req)
    ? { $or: [{ branchId: req.auth.branchId }, { additionalBranchIds: req.auth.branchId }] }
    : {}
const teacherBelongsToBranch = (teacher, branchId) =>
    String(teacher.branchId) === String(branchId) || (teacher.additionalBranchIds || []).some(id => String(id) === String(branchId))

// lets the frontend know its own role/branchId on every load (not just right after login) -
// nothing here needs a DB read, the JWT payload already carries it
export const getMe = async (req, res) => {
    res.json({ id: req.auth.userId, role: req.auth.role, branchId: req.auth.branchId })
}

// same real-world boundary as salaryCalculation.service.js's LEGACY_BILLING_CUTOFF and
// adminController.js's LEGACY_PAYROLL_CUTOFF - every branch ran on a different, non-platform system
// through August 2026, and some of that pre-launch history was manually backdated into real Payment
// records (the technique used by hand before adjustStudentBalance existed to reconcile a student's
// balance) rather than a real payment. One-time exception, confirmed with the user: the Overview
// page's "Revenue by branch" chart is the one place that still summed EVERY Payment ever, all-time,
// with no date floor at all - those backdated 2024/2025 corrections were silently inflating it and
// making the branch comparison misleading. Every other revenue figure in the app (Finance, Salary,
// Business Ledger) already takes an explicit date range from the caller, so this is the only spot
// that needed its own floor.
const OVERVIEW_REVENUE_CUTOFF = new Date(Date.UTC(2026, 8, 1))

export const getStats = async (req, res) => {
    try {
        const revenueByBranch = await Payment.aggregate([
            { $match: { date: { $gte: OVERVIEW_REVENUE_CUTOFF } } },
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
            { $match: { status: 'active', levelCompletedAt: null } },
            { $unwind: '$studentIds' },
            { $group: { _id: '$teacherId', students: { $addToSet: '$studentIds' } } },
            { $project: { teacherId: '$_id', count: { $size: '$students' } } },
            { $sort: { count: -1 } },
            { $limit: 3 },
        ])
        const teacherDocs = await User.find({ _id: { $in: topTeachersRaw.map(t => t.teacherId) } }).select('name branchId').populate('branchId', 'name').lean()
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
        const allTeacherDocs = await User.find({ role: 'teacher' }).select('name branchId').populate('branchId', 'name').lean()
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
        const students = await User.find({ role: 'student', ...branchOnlyFilter(req) }).select('-passwordHash')
            .populate('branchId', 'name')
            .populate('courses.languageId', 'name')
            .populate('courses.levelId', 'name')
            .lean()

        // real stored balance (see server/models/Account.js) - positive means the student owes
        // that much, negative means they're in credit. Same one bulk query pattern as
        // adminController.listStudents so this list's "Total balance" column isn't dead-reckoned
        // off the retired per-course balance field.
        const accounts = await Account.find({ ownerType: 'student', ownerId: { $in: students.map(s => s._id) } }).select('ownerId balance').lean()
        const balanceByStudentId = new Map(accounts.map(a => [String(a.ownerId), a.balance]))
        for (const student of students) student.owed = balanceByStudentId.get(String(student._id)) || 0

        res.json({ students })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// director version of the student profile - INCLUDES address/geo (admin's version does not)
export const getStudentProfile = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, role: 'student', ...branchOnlyFilter(req) }).select('-passwordHash')
            .populate('branchId', 'name')
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
        const examAttempts = await ExamAttempt.find({ studentId: student._id }).sort({ date: -1 })
            .populate({ path: 'examId', populate: [{ path: 'languageId', select: 'name' }, { path: 'levelId', select: 'name' }] })
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
            examAttempts,
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// director-only manual override: retype a student's balance to whatever real-world number is
// actually correct (this platform is new - a lot of students arrived with history it never saw).
// This is the exact same reconciliation technique used by hand all through the migration (see
// project history), but made unconditionally safe rather than "safe as long as the student happens
// to have older debt lying around to absorb it" (an early version of this used a payment+expense
// pair for the reduce path - a real, empirically-confirmed bug: billingCycle.service.js's
// foldReversalsAndAllocate pools ALL payment/expense/discount cash on an account into ONE total,
// regardless of that cash's own date, then spends it against every 'debt' entry oldest-first BY THE
// DEBT'S OWN period, not the payment's. A student with no older debt to soak up the fabricated cash
// would have it spill onto their real, current, teacher-attributed debt instead - verified live: a
// teacher's percent_of_revenue salary jumped from 0 to a nonzero figure purely from a director
// "reducing" a student's balance, with zero real money involved).
//   - target < current balance (need to erase some debt): a single-leg 'opening_balance' entry
//     (student decrease only). 'opening_balance' is deliberately excluded from
//     billingCycle.service.js's ALLOCATION_KINDS - the one kind that documents a balance change
//     without ever entering the FIFO cash-vs-debt pool, so it can NEVER be attributed to covering any
//     debt (real or legacy) and can NEVER reach a teacher's revenue calc, regardless of what other
//     debts exist on the account. No branch-side leg at all: no real cash moved, so branch cash must
//     never move either - the old payment+expense pairing was solving a problem (branch cash staying
//     net-zero) that a single-leg entry never creates in the first place.
//   - target > current balance (need to add debt they genuinely owe but was never entered): a
//     single-leg debt entry on the student's account only - never touches branch cash at all, same
//     as a normal recognized period. Attached to their one current course when they have exactly
//     one (so it still shows correctly in that course's own balance breakdown); left unattributed
//     to any specific course when they have zero or more than one, rather than guessing which. This
//     side was always safe "regardless of allocation order" since periodStart/periodEnd (what
//     computeRevenueForGroup actually filters on) are stamped 2024-01-01 on the debt entry ITSELF.
// Either way, dating it 2024-01-01 keeps it permanently outside the legacy salary cutoff - no rate
// type, on any teacher, is ever affected by this correction, by construction, not by convention.
const ARTIFICIAL_CORRECTION_DATE = new Date(Date.UTC(2024, 0, 1))

export const adjustStudentBalance = async (req, res) => {
    try {
        const { targetBalance } = req.body
        if (typeof targetBalance !== 'number' || !Number.isFinite(targetBalance)) {
            return res.status(400).json({ error: 'invalid_target_balance' })
        }

        const student = await User.findOne({ _id: req.params.id, role: 'student', ...branchOnlyFilter(req) })
        if (!student) return res.status(404).json({ error: 'not_found' })

        const account = await getOrCreateAccount('student', student._id)
        const diff = Math.round(account.balance - targetBalance)
        // sub-so'm rounding noise only - nothing to post, the balance already reads as the target
        if (Math.abs(diff) < 1) return res.json({ adjusted: false, balance: account.balance })

        const description = 'Ручная корректировка баланса (архивные данные до сентября 2026)'

        if (diff > 0) {
            // reducing debt by `diff` - single-leg, student account only, kind:'opening_balance' so
            // it can never be pooled as "cash" against any debt (see the comment block above)
            await postEntry({
                accountId: account._id, direction: 'decrease', amount: diff, kind: 'opening_balance',
                description, createdBy: req.auth.userId, date: ARTIFICIAL_CORRECTION_DATE,
            })
        } else {
            const increaseAmount = -diff
            const coursesWithGroup = student.courses.filter(c => c.groupId)
            const soleCourse = coursesWithGroup.length === 1 ? coursesWithGroup[0] : null
            const group = soleCourse ? await Group.findById(soleCourse.groupId).select('teacherId').lean() : null

            await postEntry({
                accountId: account._id, direction: 'increase', amount: increaseAmount, kind: 'debt',
                meta: {
                    studentId: student._id,
                    ...(soleCourse ? {
                        groupId: soleCourse.groupId, languageId: soleCourse.languageId, levelId: soleCourse.levelId,
                        teacherId: group?.teacherId || null,
                    } : {}),
                    periodStart: ARTIFICIAL_CORRECTION_DATE, periodEnd: ARTIFICIAL_CORRECTION_DATE,
                },
                description, createdBy: req.auth.userId, date: ARTIFICIAL_CORRECTION_DATE,
            })
        }

        await recomputeEnrollmentStatus(student)
        await student.save()

        const updatedAccount = await Account.findById(account._id).lean()
        res.json({ adjusted: true, balance: updatedAccount.balance })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// genuine, permanent delete - erases the student and every record referencing them (payments,
// attendance, exam history, homework progress, group membership, parent links). Irreversible - the
// frontend gates this behind its own explicit warning confirm before ever calling it. A
// sub_director can only ever reach their own branch's students (branchOnlyFilter below); a real
// director has no such restriction.
export const permanentlyDeleteStudent = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, role: 'student', ...branchOnlyFilter(req) }).lean()
        if (!student) return res.status(404).json({ error: 'not_found' })
        await hardDeleteStudent(student._id)
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the branch detail modal - who works there, how many students, how much revenue
export const getBranchProfile = async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id).lean()
        if (!branch) return res.status(404).json({ error: 'not_found' })

        const admins = await User.find({ role: 'admin', branchId: branch._id }).select('name phone').lean()
        // a teacher may also teach here via additionalBranchIds even if this isn't their home branch
        const teachers = await User.find({
            role: 'teacher',
            $or: [{ branchId: branch._id }, { additionalBranchIds: branch._id }],
        }).select('name phone').lean()
        const students = await User.find({ role: 'student', branchId: branch._id }).select('name phone courses').lean()
        const groups = await Group.find({ branchId: branch._id, status: 'active' }).populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name').lean()

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

// this whole section (create/list/update/delete/profile) also doubles as sub_director account
// management - a sub_director is just an admin-shaped account with a different role, so the same
// endpoints serve both. A real director can create/edit/remove either kind, anywhere. A
// sub_director can ALSO reach these (unlike Overview/Branches/Homework) but only ever to manage
// plain 'admin' accounts within their own branch - they can never create/see/touch a sub_director
// account (including their own), and never another branch's admins.
const MANAGEABLE_ROLES = ['admin', 'sub_director']

export const createAdmin = async (req, res) => {
    try {
        const { name, phone, password, role } = req.body
        // a sub_director can only ever create a plain admin in their own branch - role and
        // branchId from the request body are both ignored for that role, never trusted
        const finalRole = isSubDirector(req) ? 'admin' : (role === 'sub_director' ? 'sub_director' : 'admin')
        const branchId = isSubDirector(req) ? req.auth.branchId : req.body.branchId
        if (finalRole === 'sub_director' && !branchId) return res.status(400).json({ error: 'branch_required' })
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const admin = await User.create({ name, phone, passwordHash, role: finalRole, branchId })
        res.status(201).json({ admin: { id: admin._id, name: admin.name, role: admin.role, branchId: admin.branchId } })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listAdmins = async (req, res) => {
    try {
        // a sub_director's own "Admins" page only ever shows plain admins in their own branch -
        // never sub_directors (including themselves), never another branch's staff
        const filter = isSubDirector(req)
            ? { role: 'admin', branchId: req.auth.branchId }
            : { role: { $in: MANAGEABLE_ROLES } }
        const admins = await User.find(filter).select('-passwordHash').populate('branchId', 'name').lean()
        res.json({ admins })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateAdmin = async (req, res) => {
    try {
        const existing = await User.findOne({ _id: req.params.id, role: { $in: MANAGEABLE_ROLES } }).lean()
        if (!existing) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && (existing.role !== 'admin' || String(existing.branchId) !== String(req.auth.branchId))) {
            return res.status(404).json({ error: 'not_found' })
        }

        const { name, phone, branchId, password } = req.body
        // a sub_director can't move an admin to a different branch - their own branch is the only
        // one they're allowed to touch
        const update = isSubDirector(req) ? { name, phone } : { name, phone, branchId }
        if (password) {
            const salt = await bcrypt.genSalt(10)
            update.passwordHash = await bcrypt.hash(password, salt)
        }
        const admin = await User.findOneAndUpdate({ _id: req.params.id, role: { $in: MANAGEABLE_ROLES } }, update, { new: true, runValidators: true }).select('-passwordHash')
        if (!admin) return res.status(404).json({ error: 'not_found' })
        res.json({ admin })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the admin profile modal - how many students they've registered overall and this month.
// Meaningless for a sub_director (nothing sets createdByAdminId to their id) - just shows 0s, no
// special-casing needed.
export const getAdminProfile = async (req, res) => {
    try {
        const admin = await User.findOne({ _id: req.params.id, role: { $in: MANAGEABLE_ROLES } }).select('-passwordHash').populate('branchId', 'name').lean()
        if (!admin) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && (admin.role !== 'admin' || String(admin.branchId?._id || admin.branchId) !== String(req.auth.branchId))) {
            return res.status(404).json({ error: 'not_found' })
        }

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
        const existing = await User.findOne({ _id: req.params.id, role: { $in: MANAGEABLE_ROLES } }).lean()
        if (!existing) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && (existing.role !== 'admin' || String(existing.branchId) !== String(req.auth.branchId))) {
            return res.status(404).json({ error: 'not_found' })
        }
        await User.deleteOne({ _id: existing._id })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createTeacher = async (req, res) => {
    try {
        const { name, phone, password, additionalBranchIds, registeredAt } = req.body
        // a sub_director can only ever create teachers in their own branch - their own branchId
        // wins regardless of whatever the request body says, and they can't grant multi-branch
        // access to a branch they don't themselves belong to
        const branchId = isSubDirector(req) ? req.auth.branchId : req.body.branchId
        const finalAdditionalBranchIds = isSubDirector(req) ? [] : (additionalBranchIds || [])
        // optional - same "backdate a real-world event that's only being entered today" pattern as
        // adminController.createStudent's own registeredAt - a teacher who actually started earlier
        // shouldn't show "today" as their join date just because that's when someone got around to
        // typing them in.
        let createdAt
        if (registeredAt) {
            createdAt = new Date(registeredAt)
            if (isNaN(createdAt) || createdAt > new Date()) return res.status(400).json({ error: 'invalid_registration_date' })
        }
        const salt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, salt)
        const teacher = await User.create({ name, phone, passwordHash, role: 'teacher', branchId, additionalBranchIds: finalAdditionalBranchIds, ...(createdAt ? { createdAt } : {}) })
        res.status(201).json({ teacher: { id: teacher._id, name: teacher.name, branchId: teacher.branchId, additionalBranchIds: teacher.additionalBranchIds } })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'phone_already_in_use' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listTeachers = async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher', ...teacherBranchMembershipFilter(req) }).select('-passwordHash').populate('branchId', 'name').populate('additionalBranchIds', 'name')
        const activeGroups = await Group.find({ status: 'active', levelCompletedAt: null }).select('teacherId studentIds').lean()

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
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).select('-passwordHash').populate('branchId', 'name').lean()
        if (!teacher) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && !teacherBelongsToBranch(teacher, req.auth.branchId)) return res.status(404).json({ error: 'not_found' })

        const groups = await Group.find({ teacherId: teacher._id })
            .populate('languageId', 'name')
            .populate('levelId', 'name')
            .lean()

        const activeGroups = groups.filter(g => g.status === 'active' && !g.levelCompletedAt)
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
        const existing = await User.findOne({ _id: req.params.id, role: 'teacher' }).lean()
        if (!existing) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && !teacherBelongsToBranch(existing, req.auth.branchId)) return res.status(404).json({ error: 'not_found' })

        const { name, phone, branchId, password, additionalBranchIds } = req.body
        // a sub_director can't move a teacher to a different branch or grant multi-branch access -
        // their own branch is the only one they're allowed to touch
        const update = isSubDirector(req) ? { name, phone } : { name, phone, branchId }
        if (!isSubDirector(req) && additionalBranchIds !== undefined) update.additionalBranchIds = additionalBranchIds
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
        const teacher = await User.findOne({ _id: req.params.id, role: 'teacher' }).lean()
        if (!teacher) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && !teacherBelongsToBranch(teacher, req.auth.branchId)) return res.status(404).json({ error: 'not_found' })
        // confirmed real gap (found live): hardDeleteTeacher only cleans up the teacher's OWN records
        // (account/pay rates/attendance) - it never touches Group.teacherId. Deleting a teacher who
        // still runs active groups left those groups pointing at a now-nonexistent user forever, AND
        // silently dropped them out of every future salary calculation entirely (calculateSalaries
        // only ever looks at CURRENTLY EXISTING teacher Users, so an orphaned group's revenue just
        // stopped being credited to anyone) while the group itself kept billing students normally -
        // tuition collected, nobody paid to teach it. Reassign or archive their groups first.
        const hasActiveGroups = await Group.exists({ teacherId: teacher._id, status: 'active' })
        if (hasActiveGroups) return res.status(400).json({ error: 'teacher_has_active_groups' })
        await hardDeleteTeacher(teacher._id)
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// one price per COURSE (language), not per level - a course can have zero levels at all and still
// needs a price, and even a course WITH levels charges the same price regardless of which level a
// given group is running
export const upsertPricing = async (req, res) => {
    try {
        const { languageId, monthlyPrice } = req.body
        // a zero/negative price here silently breaks billing for every group of this course from
        // then on - computePeriodCost/recognizeNextPeriod both correctly refuse to post a debt of
        // 0 or less, so nothing crashes, but nobody using this course ever gets billed again either,
        // with no error surfaced anywhere to explain why
        if (!(monthlyPrice > 0)) return res.status(400).json({ error: 'invalid_price' })
        const pricing = await Pricing.findOneAndUpdate({ languageId }, { monthlyPrice }, { upsert: true, new: true })
        res.json({ pricing })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listPricing = async (req, res) => {
    try {
        const pricing = await Pricing.find({}).populate('languageId', 'name code').lean()
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

        const teachers = await User.find({ role: 'teacher', ...teacherBranchMembershipFilter(req) })
            .select('name branchId additionalBranchIds').populate('branchId', 'name').populate('additionalBranchIds', 'name').lean()
        // a check-in only ever counts for the branch whose QR was actually scanned (its own
        // branchId), never the teacher's home branch - a multi-branch teacher can show up correctly
        // under more than one branch card below, each reflecting only that branch's real check-ins
        const teacherCheckIns = await TeacherAttendance.find({ date: { $gte: startOfDay, $lt: endOfDay } }).sort({ scannedAt: 1 }).lean()
        const checkInsByTeacherBranch = {}
        for (const c of teacherCheckIns) {
            const key = `${c.teacherId}_${c.branchId}`
            if (!checkInsByTeacherBranch[key]) checkInsByTeacherBranch[key] = []
            checkInsByTeacherBranch[key].push(c.scannedAt)
        }
        const allGroups = await Group.find({ teacherId: { $in: teachers.map(t => t._id) } }).lean()

        // a sub_director's teacher list is already branch-scoped above, but a teacher can also
        // teach a group OUTSIDE this branch via additionalBranchIds - narrow the student-side
        // aggregates below to this branch's own groups specifically, not just "this branch's teachers'" groups
        const branchGroupIds = isSubDirector(req) ? (await Group.find({ branchId: req.auth.branchId }).select('_id').lean()).map(g => g._id) : null

        // one row per (teacher, branch they actually belong to) - a sub_director only ever sees
        // their own single branch per teacher, a full director sees every branch a teacher belongs
        // to (home + additional), each with its own independent check-in status
        const teacherRows = []
        for (const t of teachers) {
            const relevantBranches = isSubDirector(req)
                ? [{ _id: req.auth.branchId, name: t.branchId?.name }]
                : [t.branchId, ...(t.additionalBranchIds || [])].filter(Boolean)
            for (const branch of relevantBranches) {
                const todaysCheckIns = checkInsByTeacherBranch[`${t._id}_${branch._id}`] || []
                const firstLessonTime = earliestLessonTimeOnDate(
                    allGroups.filter(g => String(g.teacherId) === String(t._id) && String(g.branchId) === String(branch._id)), startOfDay,
                )
                teacherRows.push({
                    teacherId: t._id,
                    name: t.name,
                    branchId: branch._id,
                    branchName: branch.name,
                    checkedIn: todaysCheckIns.length > 0,
                    scannedAt: todaysCheckIns[0] || null,
                    checkIns: todaysCheckIns,
                    firstLessonTime, late: isLateCheckIn(todaysCheckIns[0] || null, firstLessonTime),
                })
            }
        }

        const studentAttendanceByBranch = await Attendance.aggregate([
            { $match: { scannedAt: { $gte: startOfDay, $lt: endOfDay }, ...(branchGroupIds ? { groupId: { $in: branchGroupIds } } : {}) } },
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
            { $match: { scannedAt: { $gte: startOfDay, $lt: endOfDay }, ...(branchGroupIds ? { groupId: { $in: branchGroupIds } } : {}) } },
            { $group: { _id: '$groupId', count: { $sum: 1 } } },
        ])
        const groupDocs = await Group.find({ _id: { $in: groupAttendanceRaw.map(g => g._id) } })
            .populate('languageId', 'name')
            .populate('levelId', 'name')
            .populate('teacherId', 'name')
            .populate('branchId', 'name')
            .lean()
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
        const branch = await Branch.findById(req.params.id).lean()
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
        const { code, name, categoryIds } = req.body
        const language = await Language.create({ code, name, categoryIds: categoryIds || [] })
        res.status(201).json({ language })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'language_code_taken' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateLanguage = async (req, res) => {
    try {
        const { code, name, categoryIds } = req.body
        const language = await Language.findByIdAndUpdate(req.params.id, { code, name, categoryIds: categoryIds || [] }, { new: true, runValidators: true })
        if (!language) return res.status(404).json({ error: 'not_found' })
        res.json({ language })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'language_code_taken' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Course tags (categories) - global managed list, see CourseCategory.js ====

export const listCourseCategories = async (req, res) => {
    try {
        const categories = await CourseCategory.find({}).sort({ name: 1 }).lean()
        res.json({ categories })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createCourseCategory = async (req, res) => {
    try {
        const { name } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const category = await CourseCategory.create({ name: name.trim() })
        res.status(201).json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateCourseCategory = async (req, res) => {
    try {
        const { name } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const category = await CourseCategory.findByIdAndUpdate(req.params.id, { name: name.trim() }, { new: true, runValidators: true })
        if (!category) return res.status(404).json({ error: 'not_found' })
        res.json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// courses reference the tag by id, so deleting it just needs to pull that id out of any course that
// had it attached - no name-cascade needed (see the model comment)
export const deleteCourseCategory = async (req, res) => {
    try {
        const category = await CourseCategory.findById(req.params.id)
        if (!category) return res.status(404).json({ error: 'not_found' })
        await Language.updateMany({ categoryIds: category._id }, { $pull: { categoryIds: category._id } })
        await category.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api to remove a course entirely - deletes every level under it (and each level's homework
// content, pricing, exam) then the language itself. Meant for undoing a wrong "add language".
export const deleteLanguage = async (req, res) => {
    try {
        const language = await Language.findById(req.params.id).lean()
        if (!language) return res.status(404).json({ error: 'not_found' })

        // confirmed real gap (same class already found on deleteTeacher this session): nothing here
        // checked whether any group still actually runs this course before wiping every level,
        // every piece of homework content, and the language itself - real students in an active
        // group would be left pointing at levelId/languageId values that no longer exist anywhere,
        // breaking billing's own Level lookups (durationDays, courseHasLevels) and every populated
        // language/level name across the whole platform for them, silently, with no error anywhere.
        const hasActiveGroups = await Group.exists({ languageId: language._id, status: 'active' })
        if (hasActiveGroups) return res.status(400).json({ error: 'language_has_active_groups' })

        const levelsToRemove = await Level.find({ languageId: language._id }).lean()
        for (const level of levelsToRemove) {
            await deleteLevelContent(language._id, level._id)
        }
        await Level.deleteMany({ languageId: language._id })
        // Pricing is per-course now (not routed through deleteLevelContent, which is level-scoped) -
        // a language with zero levels would otherwise leave its price row permanently orphaned
        await Pricing.deleteMany({ languageId: language._id })
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
        const { languageId, name, order, durationDays, hasReading } = req.body
        const level = await Level.create({ languageId, name, order, durationDays: durationDays || 300, hasReading: hasReading !== false })
        res.status(201).json({ level })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateLevel = async (req, res) => {
    try {
        const { name, order, durationDays, hasReading } = req.body
        const update = { name, order }
        if (durationDays !== undefined) update.durationDays = durationDays
        if (hasReading !== undefined) update.hasReading = hasReading
        const level = await Level.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
        if (!level) return res.status(404).json({ error: 'not_found' })
        res.json({ level })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// api for the Homework builder's "delete last lesson" - the mirror of "+ Add lesson": removes
// whatever content sits on the level's current LAST day (if any was authored) and shrinks
// durationDays by 1. Always operates on the trailing day, never an arbitrary one, so nothing ever
// needs renumbering.
export const deleteLastLesson = async (req, res) => {
    try {
        const level = await Level.findById(req.params.id)
        if (!level) return res.status(404).json({ error: 'not_found' })
        if (level.durationDays <= 1) return res.status(409).json({ error: 'cannot_delete_only_lesson' })

        await deleteDayContent(level.languageId, level._id, level.durationDays)
        level.durationDays -= 1
        await level.save()

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
        const level = await Level.findById(req.params.id).lean()
        if (!level) return res.status(404).json({ error: 'not_found' })

        // same gap just found and fixed on deleteLanguage - a group still actively running this
        // exact level would be left pointing at a levelId that no longer resolves to anything
        const hasActiveGroups = await Group.exists({ levelId: level._id, status: 'active' })
        if (hasActiveGroups) return res.status(400).json({ error: 'level_has_active_groups' })

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
        const groups = await Group.find({ ...branchOnlyFilter(req) })
            .populate('branchId', 'name')
            .populate('languageId', 'name')
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

// api for the director to adjust a group's capacity (and, if needed, teacher/schedule/time) -
// same conflict check as the admin version, just without the branch restriction
export const updateGroupLimits = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
        if (!group) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && String(group.branchId) !== String(req.auth.branchId)) return res.status(404).json({ error: 'not_found' })

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

        const branchGroups = await Group.find({ branchId: req.query.branchId, status: 'active', levelCompletedAt: null })
            .populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name').populate('roomId', 'name')
            .lean()
        const groupIds = branchGroups.map(g => g._id)

        const lessons = await Lesson.find({ groupId: { $in: groupIds }, date: { $gte: startOfDay, $lt: endOfDay } }).sort({ startTime: 1 }).lean()
        const rows = lessons.map(l => {
            const group = branchGroups.find(g => String(g._id) === String(l.groupId))
            return {
                lessonId: l._id, startTime: l.startTime, endTime: l.endTime,
                room: group?.roomId?.name || '—', roomId: group?.roomId?._id || null,
                name: group?.name || null, language: group?.languageId?.name, level: group?.levelId?.name, teacher: group?.teacherId?.name,
                groupId: group?._id,
            }
        })

        const rooms = await Room.find({ branchId: req.query.branchId }).sort({ name: 1 }).lean()

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

// ==== Expenses (director) - mirrors expenseController.js's admin-facing Expenses tab exactly
// (same categories, same Expense/LedgerEntry posting, same same-day edit lock), just scoped to
// whichever branchId the director's Finance switcher has selected instead of req.auth.branchId,
// the same adaptation already used above for Finance/Salary. Confirmed gap: admin and Shanti both
// already had full expense management, director had none at all - a director could only ever VIEW
// expenses indirectly through the Business Ledger/Net Profit figures, never manage them directly. ====

export const listExpenseCategoriesDirector = async (req, res) => {
    try {
        const { branchId } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        await ensureDefaultCategories(branchId)
        const categories = await ExpenseCategory.find({ branchId }).sort({ name: 1 }).lean()
        res.json({ categories })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createExpenseCategoryDirector = async (req, res) => {
    try {
        const { branchId, name, color } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const category = await ExpenseCategory.create({ branchId, name: name.trim(), color: color || '#7A7266' })
        res.status(201).json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateExpenseCategoryDirector = async (req, res) => {
    try {
        const { branchId, name, color } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const category = await ExpenseCategory.findOne({ _id: req.params.id, branchId })
        if (!category) return res.status(404).json({ error: 'not_found' })

        const oldName = category.name
        if (name !== undefined && name.trim()) category.name = name.trim()
        if (color !== undefined) category.color = color
        await category.save()

        if (category.name !== oldName) {
            await Expense.updateMany({ branchId, category: oldName }, { category: category.name })
        }
        res.json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteExpenseCategoryDirector = async (req, res) => {
    try {
        const { branchId } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const category = await ExpenseCategory.findOne({ _id: req.params.id, branchId })
        if (!category) return res.status(404).json({ error: 'not_found' })
        if (category.name === OTHER_CATEGORY) return res.status(400).json({ error: 'cannot_delete_other' })

        await ensureDefaultCategories(branchId)
        await Expense.updateMany({ branchId, category: category.name }, { category: OTHER_CATEGORY })
        await category.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getExpensesOverviewDirector = async (req, res) => {
    try {
        const { branchId, dateFrom, dateTo, category, categories, method, search, amountMin, amountMax } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })

        const match = { branchId: new mongoose.Types.ObjectId(branchId) }
        const categoryList = categories ? categories.split(',').filter(Boolean) : (category ? [category] : [])
        if (categoryList.length > 0) match.category = { $in: categoryList }
        if (method) match.method = method
        if (amountMin || amountMax) {
            match.amount = {}
            if (amountMin) match.amount.$gte = Number(amountMin)
            if (amountMax) match.amount.$lte = Number(amountMax)
        }
        if (search) {
            const q = search.trim()
            match.$or = [{ name: new RegExp(q, 'i') }, { recipient: new RegExp(q, 'i') }]
        }
        if (dateFrom || dateTo) {
            match.date = {}
            if (dateFrom) match.date.$gte = startOfLocalDay(dateFrom)
            if (dateTo) match.date.$lte = endOfLocalDay(dateTo)
        }

        const expenses = await Expense.find(match).sort({ date: -1 }).populate('teacherId', 'name').populate('createdBy', 'name').lean()
        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
        const byCategoryMap = {}
        expenses.forEach(e => { byCategoryMap[e.category] = (byCategoryMap[e.category] || 0) + e.amount })
        const byCategory = Object.entries(byCategoryMap).map(([cat, total]) => ({ category: cat, total }))

        res.json({ expenses, totalAmount, byCategory })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getExpenseDetailDirector = async (req, res) => {
    try {
        const { branchId } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const expense = await Expense.findOne({ _id: req.params.id, branchId })
            .populate('teacherId', 'name').populate('createdBy', 'name').lean()
        if (!expense) return res.status(404).json({ error: 'not_found' })
        res.json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createExpenseDirector = async (req, res) => {
    try {
        const { branchId, name, category, amount, date, recipient, method } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!(amount > 0)) return res.status(400).json({ error: 'amount_required' })
        if (method && !EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        await ensureDefaultCategories(branchId)
        const expenseDate = date ? new Date(date) : new Date()
        const expense = await Expense.create({
            branchId, name: name || '', category: category || OTHER_CATEGORY,
            amount, date: expenseDate, recipient: recipient || '',
            method: method || 'cash', createdBy: req.auth.userId,
        })
        const branchAccount = await getOrCreateAccount('branch', branchId)
        const entry = await postEntry({
            accountId: branchAccount._id, direction: 'decrease', amount, kind: 'expense', method: expense.method,
            meta: { sourceType: 'expense', sourceId: expense._id },
            description: expense.name || expense.category, createdBy: req.auth.userId, date: expenseDate,
        })
        if (entry) { expense.ledgerTransactionId = entry.transactionId; await expense.save({ validateModifiedOnly: true }) }
        res.status(201).json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateExpenseDirector = async (req, res) => {
    try {
        const { branchId, name, category, amount, date, recipient, method } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (method && !EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const expense = await Expense.findOne({ _id: req.params.id, branchId })
        if (!expense) return res.status(404).json({ error: 'not_found' })
        // deliberately NOT gated by isEditableToday, unlike expenseController.updateExpense's admin
        // version - confirmed with the user: a director must have full authority to correct any
        // expense regardless of how long ago it was recorded, not just same-day. Safe by
        // construction either way - the delta-correction entry below is always dated `new Date()`
        // (today, when the correction actually happens), and restampAccount already keeps
        // balanceAfter correct for a correction posted long after the entries around it.
        if (amount !== undefined && !(Number(amount) > 0)) return res.status(400).json({ error: 'amount_required' })

        if (amount !== undefined && Number(amount) !== expense.amount) {
            const delta = Number(amount) - expense.amount
            const branchAccount = await getOrCreateAccount('branch', branchId)
            await postEntry({
                accountId: branchAccount._id, direction: delta > 0 ? 'decrease' : 'increase', amount: Math.abs(delta),
                kind: 'expense', method: expense.method,
                meta: { sourceType: 'expense', sourceId: expense._id },
                description: `Correction to ${expense.name || expense.category} - ${delta > 0 ? 'increased' : 'decreased'} by ${formatAmount(Math.abs(delta))}`,
                createdBy: req.auth.userId, date: new Date(),
            })
            expense.amount = Number(amount)
        }
        // sourceType/sourceId (not ledgerTransactionId) - see expenseController.updateExpense's own
        // comment for why: reaches an earlier amount correction's delta entry AND, for a salary/
        // prepayment payout, the teacher's own matching decrease (a second, independent postEntry
        // call under the same sourceId)
        if (method !== undefined && method !== expense.method) {
            await LedgerEntry.updateMany({ sourceType: 'expense', sourceId: expense._id }, { method })
        }

        if (name !== undefined) expense.name = name
        if (category !== undefined) expense.category = category
        if (date !== undefined) expense.date = new Date(date)
        if (recipient !== undefined) expense.recipient = recipient
        if (method !== undefined) expense.method = method
        await expense.save()

        res.json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteExpenseDirector = async (req, res) => {
    try {
        const { branchId } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        const expense = await Expense.findOne({ _id: req.params.id, branchId })
        if (!expense) return res.status(404).json({ error: 'not_found' })
        // same deliberate difference from expenseController.deleteExpense as updateExpenseDirector
        // above - a director can delete any expense, any age, not just today's

        await deleteEntries({ sourceType: 'expense', sourceId: expense._id })

        await expense.deleteOne()
        res.json({ deleted: true })
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
            .lean()
        if (!payment) return res.status(404).json({ error: 'not_found' })
        if (isSubDirector(req) && String(payment.branchId) !== String(req.auth.branchId)) return res.status(404).json({ error: 'not_found' })
        res.json({ payment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const listPayRates = async (req, res) => {
    try {
        if (!req.query.branchId) return res.status(400).json({ error: 'branch_required' })
        const rates = await TeacherPayRate.find({ branchId: req.query.branchId })
            .populate('teacherId', 'name')
            .populate('groupId', 'name languageId levelId')
            .populate('languageId', 'name')
            .lean()
        res.json({ rates })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const setPayRate = async (req, res) => {
    try {
        const { branchId, teacherId, groupId, languageId, rateType, rateValue } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!PAY_RATE_TYPES.includes(rateType)) return res.status(400).json({ error: 'invalid_rate_type' })
        // the model's own comment claims this validation lives here, but it never actually did - a
        // negative rateValue flows straight into calculateSalaries' total (a percent_of_revenue rate
        // of -30 pays a teacher negative money for real revenue), only saved from an actual payout by
        // paySalary being a separate manual action with its own amount field
        if (!(rateValue > 0)) return res.status(400).json({ error: 'invalid_rate_value' })
        if (groupId && !teacherId) return res.status(400).json({ error: 'teacher_required_for_group_rate' })
        // three independent override axes (by teacher / by course / by group) - a course-wide rate
        // is never combined with a specific teacher or group, and vice versa (confirmed spec: these
        // don't compose into a 5th "this teacher, but only for this course" case)
        if (languageId && (teacherId || groupId)) return res.status(400).json({ error: 'course_rate_cannot_combine' })

        const rate = await TeacherPayRate.findOneAndUpdate(
            { branchId, teacherId: teacherId || null, groupId: groupId || null, languageId: languageId || null },
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

// runs the calculation fresh every time (nothing persisted until "Pay"/"Prepay" is clicked) - see
// salaryCalculation.service.js for exactly how each rate type is applied, and for how paidAmount/
// remaining are derived from real Salary+Prepayment expenses already recorded for this exact
// period. No lock-in step, matching adminController.calculateSalary's simplified model - since
// `total` is always a live recalculation, a director just pays whatever `remaining` currently shows.
export const calculateSalary = async (req, res) => {
    try {
        const { branchId, dateFrom, dateTo } = req.query
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!dateFrom || !dateTo) return res.status(400).json({ error: 'date_range_required' })

        const rates = await TeacherPayRate.find({ branchId }).lean()
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

        const rates = await TeacherPayRate.find({ branchId }).lean()
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
        if (!teacherId) return res.status(400).json({ error: 'missing_fields' })
        // !amount alone let a negative payout amount straight through (only 0/null/undefined/NaN
        // are falsy) - same class of bug already fixed on the admin app's own copy of this
        if (!(amount > 0)) return res.status(400).json({ error: 'missing_fields' })
        if (!EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        // confirmed real gap (same one already fixed on the admin app's own copy): nothing here
        // checked the teacher actually belongs to (or is additionally assigned to) the branch this
        // payout is being booked against - without it a director could book a payout to a teacher
        // who never worked at this branch at all, corrupting that branch's own expense history
        const teacher = await User.findOne({
            _id: teacherId, role: 'teacher', $or: [{ branchId }, { additionalBranchIds: branchId }],
        }).select('name').lean()
        if (!teacher) return res.status(404).json({ error: 'not_found' })
        await ensureDefaultCategories(branchId)
        await ensureCategoryExists(branchId, SALARY_CATEGORY, '#3E7CB1')
        const expenseDate = new Date()
        const expense = await Expense.create({
            branchId, category: SALARY_CATEGORY, amount, teacherId,
            name: dateFrom && dateTo ? `Salary for ${dateFrom} — ${dateTo}` : 'Salary payout',
            recipient: teacher?.name || '', method,
            date: expenseDate,
            note: dateFrom && dateTo ? `Salary for ${dateFrom} — ${dateTo}` : 'Salary payout',
            createdBy: req.auth.userId,
        })

        // branch account decreases (cash out) and the teacher's own account decreases too (less
        // owed to them - an advance given before it's earned naturally pushes it negative) - same
        // ledger posting adminController.paySalary does, this was missing here entirely before
        const branchAccount = await getOrCreateAccount('branch', branchId)
        const branchEntry = await postEntry({
            accountId: branchAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expenseDate,
        })
        if (branchEntry) { expense.ledgerTransactionId = branchEntry.transactionId; await expense.save({ validateModifiedOnly: true }) }
        const teacherAccount = await getOrCreateAccount('teacher', teacherId)
        await postEntry({
            accountId: teacherAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expenseDate,
        })

        res.status(201).json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// director's counterpart of adminController.prepaySalary - same advance/prepayment concept,
// scoped to whichever branchId the director's Finance switcher has selected
export const prepaySalary = async (req, res) => {
    try {
        const { branchId, teacherId, amount, dateFrom, dateTo, method } = req.body
        if (!branchId) return res.status(400).json({ error: 'branch_required' })
        if (!teacherId) return res.status(400).json({ error: 'missing_fields' })
        // !amount alone let a negative payout amount straight through (only 0/null/undefined/NaN
        // are falsy) - same class of bug already fixed on the admin app's own copy of this
        if (!(amount > 0)) return res.status(400).json({ error: 'missing_fields' })
        if (!EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        // same real gap just fixed on this file's own paySalary
        const teacher = await User.findOne({
            _id: teacherId, role: 'teacher', $or: [{ branchId }, { additionalBranchIds: branchId }],
        }).select('name').lean()
        if (!teacher) return res.status(404).json({ error: 'not_found' })
        await ensureCategoryExists(branchId, PREPAYMENT_CATEGORY, '#E67E22')
        const expenseDate = new Date()
        const expense = await Expense.create({
            branchId, category: PREPAYMENT_CATEGORY, amount, teacherId,
            name: dateFrom && dateTo ? `Prepayment for ${dateFrom} — ${dateTo}` : 'Salary prepayment',
            recipient: teacher?.name || '', method,
            date: expenseDate,
            note: dateFrom && dateTo ? `Prepayment for ${dateFrom} — ${dateTo}` : 'Salary prepayment',
            createdBy: req.auth.userId,
        })

        const branchAccount = await getOrCreateAccount('branch', branchId)
        const branchEntry = await postEntry({
            accountId: branchAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expenseDate,
        })
        if (branchEntry) { expense.ledgerTransactionId = branchEntry.transactionId; await expense.save({ validateModifiedOnly: true }) }
        const teacherAccount = await getOrCreateAccount('teacher', teacherId)
        await postEntry({
            accountId: teacherAccount._id, direction: 'decrease', amount, kind: 'salary_payout', method,
            meta: { teacherId, sourceType: 'expense', sourceId: expense._id },
            description: expense.name, createdBy: req.auth.userId, date: expenseDate,
        })

        res.status(201).json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
