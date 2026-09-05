import Group from "../models/Group.js"
import User from "../models/User.js"
import Expense from "../models/Expense.js"
import TeacherAttendance from "../models/TeacherAttendance.js"
import { getScheduleDays } from "./scheduleDays.service.js"
import { prorateByDateOverlap } from "./attribution.service.js"
import { computeCoveredDebtPeriodsBatch } from "./billingCycle.service.js"
import { SALARY_CATEGORY, PREPAYMENT_CATEGORY } from "./expenseCategories.service.js"

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

// four levels of specificity, most specific wins: a rate set for this exact teacher+group beats one
// set for this exact teacher across all their groups/courses, which beats one set for this exact
// course across every teacher who runs it, which beats the branch-wide default. This is what lets
// one teacher earn, say, 30% from one group and a flat 500,000 from another, or a course like
// "English" always pay 40% of revenue no matter who's teaching it that term - each group is resolved
// and computed completely independently (see computeGroupContribution below).
export const resolveRateForGroup = (teacherId, group, rates) => {
    const groupOverride = rates.find(r => r.teacherId && String(r.teacherId) === String(teacherId) && r.groupId && String(r.groupId) === String(group._id))
    if (groupOverride) return groupOverride
    const teacherOverride = rates.find(r => r.teacherId && String(r.teacherId) === String(teacherId) && !r.groupId && !r.languageId)
    if (teacherOverride) return teacherOverride
    // group.languageId may be a populated {_id,name} object (getTeacherSalaryDetail's own groups
    // query populates it) or a raw ObjectId (calculateSalaries' doesn't) - unwrap either way, the
    // same populated-vs-raw mismatch that's bitten this codebase before
    const groupLanguageId = group.languageId?._id || group.languageId
    const courseOverride = rates.find(r => r.languageId && String(r.languageId) === String(groupLanguageId) && !r.teacherId && !r.groupId)
    if (courseOverride) return courseOverride
    return rates.find(r => !r.teacherId && !r.groupId && !r.languageId) || null
}

// sums each debt period actually PAID (not merely charged) for ONE specific group - a period is
// attributed to whichever teacher/group was active WHEN THAT SPECIFIC PERIOD was recognized, so a
// student switching groups mid-course correctly splits revenue between the old and new
// teacher/group instead of everything freezing to whoever happened to be teaching when the money
// arrived. Cash-basis on purpose (confirmed - see computeCoveredDebtPeriodsBatch's own comment) - a
// teacher's revenue share is only ever computed on money the business has actually collected. Each
// period's contribution is PRORATED to just the days that fall inside [dateFrom, dateTo].
// Batched (one User.find + computeCoveredDebtPeriodsBatch's own 2 queries, ALL for the whole group at
// once) instead of doing those per student - this used to be ~3 DB round-trips per student in the
// group, which added up fast across every group a branch runs.
const computeRevenueForGroup = async (teacherId, group, dateFrom, dateTo) => {
    let revenue = 0
    const entries = []
    const students = await User.find({ _id: { $in: group.studentIds } }).select('name').lean()
    const nameByStudent = new Map(students.map(s => [String(s._id), s.name]))
    // group.languageId may be a populated {_id,name} object (getTeacherSalaryDetail's own groups
    // query populates it, for display) or a raw ObjectId (calculateSalaries' doesn't) - same
    // populated-vs-raw unwrap resolveRateForGroup already needs above. Without this, the Details
    // view's percent_of_revenue teachers always showed 0/empty: computeCoveredDebtPeriodsBatch's own
    // filter does `String(a.entry.languageId) === String(languageId)`, and String() on a populated
    // plain object (post-.lean()) stringifies to "[object Object]", never matching a real id - so
    // EVERY period got silently filtered out, while the main Salary table (raw, unpopulated
    // languageId) computed the correct total for the exact same teacher/period.
    const groupLanguageId = group.languageId?._id || group.languageId
    const coveredByStudent = await computeCoveredDebtPeriodsBatch(group.studentIds, groupLanguageId)
    const studentsWithRevenue = new Set()
    for (const studentId of group.studentIds) {
        const covered = coveredByStudent.get(String(studentId)) || []
        for (const p of covered) {
            if (String(p.teacherId) !== String(teacherId) || String(p.groupId) !== String(group._id)) continue
            if (p.periodStart > dateTo || p.periodEnd < dateFrom) continue
            const amount = prorateByDateOverlap(p.amount, p.periodStart, p.periodEnd, dateFrom, dateTo)
            if (amount <= 0) continue
            revenue += amount
            studentsWithRevenue.add(String(studentId))
            entries.push({ studentId, studentName: nameByStudent.get(String(studentId)), groupId: group._id, periodStart: p.periodStart, periodEnd: p.periodEnd, amount, pending: false })
        }
    }
    // confirmed ask: the Details view must show EVERY student in the group, not just the ones who
    // actually paid something toward this teacher's revenue this period - a student who owes money
    // but hasn't paid needs to be visibly flagged at 0, not silently absent from the list (which used
    // to read as "this teacher only has 2 students" instead of "8 students, 6 haven't paid yet").
    for (const studentId of group.studentIds) {
        if (studentsWithRevenue.has(String(studentId))) continue
        entries.push({ studentId, studentName: nameByStudent.get(String(studentId)), groupId: group._id, periodStart: null, periodEnd: null, amount: 0, pending: false, unpaid: true })
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
        const attendanceRows = await TeacherAttendance.find({ teacherId: teacher._id, date: { $gte: dateFrom, $lte: dateTo } }).select('date').lean()
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
        const rate = resolveRateForGroup(teacher._id, group, rates)
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
    }).select('name').lean()

    const groups = await Group.find({ branchId }).lean()

    // everything already given to a teacher for this exact date range - a real payout AND any
    // advance both count as "already paid" toward the same number, so the admin sees one simple
    // figure (how much of the calculated total is still owed for this period) instead of a separate
    // paid/prepaid distinction to reconcile in their head
    const existingPayouts = await Expense.find({
        branchId, category: { $in: [SALARY_CATEGORY, PREPAYMENT_CATEGORY] }, teacherId: { $in: teachers.map(t => t._id) },
        date: { $gte: dateFrom, $lte: dateTo },
    })
    const paidByTeacher = {}
    for (const e of existingPayouts) {
        const key = String(e.teacherId)
        if (!paidByTeacher[key]) paidByTeacher[key] = { amount: 0, payments: [] }
        paidByTeacher[key].amount += e.amount
        paidByTeacher[key].payments.push({ amount: e.amount, date: e.date, method: e.method, category: e.category })
    }

    // each teacher's computation only reads shared inputs (rates/groups) and writes to its own
    // result - fully independent of every other teacher's, so they're run concurrently instead of
    // one-at-a-time. This used to be the single biggest latency cost on the Salary page (confirmed
    // live: ~1.7s to calculate on a branch with almost no data at all, purely from awaiting each
    // teacher's percent_of_revenue/per_lesson DB round-trips back-to-back) - now they all fire at
    // once and the page waits for the SLOWEST teacher instead of the SUM of every teacher.
    const perTeacher = await Promise.all(teachers.map(async (teacher) => {
        const teacherGroups = groups.filter(g => String(g.teacherId) === String(teacher._id))
        if (teacherGroups.length === 0) return null

        const { total, groupBreakdown, rateType, rateValue } = await computeTeacherAcrossGroups(teacher, teacherGroups, rates, dateFrom, dateTo)
        if (groupBreakdown.length === 0) return null // not one of this teacher's groups resolved any rate at all

        const uniqueStudents = new Set()
        teacherGroups.forEach(g => g.studentIds.forEach(id => uniqueStudents.add(String(id))))

        const paidInfo = paidByTeacher[String(teacher._id)] || { amount: 0, payments: [] }

        return {
            teacherId: teacher._id, name: teacher.name, groupCount: teacherGroups.length, studentCount: uniqueStudents.size,
            rateType, rateValue, total,
            paidAmount: paidInfo.amount,
            // always a live figure, never a locked-in one - if a student pays more after a payout
            // already happened for this period, the next Hisoblang just shows the new gap directly
            remaining: Math.max(0, total - paidInfo.amount),
            payments: paidInfo.payments,
        }
    }))

    return perTeacher.filter(Boolean)
}

// itemized breakdown for one teacher - backs the Salary page's "Details" button, so an admin can
// see exactly which groups/students/lessons a total was built from instead of just trusting a
// single number. Reuses computeTeacherAcrossGroups (the exact same function calculateSalaries
// calls) so this view's total can never drift from the one shown in the results table.
export const getTeacherSalaryDetail = async (branchId, teacherId, rates, dateFrom, dateTo) => {
    const teacher = await User.findById(teacherId).select('name').lean()
    if (!teacher) return null

    const teacherGroups = await Group.find({ branchId, teacherId })
        .populate('languageId', 'name').populate('levelId', 'name').populate('roomId', 'name').lean()
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
