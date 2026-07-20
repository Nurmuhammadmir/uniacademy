// Read-only accounting ledger, built by REPLAYING the exact same proration algorithm
// adminController.recalculateCourseBilling already uses - never a second, independently-maintained
// source of truth. Nothing here is persisted: every Debit (charge) row is derived on demand from
// real Payment documents plus the course's current price, the same way recalculateCourseBilling
// derives balance/subscriptionExpiresAt. This means:
//   - no migration was needed to "turn on" the ledger - it already reflects a student's full history
//   - it can never drift out of sync with the live billing engine, because it IS that engine's math,
//     just emitting every intermediate step as a line item instead of only the final numbers
// Known, inherited limitation (same as recalculateCourseBilling): every historical charge is priced
// at the course's CURRENT Pricing row, not whatever price was actually in effect back when that
// period happened - Payment never snapshotted "price paid" historically, so a past price change
// cannot be reconstructed after the fact. Flagged here rather than silently presented as more
// precise than it structurally can be.
import User from "../models/User.js"
import Group from "../models/Group.js"
import Payment from "../models/Payment.js"
import Pricing from "../models/Pricing.js"
import CoursePeriod from "../models/CoursePeriod.js"
import { applyDiscount } from "./discount.service.js"
import { prorateByDateOverlap } from "./attribution.service.js"

const endOfMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999))
const startOfNextMonthUTC = (endOfMonthDate) => new Date(Date.UTC(endOfMonthDate.getUTCFullYear(), endOfMonthDate.getUTCMonth() + 1, 1))
const daysInMonthUTC = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()

const chunkCost = (windowStart, price) => {
    const daysInMonth = daysInMonthUTC(windowStart)
    const dayOfMonth = windowStart.getUTCDate()
    const isFullMonth = dayOfMonth === 1
    const daysRemaining = daysInMonth - dayOfMonth + 1
    return { cost: isFullMonth ? price : Math.round(price * daysRemaining / daysInMonth), daysInMonth, daysRemaining, isFullMonth }
}

// one course's full statement: every Credit (payment received) and Debit (period charged for) in
// chronological order, each carrying the running balance immediately after it - exactly what a bank
// statement's "было / приход / расход / стало" columns show
export const computeCourseStatement = async (studentId, languageId) => {
    const student = await User.findById(studentId).select('courses name phone')
    if (!student) return null
    const course = student.courses.find(c => String(c.languageId) === String(languageId))
    if (!course) return null

    const pricing = course.levelId ? await Pricing.findOne({ languageId, levelId: course.levelId }) : null
    const price = pricing?.monthlyPrice ?? null

    const payments = await Payment.find({ studentId, languageId }).sort({ date: 1 })

    const entries = []
    let balance = 0
    let subscriptionExpiresAt = null

    for (const payment of payments) {
        const net = payment.refunded ? 0 : payment.amount - (payment.refundedAmount || 0)
        balance += net
        entries.push({
            type: 'credit', date: payment.date, amount: net, balanceAfter: balance,
            method: payment.method, paymentId: payment._id,
            refunded: payment.refunded, refundedAmount: payment.refundedAmount || 0,
        })

        if (price && price > 0) {
            while (true) {
                const windowStart = subscriptionExpiresAt && subscriptionExpiresAt > payment.date
                    ? startOfNextMonthUTC(subscriptionExpiresAt)
                    : new Date(Date.UTC(payment.date.getUTCFullYear(), payment.date.getUTCMonth(), payment.date.getUTCDate()))
                const { cost: rawCost } = chunkCost(windowStart, price)
                const { cost, discount } = await applyDiscount(rawCost, studentId, languageId, windowStart)
                if (cost <= 0 || balance < cost) break
                balance -= cost
                const windowEnd = endOfMonthUTC(windowStart)
                entries.push({
                    type: 'debit', date: windowStart, amount: cost, balanceAfter: balance,
                    periodStart: windowStart, periodEnd: windowEnd,
                    discounted: !!discount,
                })
                subscriptionExpiresAt = windowEnd
            }
        }
    }

    // the CURRENT period, if the student is due for one right now but hasn't paid enough to cover
    // it yet - kept separate from `entries` (which are only ever fully-committed/paid periods) and
    // clearly marked as pending, rather than inventing an unpaid debt the access-gating logic
    // (recalculateCourseBilling/paymentGate) doesn't actually track today
    let pendingCharge = null
    if (price && price > 0) {
        const now = new Date()
        if (!subscriptionExpiresAt || subscriptionExpiresAt <= now) {
            const windowStart = subscriptionExpiresAt
                ? startOfNextMonthUTC(subscriptionExpiresAt)
                : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
            const { cost: rawCost, daysInMonth, daysRemaining, isFullMonth } = chunkCost(windowStart, price)
            const { cost, discount } = await applyDiscount(rawCost, studentId, languageId, windowStart)
            pendingCharge = {
                periodStart: windowStart, periodEnd: endOfMonthUTC(windowStart), amount: cost,
                daysInMonth, daysRemaining, isFullMonth, amountStillNeeded: Math.max(0, cost - balance),
                discounted: !!discount,
            }
        }
    }

    const owed = pendingCharge?.amountStillNeeded || 0
    const status = owed > 0 ? 'owes' : balance > 0 ? 'credit' : 'settled'

    return {
        studentId, studentName: student.name, languageId, levelId: course.levelId, price,
        entries, balance, owed, status, pendingCharge,
    }
}

// every course a student has ever had, each with its own statement - a student's "лицевой счёт" is
// really N independent sub-ledgers (pricing/periods are course-scoped throughout this codebase),
// shown together as one page rather than merged into a single misleading combined balance
export const computeStudentStatements = async (studentId) => {
    const student = await User.findById(studentId).select('courses name phone')
    if (!student) return null
    const statements = []
    for (const course of student.courses) {
        const statement = await computeCourseStatement(studentId, course.languageId)
        if (statement) statements.push(statement)
    }
    return { studentId, studentName: student.name, studentPhone: student.phone, courses: statements }
}

// the "Акт сверки" report: for each student (the caller resolves WHICH students - one specific
// student, a group's roster, or the whole branch - before calling this), opening balance / charges
// in range / payments in range / closing balance per course, same "было-приход-расход-стало" shape
// as the statement view but summarized to a date window, plus a branch/group-wide total row.
// `discrepancy: true` flags any course where the student currently owes money (charged for a period
// they haven't fully paid for) - the visual "something doesn't add up" signal the report needs.
export const computeReconciliation = async (studentIds, dateFrom, dateTo) => {
    const rows = []
    for (const studentId of studentIds) {
        const result = await computeStudentStatements(studentId)
        if (!result) continue
        for (const course of result.courses) {
            const openingBalance = course.entries
                .filter(e => e.date < dateFrom)
                .reduce((sum, e) => sum + (e.type === 'credit' ? e.amount : -e.amount), 0)
            const inRange = course.entries.filter(e => e.date >= dateFrom && e.date <= dateTo)
            const charges = inRange.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0)
            const payments = inRange.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0)
            rows.push({
                studentId, studentName: result.studentName, languageId: course.languageId, levelId: course.levelId,
                openingBalance, charges, payments, closingBalance: openingBalance + payments - charges,
                owed: course.owed, status: course.status, discrepancy: course.owed > 0,
            })
        }
    }
    const totals = rows.reduce((acc, r) => ({
        openingBalance: acc.openingBalance + r.openingBalance,
        charges: acc.charges + r.charges,
        payments: acc.payments + r.payments,
        closingBalance: acc.closingBalance + r.closingBalance,
        owed: acc.owed + r.owed,
    }), { openingBalance: 0, charges: 0, payments: 0, closingBalance: 0, owed: 0 })

    return { rows, totals, dateFrom, dateTo }
}

// group-level view of "where did this money come from and where is it going" - Credits are every
// CoursePeriod attributed to this group (snapshotted at the moment each period was actually
// consumed, so a student who switched groups mid-course correctly attributes only the periods
// taught AFTER the switch to this group - unlike Payment.groupId, which freezes at payment time and
// would otherwise keep crediting the OLD group forever). Same figures
// salaryCalculation.service.js's `percent_of_revenue` rate type sums for its teacher's commission,
// so this view and that calculation can never disagree with each other.
// The teacher's own payout isn't split per-group anywhere in this codebase (a teacher's salary is
// computed across ALL their groups combined, and per_student_month/fixed_monthly/per_lesson/per_hour
// rate types aren't attributable to one group's revenue at all), so this deliberately doesn't
// present a fabricated per-group "money paid out" figure - the caller (getReconciliation) attaches
// the teacher's actual computed salary for the same period as context alongside this.
export const computeGroupRevenue = async (groupId, dateFrom, dateTo) => {
    const group = await Group.findById(groupId)
        .populate('languageId', 'name').populate('levelId', 'name').populate('teacherId', 'name')
    if (!group) return null

    // each period's contribution is PRORATED to just the days inside [dateFrom, dateTo] - see
    // prorateByDateOverlap's own comment for why (prevents double/under-counting when a period only
    // partially overlaps the requested range)
    const periods = await CoursePeriod.find({ groupId, periodStart: { $lte: dateTo }, periodEnd: { $gte: dateFrom } })
        .populate('studentId', 'name').sort({ periodStart: 1 })
    const entries = periods.map(p => ({
        date: p.periodStart, periodEnd: p.periodEnd, studentId: p.studentId?._id, studentName: p.studentId?.name,
        amount: prorateByDateOverlap(p.amount, p.periodStart, p.periodEnd, dateFrom, dateTo), periodId: p._id,
    }))

    // ALSO counts each current member's unconsumed balance (paid but not yet enough to complete a
    // full period) as a live, not-yet-committed period - see salaryCalculation.service.js's
    // identical comment on percent_of_revenue for why
    for (const studentId of group.studentIds) {
        const statement = await computeCourseStatement(studentId, group.languageId)
        const pending = statement?.pendingCharge
        if (!pending) continue
        const paidPortion = pending.amount - pending.amountStillNeeded
        if (paidPortion <= 0) continue
        const amount = prorateByDateOverlap(paidPortion, pending.periodStart, pending.periodEnd, dateFrom, dateTo)
        if (amount > 0) entries.push({ date: pending.periodStart, periodEnd: pending.periodEnd, studentId, studentName: statement.studentName, amount, pending: true })
    }

    const totalRevenue = entries.reduce((sum, e) => sum + e.amount, 0)

    return {
        groupId, languageName: group.languageId?.name, levelName: group.levelId?.name,
        teacherId: group.teacherId?._id, teacherName: group.teacherId?.name,
        entries, totalRevenue,
    }
}
