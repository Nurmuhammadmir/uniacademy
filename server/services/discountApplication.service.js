// applies a discount RIGHT NOW - not a future billing adjustment (that was the old Discount model's
// design, retired: it only reduced a month's cost the next time billing recognized that period,
// which meant "applying" a discount often looked like it did nothing until next month). Confirmed
// final spec (after two earlier attempts - a plain expense, then a fake Payment - both got walked
// back): a discount is a single, quiet ledger entry on the STUDENT's own account only, kind
// 'discount'. It settles the debt and counts toward teacher revenue exactly like a real payment
// would (see billingCycle.service.js's applyFifoCoverage), but never touches the branch's own
// account, never creates a Payment or Expense document, and so never shows up in the branch ledger,
// the Payments list, the Expenses list, or the Finance page's totals - the only place it's visible
// at all is a plain "discount applied" line on the student's own profile, and it's fully reversible
// (see deleteDiscountEntry below).
import User from "../models/User.js"
import LedgerEntry from "../models/LedgerEntry.js"
import { getOrCreateAccount, postEntry, deleteEntries } from "./ledger.service.js"
import { recomputeEnrollmentStatus, computeCourseOwed } from "./billingCycle.service.js"

// one student, one course - the building block every scope (single student / whole group / whole
// course) reduces to. Returns null (no-op, not an error) when the student isn't actually enrolled in
// this course, so a bulk apply across a group/course can just skip anyone who doesn't match instead
// of failing the whole batch.
export const applyDiscountToStudent = async ({ student, languageId, type, value, userId, date = new Date() }) => {
    const course = student.courses.find(c => String(c.languageId) === String(languageId))
    if (!course) return null
    // a discount only ever makes sense against a real, currently-billed debt - a course with no
    // group yet has never had anything charged to it (confirmed spec: discounting only kicks in
    // once the student is actually placed in a group and a period's been billed). This also fixes a
    // real bug: a percent discount used to be computed off the GROUP's flat monthly price, not what
    // was actually owed - for the very common case of a partial (prorated) first month, "50% off"
    // was crediting far more than 50% of that month's real 100,000 debt, since the group's nominal
    // price (say 230,000) was never what was actually billed for a partial period in the first place.
    if (!course.groupId) return null
    const studentAccount = await getOrCreateAccount('student', student._id)
    const owed = await computeCourseOwed(studentAccount._id, languageId)
    if (!(owed > 0)) return null

    // a discount reduces a charge - it can never exceed what's actually owed for this course (a
    // fixed-amount discount has no natural upper bound from the input itself, unlike percent, which
    // can never exceed 100% of `owed` by construction) - clamped here so a typo (e.g. an extra zero)
    // can't manufacture wallet credit out of nowhere instead of just settling the real debt
    const amount = Math.min(owed, type === 'percent' ? Math.round(owed * value / 100) : Math.round(value))
    if (!(amount > 0)) return null

    const label = type === 'percent' ? `${value}% chegirma` : `${amount.toLocaleString()} chegirma`
    const entry = await postEntry({
        accountId: studentAccount._id, direction: 'decrease', amount, kind: 'discount',
        meta: { studentId: student._id, groupId: course.groupId, languageId, levelId: course.levelId || null },
        description: `Chegirma - ${label}`, createdBy: userId, date,
    })

    // the credit above can bring the student's overall balance to zero/negative - without
    // recomputing here (exactly like createPayment/refundPayment/deletePayment all already do), a
    // course keeps showing 'inactive' forever even though the account no longer owes anything
    await recomputeEnrollmentStatus(student)
    await student.save()

    return { amount, entry }
}

// undoes a discount entirely - the student's balance/debt returns to exactly what it was before,
// same true-delete guarantee deletePayment/deleteExpense already give (deleteEntries reverses the
// account and re-stamps every later entry's balanceAfter snapshot, not just a quick balance patch)
export const deleteDiscountEntry = async (entryId) => {
    const entry = await LedgerEntry.findById(entryId).lean()
    if (!entry || entry.kind !== 'discount') return null

    const student = await User.findById(entry.studentId)
    if (!student) return null

    await deleteEntries({ transactionId: entry.transactionId })

    await recomputeEnrollmentStatus(student)
    await student.save()
    return true
}
