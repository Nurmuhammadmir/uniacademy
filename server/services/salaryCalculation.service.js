import Group from "../models/Group.js"
import User from "../models/User.js"
import Expense from "../models/Expense.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import CoursePeriod from "../models/CoursePeriod.js"
import { getScheduleDays } from "./scheduleDays.service.js"
import { prorateByDateOverlap } from "./attribution.service.js"
import { computeCourseStatement } from "./studentLedger.service.js"

// per_lesson/per_hour pay only counts a day if the teacher's group was actually scheduled to meet
// AND the teacher actually checked themselves in that day (TeacherAttendance) - ties pay to real
// presence, not just a theoretical weekly pattern that assumes every scheduled class happened.
// Returns the actual list of taught calendar dates (not just a count) so the Salary "Details" view
// can show exactly which lessons were counted, not just a number to take on faith.
const taughtLessonDates = (group, attendedDates, from, to) => {
    const days = getScheduleDays(group)
    if (days.length === 0) return []
    const dates = []
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
    while (cursor <= end) {
        if (days.includes(cursor.getUTCDay()) && attendedDates.has(cursor.toISOString().slice(0, 10))) dates.push(new Date(cursor))
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return dates
}

// a teacher's own override (if one exists for this branch) always wins over the branch-wide default
export const resolveRate = (teacherId, rates) => {
    const override = rates.find(r => r.teacherId && String(r.teacherId) === String(teacherId))
    if (override) return override
    return rates.find(r => !r.teacherId) || null
}

// sums CoursePeriod (each real billing period actually consumed), not raw Payment rows - a
// CoursePeriod is attributed to whichever teacher/group was active WHEN THAT SPECIFIC PERIOD was
// consumed, so a student switching groups mid-course correctly splits revenue between the old and
// new teacher instead of a lump payment freezing everything to whoever happened to be teaching at
// the moment the money was originally paid. Each period's contribution is PRORATED to just the days
// that fall inside [dateFrom, dateTo] - a full month queried for only its first 10 days counts
// ~10/30 of that period, not the whole thing (and a separate query for the rest of the month still
// sums back to the original total, instead of double-counting the overlap in both runs).
// Shared by calculateSalaries (bulk totals) and getTeacherSalaryDetail (itemized breakdown) so the
// two views can never disagree with each other - same function, same numbers.
const computeRevenueForTeacher = async (teacherId, teacherGroups, dateFrom, dateTo) => {
    const periods = await CoursePeriod.find({ teacherId, periodStart: { $lte: dateTo }, periodEnd: { $gte: dateFrom } })
        .populate('studentId', 'name').populate('groupId', 'languageId levelId')
    let revenue = 0
    const entries = []
    for (const p of periods) {
        const amount = prorateByDateOverlap(p.amount, p.periodStart, p.periodEnd, dateFrom, dateTo)
        if (amount <= 0) continue
        revenue += amount
        entries.push({
            studentId: p.studentId?._id, studentName: p.studentId?.name, groupId: p.groupId?._id,
            periodStart: p.periodStart, periodEnd: p.periodEnd, amount, pending: false,
        })
    }

    // ALSO counts each student's current unconsumed balance (real money already paid, just not yet
    // enough to complete a full period) as a live, not-yet-committed period - so a small leftover
    // from proration/rounding isn't invisible to commission just because it hasn't been converted
    // into a real CoursePeriod yet. Reuses computeCourseStatement's pendingCharge (same math the
    // accounting Ledger already shows) rather than re-deriving the proration formula a third time.
    for (const g of teacherGroups) {
        for (const studentId of g.studentIds) {
            const statement = await computeCourseStatement(studentId, g.languageId)
            const pending = statement?.pendingCharge
            if (!pending) continue
            const paidPortion = pending.amount - pending.amountStillNeeded
            if (paidPortion <= 0) continue
            const amount = prorateByDateOverlap(paidPortion, pending.periodStart, pending.periodEnd, dateFrom, dateTo)
            if (amount > 0) {
                revenue += amount
                entries.push({ studentId, studentName: statement.studentName, groupId: g._id, periodStart: pending.periodStart, periodEnd: pending.periodEnd, amount, pending: true })
            }
        }
    }

    return { revenue, entries }
}

const computeTeacherTotal = async (teacher, teacherGroups, rate, dateFrom, dateTo) => {
    let total = 0
    let revenueEntries = []
    let lessonEntries = []

    const uniqueStudents = new Set()
    teacherGroups.forEach(g => g.studentIds.forEach(id => uniqueStudents.add(String(id))))
    const studentCount = uniqueStudents.size

    if (rate.rateType === 'per_student_month') {
        total = rate.rateValue * studentCount
    } else if (rate.rateType === 'fixed_monthly') {
        total = rate.rateValue
    } else if (rate.rateType === 'percent_of_revenue') {
        const { revenue, entries } = await computeRevenueForTeacher(teacher._id, teacherGroups, dateFrom, dateTo)
        revenueEntries = entries
        total = Math.round(revenue * (rate.rateValue / 100))
    } else if (rate.rateType === 'per_lesson' || rate.rateType === 'per_hour') {
        const attendanceRows = await TeacherAttendance.find({ teacherId: teacher._id, date: { $gte: dateFrom, $lte: dateTo } }).select('date')
        const attendedDates = new Set(attendanceRows.map(a => a.date.toISOString().slice(0, 10)))

        let units = 0
        for (const g of teacherGroups) {
            const dates = taughtLessonDates(g, attendedDates, dateFrom, dateTo)
            dates.forEach(date => lessonEntries.push({ date, groupId: g._id, language: g.languageId?.name, level: g.levelId?.name }))
            units += rate.rateType === 'per_hour' ? dates.length * ((g.durationMinutes || 90) / 60) : dates.length
        }
        total = Math.round(rate.rateValue * units)
    }

    return { total, studentCount, revenueEntries, lessonEntries }
}

// computes each of this branch's teachers' salary for a date range, using their custom rate
// override if configured, otherwise the branch default. Teachers with neither are skipped - there's
// nothing to calculate until at least a branch default rate is set.
export const calculateSalaries = async (branchId, rates, dateFrom, dateTo) => {
    const teachers = await User.find({
        role: 'teacher',
        $or: [{ branchId }, { additionalBranchIds: branchId }],
    }).select('name')

    const groups = await Group.find({ branchId })

    // a teacher already paid for this exact date range shows as "paid" instead of a Pay button -
    // approximated by checking for any salary expense recorded for them within this window
    const existingPayouts = await Expense.find({
        branchId, category: 'Salary', teacherId: { $in: teachers.map(t => t._id) },
        date: { $gte: dateFrom, $lte: dateTo },
    })
    const paidTeacherIds = new Set(existingPayouts.map(e => String(e.teacherId)))

    // any advance already given for this same period - shown as a warning before a real salary
    // payout, and blocks a second prepayment once the real payout has happened (see paySalary's
    // own comment for why the payout itself is always dated "today", same approximation this reuses)
    const existingPrepayments = await Expense.find({
        branchId, category: 'Prepayment', teacherId: { $in: teachers.map(t => t._id) },
        date: { $gte: dateFrom, $lte: dateTo },
    })
    const prepaymentsByTeacher = {}
    for (const e of existingPrepayments) {
        const key = String(e.teacherId)
        if (!prepaymentsByTeacher[key]) prepaymentsByTeacher[key] = []
        prepaymentsByTeacher[key].push({ amount: e.amount, date: e.date, method: e.method })
    }

    const results = []
    for (const teacher of teachers) {
        const rate = resolveRate(teacher._id, rates)
        if (!rate) continue

        const teacherGroups = groups.filter(g => String(g.teacherId) === String(teacher._id))
        const { total, studentCount } = await computeTeacherTotal(teacher, teacherGroups, rate, dateFrom, dateTo)

        results.push({
            teacherId: teacher._id, name: teacher.name, groupCount: teacherGroups.length, studentCount,
            rateType: rate.rateType, rateValue: rate.rateValue, total,
            paid: paidTeacherIds.has(String(teacher._id)),
            prepayments: prepaymentsByTeacher[String(teacher._id)] || [],
        })
    }

    return results
}

// itemized breakdown for one teacher - backs the Salary page's "Details" button, so an admin can
// see exactly which groups/students/lessons a total was built from instead of just trusting a
// single number. Reuses computeTeacherTotal (the exact same function calculateSalaries calls) so
// this view's total can never drift from the one shown in the results table.
export const getTeacherSalaryDetail = async (branchId, teacherId, rates, dateFrom, dateTo) => {
    const teacher = await User.findById(teacherId).select('name')
    if (!teacher) return null
    const rate = resolveRate(teacherId, rates)
    if (!rate) return null

    const teacherGroups = await Group.find({ branchId, teacherId })
        .populate('languageId', 'name').populate('levelId', 'name').populate('roomId', 'name')

    const { total, studentCount, revenueEntries, lessonEntries } = await computeTeacherTotal(teacher, teacherGroups, rate, dateFrom, dateTo)

    const groups = teacherGroups.map(g => ({
        groupId: g._id, language: g.languageId?.name, level: g.levelId?.name, room: g.roomId?.name || null,
        schedulePattern: g.schedulePattern, time: g.time, studentCount: g.studentIds.length,
    }))

    return {
        teacherId: teacher._id, name: teacher.name, rateType: rate.rateType, rateValue: rate.rateValue,
        total, groupCount: teacherGroups.length, studentCount, groups, revenueEntries, lessonEntries,
    }
}
