import Discount from "../models/Discount.js"

export const monthKeyUTC = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

// looks up a student's discount (if any) for the calendar month a given billing window starts in,
// and applies it to that period's cost. Shared by recalculateCourseBilling, getPaymentPreview, and
// the ledger's own cost replay (studentLedger.service.js) so all three can never disagree about
// what a discounted month actually costs. Known scope limit: only affects periods not yet consumed -
// a discount added after a month's chunk was already charged does not retroactively reprice it (that
// would mean un-consuming an already-immutable CoursePeriod record, a separate, bigger feature).
export const applyDiscount = async (cost, studentId, languageId, windowStart) => {
    const discount = await Discount.findOne({ studentId, languageId, month: monthKeyUTC(windowStart) })
    if (!discount) return { cost, discount: null }
    const discounted = discount.type === 'percent'
        ? Math.round(cost * (1 - discount.value / 100))
        : cost - discount.value
    return { cost: Math.max(0, discounted), discount }
}
