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

// three levels of specificity, most specific wins: a rate set for this exact teacher+group beats
// one set for this teacher across all their groups, which beats the branch-wide default. This is
// what lets one teacher earn, say, 30% from one group and a flat 500,000 from another - each group
// is resolved and computed completely independently (see computeGroupContribution below).
export const resolveRateForGroup = (teacherId, groupId, rates) => {
    const groupOverride = rates.find(r => r.teacherId && String(r.teacherId) === String(teacherId) && r.groupId && String(r.groupId) === String(groupId))
    if (groupOverride) return groupOverride
    const teacherOverride = rates.find(r => r.teacherId && String(r.teacherId) === String(teacherId) && !r.groupId)
    if (teacherOverride) return teacherOverride
    return rates.find(r => !r.teacherId && !r.groupId) || null
}

// sums CoursePeriod (each real billing period actually consumed) for ONE specific group - a
// CoursePeriod is attributed to whichever teacher/group was active WHEN THAT SPECIFIC PERIOD was
// consumed, so a student switching groups mid-course correctly splits revenue between the old and
// new teacher/group instead of a lump payment freezing everything to whoever happened to be
// teaching at the moment the money was originally paid. Each period's contribution is PRORATED to
// just the days that fall inside [dateFrom, dateTo].
const computeRevenueForGroup = async (teacherId, group, dateFrom, dateTo) => {
    const periods = await CoursePeriod.find({ teacherId, groupId: group._id, periodStart: { $lte: dateTo }, periodEnd: { $gte: dateFrom } })
        .populate('studentId', 'name')
    let revenue = 0
    const entries = []
    for (const p of periods) {
        const amount = prorateByDateOverlap(p.amount, p.periodStart, p.periodEnd, dateFrom, dateTo)
        if (amount <= 0) continue
        revenue += amount
        entries.push({
            studentId: p.studentId?._id, studentName: p.studentId?.name, groupId: group._id,
            periodStart: p.periodStart, periodEnd: p.periodEnd, amount, pending: false,
        })
    }

    // ALSO counts each of THIS group's current members' unconsumed balance (real money already
    // paid, just not yet enough to complete a full period) as a live, not-yet-committed period - so
    // a small leftover from proration/rounding isn't invisible to commission just because it hasn't
    // been converted into a real CoursePeriod yet. Reuses computeCourseStatement's pendingCharge
    // (same math the accounting Ledger already shows) rather than re-deriving the proration formula.
    for (const studentId of group.studentIds) {
        const statement = await computeCourseStatement(studentId, group.languageId)
        const pending = statement?.pendingCharge
        if (!pending) continue
        const paidPortion = pending.amount - pending.amountStillNeeded
        if (paidPortion <= 0) continue
        const amount = prorateByDateOverlap(paidPortion, pending.periodStart, pending.periodEnd, dateFrom, dateTo)
        if (amount > 0) {
            revenue += amount
            entries.push({ studentId, studentName: statement.studentName, groupId: group._id, periodStart: pending.periodStart, periodEnd: pending.periodEnd, amount, pending: true })
        }
    }

    return { revenue, entries }
}

// computes ONE group's contribution to a teacher's salary, using whichever rate resolved for THAT
// group specifically - completely independent of every other group the teacher runs, so groups on
// different rate types/values never interfere with each other.
const computeGroupContribution = async (teacher, group, rate, dateFrom, dateTo) => {
    let total = 0
    let revenueEntries = []
    let lessonEntries = []

    if (rate.rateType === 'per_student_month') {
        total = rate.rateValue * group.studentIds.length
    } else if (rate.rateType === 'fixed_monthly') {
        // a flat stipend tied to running this one group - if the same flat amount is meant to cover
        // every group a teacher runs, set it as their teacher-level rate instead of per-group
        total = rate.rateValue
    } else if (rate.rateType === 'percent_of_revenue') {
        const { revenue, entries } = await computeRevenueForGroup(teacher._id, group, dateFrom, dateTo)
        revenueEntries = entries
        total = Math.round(revenue * (rate.rateValue / 100))
    } else if (rate.rateType === 'per_lesson' || rate.rateType === 'per_hour') {
        const attendanceRows = await TeacherAttendance.find({ teacherId: teacher._id, date: { $gte: dateFrom, $lte: dateTo } }).select('date')
        const attendedDates = new Set(attendanceRows.map(a => a.date.toISOString().slice(0, 10)))
        const dates = taughtLessonDates(group, attendedDates, dateFrom, dateTo)
        dates.forEach(date => lessonEntries.push({ date, groupId: group._id, language: group.languageId?.name, level: group.levelId?.name }))
        const units = rate.rateType === 'per_hour' ? dates.length * ((group.durationMinutes || 90) / 60) : dates.length
        total = Math.round(rate.rateValue * units)
    }

    return { total, revenueEntries, lessonEntries }
}

// runs every one of a teacher's groups through computeGroupContribution and adds them up, tracking
// a per-group breakdown alongside the grand total. Also decides what to show as "the" rate/method
// for the teacher as a whole: if every group resolved to the exact same rate (the common case - one
// branch default or one teacher-level override covering everything), that single rate is returned
// as before; otherwise rateType comes back as 'mixed' so the UI knows to point the admin at the
// per-group breakdown instead of a single misleading number.
const computeTeacherAcrossGroups = async (teacher, teacherGroups, rates, dateFrom, dateTo) => {
    let total = 0
    const groupBreakdown = []
    const revenueEntries = []
    const lessonEntries = []

    for (const group of teacherGroups) {
        const rate = resolveRateForGroup(teacher._id, group._id, rates)
        if (!rate) continue // no default/teacher/group rate resolves for this group - it contributes nothing, not an error
        const { total: groupTotal, revenueEntries: gRevenue, lessonEntries: gLessons } = await computeGroupContribution(teacher, group, rate, dateFrom, dateTo)
        total += groupTotal
        groupBreakdown.push({ groupId: group._id, rateType: rate.rateType, rateValue: rate.rateValue, total: groupTotal, studentCount: group.studentIds.length })
        revenueEntries.push(...gRevenue)
        lessonEntries.push(...gLessons)
    }

    const uniformRate = groupBreakdown.length > 0 && groupBreakdown.every(g => g.rateType === groupBreakdown[0].rateType && g.rateValue === groupBreakdown[0].rateValue)
        ? { rateType: groupBreakdown[0].rateType, rateValue: groupBreakdown[0].rateValue }
        : { rateType: 'mixed', rateValue: null }

    return { total, groupBreakdown, revenueEntries, lessonEntries, ...uniformRate }
}

// computes each of this branch's teachers' salary for a date range, using whichever rate resolves
// per group (group-specific override > teacher-level override > branch default). A teacher with no
// groups, or whose groups all resolve to no rate at all, is skipped entirely - there's nothing to
// calculate until at least a branch default rate is set.
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
        const teacherGroups = groups.filter(g => String(g.teacherId) === String(teacher._id))
        if (teacherGroups.length === 0) continue

        const { total, groupBreakdown, rateType, rateValue } = await computeTeacherAcrossGroups(teacher, teacherGroups, rates, dateFrom, dateTo)
        if (groupBreakdown.length === 0) continue // not one of this teacher's groups resolved any rate at all

        const uniqueStudents = new Set()
        teacherGroups.forEach(g => g.studentIds.forEach(id => uniqueStudents.add(String(id))))

        results.push({
            teacherId: teacher._id, name: teacher.name, groupCount: teacherGroups.length, studentCount: uniqueStudents.size,
            rateType, rateValue, total,
            paid: paidTeacherIds.has(String(teacher._id)),
            prepayments: prepaymentsByTeacher[String(teacher._id)] || [],
        })
    }

    return results
}

// itemized breakdown for one teacher - backs the Salary page's "Details" button, so an admin can
// see exactly which groups/students/lessons a total was built from instead of just trusting a
// single number. Reuses computeTeacherAcrossGroups (the exact same function calculateSalaries
// calls) so this view's total can never drift from the one shown in the results table.
export const getTeacherSalaryDetail = async (branchId, teacherId, rates, dateFrom, dateTo) => {
    const teacher = await User.findById(teacherId).select('name')
    if (!teacher) return null

    const teacherGroups = await Group.find({ branchId, teacherId })
        .populate('languageId', 'name').populate('levelId', 'name').populate('roomId', 'name')
    if (teacherGroups.length === 0) return null

    const { total, groupBreakdown, rateType, rateValue, revenueEntries, lessonEntries } = await computeTeacherAcrossGroups(teacher, teacherGroups, rates, dateFrom, dateTo)
    if (groupBreakdown.length === 0) return null

    const breakdownByGroupId = Object.fromEntries(groupBreakdown.map(g => [String(g.groupId), g]))
    const uniqueStudents = new Set()
    teacherGroups.forEach(g => g.studentIds.forEach(id => uniqueStudents.add(String(id))))

    // each group carries its OWN resolved rate/total here - this is what lets the Details view show
    // "Group A: 30% of revenue = 450,000" and "Group B: fixed 500,000" side by side instead of one
    // number that silently averaged two different arrangements together
    const groups = teacherGroups.map(g => {
        const b = breakdownByGroupId[String(g._id)]
        return {
            groupId: g._id, language: g.languageId?.name, level: g.levelId?.name, room: g.roomId?.name || null,
            schedulePattern: g.schedulePattern, time: g.time, studentCount: g.studentIds.length,
            rateType: b?.rateType || null, rateValue: b?.rateValue ?? null, total: b?.total || 0,
        }
    })

    return {
        teacherId: teacher._id, name: teacher.name, rateType, rateValue,
        total, groupCount: teacherGroups.length, studentCount: uniqueStudents.size, groups, revenueEntries, lessonEntries,
    }
}
