// Read-only views over the real, stored LedgerEntry history - unlike the old version of this file
// (which replayed Payment documents live on every call), every number here is a direct read of
// already-posted, immutable entries. Nothing is re-derived/recomputed here except simple sums over
// what's already stored - the actual charge/payment MATH happens once, at posting time, in
// billingCycle.service.js and ledger.service.js.
import User from "../models/User.js"
import Group from "../models/Group.js"
import LedgerEntry from "../models/LedgerEntry.js"
import { getOrCreateAccount } from "./ledger.service.js"
import Account from "../models/Account.js"
import { computeCoveredDebtPeriodsBatch, computeAccountAllocation, computeCourseOwed } from "./billingCycle.service.js"
import { prorateByDateOverlap } from "./attribution.service.js"

// one course's full statement: every Credit (payment received / refund reversed) and Debit (period
// charged for) in chronological order, each carrying the running balance immediately after it -
// exactly what a bank statement's "было / приход / расход / стало" columns show. `balanceAfter` on
// each row is the account's OVERALL balance (a student has one account across every course), not a
// per-course figure. Confirmed spec: a payment/refund is NEVER earmarked for one specific course
// (one shared wallet) - only a debt (and a discount, by design) is genuinely tagged to a course. So
// debt rows come from the SAME account-wide FIFO allocation computeCourseOwed itself uses, each
// annotated with exactly how much of IT got covered and how much is still outstanding, instead of
// fabricating a fake "payment for this course" row that never happened as a real, discrete event.
// Legacy payment/refund rows recorded before this rework (which DO still carry a languageId) still
// show up here too, for old data.
export const computeCourseStatement = async (studentId, languageId) => {
    const student = await User.findById(studentId).select('courses name phone')
    if (!student) return null
    const course = student.courses.find(c => String(c.languageId) === String(languageId))
    if (!course) return null

    const group = course.groupId ? await Group.findById(course.groupId).select('price').lean() : null
    const price = group?.price ?? null

    const account = await getOrCreateAccount('student', studentId)

    const allocations = await computeAccountAllocation(account._id)
    const debtEntries = allocations
        .filter(a => String(a.entry.languageId) === String(languageId))
        .map(a => ({
            // always the ORIGINAL, as-posted amount (matches this row's own immutable description) -
            // never the post-reversal folded figure computeAccountAllocation uses internally for the
            // owed/coverage math; a debt_reversal row (below) is what actually shows the correction
            _id: a.entry._id, type: 'debit', date: a.entry.date, amount: a.entry.originalAmount ?? a.entry.amount,
            balanceAfter: a.entry.balanceAfter, kind: a.entry.kind, method: a.entry.method,
            description: a.entry.description, periodStart: a.entry.periodStart, periodEnd: a.entry.periodEnd,
            paymentId: null, covered: a.covered, remaining: a.entry.amount - a.covered,
        }))

    const otherRows = await LedgerEntry.find({ accountId: account._id, languageId, kind: { $in: ['discount', 'payment', 'refund', 'debt_reversal'] } }).sort({ date: 1, _id: 1 }).lean()
    // direction is defined relative to the account's OWN balance (see Account.js/LedgerEntry.js) -
    // 'increase' always means the student owes more, 'decrease' always means they owe less
    const otherEntries = otherRows.map(r => ({
        _id: r._id, type: r.direction === 'increase' ? 'debit' : 'credit',
        date: r.date, amount: r.amount, balanceAfter: r.balanceAfter, kind: r.kind,
        method: r.method, description: r.description, periodStart: r.periodStart, periodEnd: r.periodEnd,
        paymentId: r.kind === 'payment' && r.sourceType === 'payment' ? r.sourceId : null,
    }))

    const entries = [...debtEntries, ...otherEntries].sort((a, b) => new Date(a.date) - new Date(b.date) || String(a._id).localeCompare(String(b._id)))

    const owed = await computeCourseOwed(account._id, languageId)
    const balance = entries.length ? entries[entries.length - 1].balanceAfter : 0

    return {
        studentId, studentName: student.name, languageId, levelId: course.levelId, price,
        groupId: course.groupId, enrollmentStatus: course.enrollmentStatus,
        entries, balance, owed, status: owed > 0 ? 'owes' : 'settled',
    }
}

// every course a student has ever had, each with its own statement - a student's "лицевой счёт" is
// really N independent sub-ledgers (billing is course-scoped throughout this codebase), shown
// together as one page. The account's single OVERALL balance is attached alongside, since that's
// now the real headline number (see Account.js).
export const computeStudentStatements = async (studentId) => {
    const student = await User.findById(studentId).select('courses name phone')
    if (!student) return null
    const account = await getOrCreateAccount('student', studentId)
    const statements = []
    for (const course of student.courses) {
        const statement = await computeCourseStatement(studentId, course.languageId)
        if (statement) statements.push(statement)
    }
    return { studentId, studentName: student.name, studentPhone: student.phone, accountBalance: account.balance, courses: statements }
}

// the "Акт сверки" report: for each student (the caller resolves WHICH students - one specific
// student, a group's roster, or the whole branch - before calling this), opening balance / charges
// in range / payments in range / closing balance per course, same "было-приход-расход-стало" shape
// as the statement view but summarized to a date window, plus a branch/group-wide total row.
// `discrepancy: true` flags any course where the student currently owes money.
//
// Fully batched (3 queries total, regardless of student count) rather than delegating to
// computeStudentStatements/computeCourseStatement per student - those two do 3-4 round-trips EACH,
// which was fine for a single-student statement view but turned a branch-wide (scope=branch) report
// into 1000+ sequential round-trips for a few hundred students. Re-derives the same fields directly
// from a bulk-fetched entry list instead.
export const computeReconciliation = async (studentIds, dateFrom, dateTo) => {
    const emptyTotals = { openingBalance: 0, charges: 0, payments: 0, closingBalance: 0, owed: 0 }
    if (studentIds.length === 0) return { rows: [], totals: emptyTotals, dateFrom, dateTo }

    const students = await User.find({ _id: { $in: studentIds } }).select('courses name').lean()
    const accounts = await Account.find({ ownerType: 'student', ownerId: { $in: studentIds } }).lean()
    const accountByStudent = new Map(accounts.map(a => [String(a.ownerId), a]))

    const accountIds = accounts.map(a => a._id)
    const allEntries = accountIds.length
        ? await LedgerEntry.find({ accountId: { $in: accountIds }, kind: { $in: ['debt', 'payment', 'refund', 'expense', 'discount'] } })
            .select('accountId languageId direction amount date kind').sort({ date: 1, _id: 1 }).lean()
        : []
    const entriesByAccount = new Map()
    for (const e of allEntries) {
        const key = String(e.accountId)
        if (!entriesByAccount.has(key)) entriesByAccount.set(key, [])
        entriesByAccount.get(key).push(e)
    }

    const rows = []
    for (const student of students) {
        const account = accountByStudent.get(String(student._id))
        const accountEntries = account ? (entriesByAccount.get(String(account._id)) || []) : []

        // one shared-wallet FIFO walk per student (same algorithm as billingCycle.service.js's
        // computeAccountAllocation) - the only correct source for "how much of THIS course's debt is
        // actually still owed" now, since a payment/refund/discount is never earmarked for one
        // specific course (confirmed spec: one wallet) - a debt is the only thing still genuinely
        // course-tagged, so owed/discrepancy below can't just sum this course's own entries anymore.
        let cashAvailable = 0
        for (const e of accountEntries) {
            if (e.kind === 'payment' || e.kind === 'expense' || e.kind === 'discount') cashAvailable += e.amount
            else if (e.kind === 'refund') cashAvailable -= e.amount
        }
        const coveredByEntryId = new Map()
        for (const e of accountEntries) {
            if (e.kind !== 'debt') continue
            const take = Math.min(e.amount, Math.max(0, cashAvailable))
            cashAvailable -= take
            coveredByEntryId.set(String(e._id), take)
        }

        for (const course of student.courses) {
            const courseEntries = accountEntries.filter(e => String(e.languageId) === String(course.languageId))
            const debtEntries = courseEntries.filter(e => e.kind === 'debt')
            const owed = debtEntries.reduce((sum, e) => sum + e.amount - (coveredByEntryId.get(String(e._id)) || 0), 0)
            const status = owed > 0 ? 'owes' : 'settled'

            // opening/charges/payments in range still reflect only this course's own genuinely-tagged
            // entries (debt always is; a payment/refund only is on legacy rows predating the wallet
            // rework) - the closing owed figure above is the one this report's "does this student
            // still owe money" signal actually relies on, and that one IS wallet-correct
            const openingBalance = courseEntries
                .filter(e => e.date < dateFrom)
                .reduce((sum, e) => sum + (e.direction === 'increase' ? -e.amount : e.amount), 0)
            const inRange = courseEntries.filter(e => e.date >= dateFrom && e.date <= dateTo)
            const charges = inRange.filter(e => e.direction === 'increase').reduce((s, e) => s + e.amount, 0)
            const payments = inRange.filter(e => e.direction === 'decrease').reduce((s, e) => s + e.amount, 0)

            rows.push({
                studentId: student._id, studentName: student.name, languageId: course.languageId, levelId: course.levelId,
                openingBalance, charges, payments, closingBalance: openingBalance + payments - charges,
                owed: Math.max(0, owed), status, discrepancy: owed > 0,
            })
        }
    }
    const totals = rows.reduce((acc, r) => ({
        openingBalance: acc.openingBalance + r.openingBalance,
        charges: acc.charges + r.charges,
        payments: acc.payments + r.payments,
        closingBalance: acc.closingBalance + r.closingBalance,
        owed: acc.owed + r.owed,
    }), { ...emptyTotals })

    return { rows, totals, dateFrom, dateTo }
}

// group-level view of "where did this money come from" - Credits are every debt period actually PAID
// (cash-basis, same as salaryCalculation.service.js's percent_of_revenue - see
// computeCoveredDebtPeriodsBatch's own comment for why), attributed to whichever teacher/group was
// active when that period was recognized, so this view and the teacher's own commission calculation
// can never disagree with each other. Batched (one User.find + 2 queries inside
// computeCoveredDebtPeriodsBatch, for the WHOLE group) instead of ~3 round-trips per student.
export const computeGroupRevenue = async (groupId, dateFrom, dateTo) => {
    const group = await Group.findById(groupId)
        .populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name').lean()
    if (!group) return null

    const entries = []
    const students = await User.find({ _id: { $in: group.studentIds } }).select('name').lean()
    const nameByStudent = new Map(students.map(s => [String(s._id), s.name]))
    const coveredByStudent = await computeCoveredDebtPeriodsBatch(group.studentIds, group.languageId)
    for (const studentId of group.studentIds) {
        const covered = coveredByStudent.get(String(studentId)) || []
        for (const p of covered) {
            if (String(p.groupId) !== String(groupId)) continue
            if (p.periodStart > dateTo || p.periodEnd < dateFrom) continue
            const amount = prorateByDateOverlap(p.amount, p.periodStart, p.periodEnd, dateFrom, dateTo)
            if (amount > 0) entries.push({ date: p.periodStart, periodEnd: p.periodEnd, studentId, studentName: nameByStudent.get(String(studentId)), amount })
        }
    }

    const totalRevenue = entries.reduce((sum, e) => sum + e.amount, 0)

    return {
        groupId, languageName: group.languageId?.name, levelName: group.levelId?.name,
        teacherId: group.teacherId?._id, teacherName: group.teacherId?.name,
        entries, totalRevenue,
    }
}
