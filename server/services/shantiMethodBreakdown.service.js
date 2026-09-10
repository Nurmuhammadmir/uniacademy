// Shared validation for a split/mixed payment ("xar xil to'lov") - a payment that was actually paid
// across more than one method at once (e.g. part cash, part bank transfer). Every model that
// records a payment (Sale, Purchase, ShantiPayment, ShantiBalanceAdjustment, ShantiExpense) accepts
// an optional `methodBreakdown` alongside its existing single `method` field; this is the one place
// that decides whether a submitted breakdown is valid.
import { SHANTI_METHODS } from "../models/shantiConstants.js"

// Returns null when valid (including when breakdown is absent/empty - the normal single-method
// case that every existing document already uses), or an error code string when it isn't.
export const validateMethodBreakdown = (breakdown, targetAmount) => {
    if (!breakdown || breakdown.length === 0) return null
    for (const row of breakdown) {
        if (!row || !SHANTI_METHODS.includes(row.method)) return 'invalid_method'
        if (!(Number(row.amount) > 0)) return 'invalid_amount'
    }
    const sum = breakdown.reduce((total, row) => total + Number(row.amount), 0)
    if (Math.abs(sum - targetAmount) > 0.01) return 'breakdown_amount_mismatch'
    return null
}

export const normalizeMethodBreakdown = (breakdown) =>
    (breakdown || []).map(row => ({ method: row.method, amount: Number(row.amount) }))

// A balance-by-method aggregation that treats a document's `methodBreakdown` (when present) as the
// source of truth, falling back to its plain `{method, <amountField>}` pair otherwise - so every
// existing single-method document (the overwhelming majority) is summed exactly as before, and a
// split payment's amount lands on each of its actual methods instead of just the first one.
export const methodBreakdownAggregation = (amountField) => [
    {
        $project: {
            breakdown: {
                $cond: [
                    { $gt: [{ $size: { $ifNull: ['$methodBreakdown', []] } }, 0] },
                    '$methodBreakdown',
                    [{ method: '$method', amount: `$${amountField}` }],
                ],
            },
        },
    },
    { $unwind: '$breakdown' },
    { $group: { _id: '$breakdown.method', total: { $sum: '$breakdown.amount' } } },
]
