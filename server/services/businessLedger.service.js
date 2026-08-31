// The whole-business cash ledger for the accounting Ledger page - every Payment received (Credit)
// and every Expense paid out (Debit, including Salary and Refund - a refund is booked as its own
// Expense rather than netted against the original payment, matching the gross-revenue accounting
// model the rest of Finance already uses) merged into one chronological "where did every unit of
// money in this business's account come from and go to" timeline, with a running balance.
//
// Unlike the old version of this file (two live Payment/Expense aggregates on every call), this now
// just reads the branch Account's own stored LedgerEntry history - openingBalance/closingBalance are
// direct reads of a `balanceAfter` snapshot, not summed from scratch each time.
import Account from "../models/Account.js"
import LedgerEntry from "../models/LedgerEntry.js"
import Payment from "../models/Payment.js"
import Expense from "../models/Expense.js"

const METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']

export const computeBusinessLedger = async (branchId, dateFrom, dateTo) => {
    const account = await Account.findOne({ ownerType: 'branch', ownerId: branchId })
    if (!account) return { openingBalance: 0, entries: [], closingBalance: 0, totalIn: 0, totalOut: 0, byMethod: METHODS.map(m => ({ method: m, in: 0, out: 0, balance: 0 })), dateFrom, dateTo }

    // the balanceAfter on the last entry strictly before dateFrom already IS the opening balance -
    // no summing needed, that's the entire point of a stored running balance
    const lastBefore = await LedgerEntry.findOne({ accountId: account._id, date: { $lt: dateFrom } }).sort({ date: -1, _id: -1 }).lean()
    const openingBalance = lastBefore?.balanceAfter || 0

    const rows = await LedgerEntry.find({ accountId: account._id, date: { $gte: dateFrom, $lte: dateTo } })
        .sort({ date: 1, _id: 1 })
        .populate('teacherId', 'name')
        .populate('createdBy', 'name')
        .lean()

    // pull the source Payment/Expense docs this range's entries point back to, for display fields
    // (category, recipient, refund status) this schema deliberately doesn't duplicate
    const paymentIds = rows.filter(r => r.sourceType === 'payment').map(r => r.sourceId)
    const expenseIds = rows.filter(r => r.sourceType === 'expense').map(r => r.sourceId)
    const [payments, expenses] = await Promise.all([
        Payment.find({ _id: { $in: paymentIds } }).populate('studentId', 'name').lean(),
        Expense.find({ _id: { $in: expenseIds } }).lean(),
    ])
    const paymentById = new Map(payments.map(p => [String(p._id), p]))
    const expenseById = new Map(expenses.map(e => [String(e._id), e]))

    const entries = rows.map(r => {
        const type = r.direction === 'increase' ? 'credit' : 'debit'
        if (r.sourceType === 'payment') {
            const p = paymentById.get(String(r.sourceId))
            return {
                date: r.date, type, amount: r.amount, category: 'Payment',
                description: p?.studentId?.name || '—', method: r.method,
                refunded: p?.refunded, refundedAmount: p?.refundedAmount || 0,
                sourceType: 'payment', sourceId: r.sourceId,
            }
        }
        if (r.sourceType === 'expense') {
            const e = expenseById.get(String(r.sourceId))
            return {
                date: r.date, type, amount: r.amount, category: e?.category || r.kind,
                description: e?.name || e?.recipient || e?.category || r.description, method: r.method,
                teacherName: r.teacherId?.name || null, recordedBy: r.createdBy?.name || null,
                sourceType: 'expense', sourceId: r.sourceId,
            }
        }
        return { date: r.date, type, amount: r.amount, category: r.kind, description: r.description, method: r.method, balanceAfter: r.balanceAfter }
    })
    entries.forEach((e, i) => { e.balanceAfter = rows[i].balanceAfter })

    const closingBalance = entries.length ? entries[entries.length - 1].balanceAfter : openingBalance
    const totalIn = entries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0)
    const totalOut = entries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0)

    // per-method balance is a LIFETIME figure (like a real cash-drawer/bank-account balance is never
    // "for the dates you happen to be looking at right now") - deliberately NOT scoped to
    // dateFrom/dateTo. This is also what backs the Finance page's "Net Profit" breakdown popover.
    const byMethodAgg = await LedgerEntry.aggregate([
        { $match: { accountId: account._id, method: { $ne: null } } },
        { $group: { _id: { method: '$method', direction: '$direction' }, total: { $sum: '$amount' } } },
    ])
    const byMethod = METHODS.map(method => {
        const inTotal = byMethodAgg.find(r => r._id.method === method && r._id.direction === 'increase')?.total || 0
        const outTotal = byMethodAgg.find(r => r._id.method === method && r._id.direction === 'decrease')?.total || 0
        return { method, in: inTotal, out: outTotal, balance: inTotal - outTotal }
    })

    return { openingBalance, entries, closingBalance, totalIn, totalOut, byMethod, dateFrom, dateTo }
}
