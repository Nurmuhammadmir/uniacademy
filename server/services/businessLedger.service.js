// The whole-business cash ledger for the accounting Ledger page - every Payment received (Credit)
// and every Expense paid out (Debit, including Salary and Refund - a refund is booked as its own
// Expense rather than netted against the original payment, matching the gross-revenue accounting
// model the rest of Finance already uses) merged into one chronological "where did every unit of
// money in this business's account come from and go to" timeline, with a running balance.
import User from "../models/User.js"
import Payment from "../models/Payment.js"
import Expense from "../models/Expense.js"

// every payment method treated as its own mini cash-drawer/account - Payme/Apelsin only ever show
// up on the expense side today (Payment's own method enum doesn't include them yet), which is fine:
// that just means nothing has ever come IN through those methods, only gone OUT (e.g. a salary paid
// via Payme)
const METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']

export const computeBusinessLedger = async (branchId, dateFrom, dateTo) => {
    const branchStudents = await User.find({ branchId, role: 'student' }).select('_id')
    const studentIds = branchStudents.map(s => s._id)

    const [paymentsBeforeAgg, expensesBeforeAgg] = await Promise.all([
        Payment.aggregate([
            { $match: { studentId: { $in: studentIds }, date: { $lt: dateFrom } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
            { $match: { branchId, date: { $lt: dateFrom } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ])
    const openingBalance = (paymentsBeforeAgg[0]?.total || 0) - (expensesBeforeAgg[0]?.total || 0)

    const [payments, expenses] = await Promise.all([
        Payment.find({ studentId: { $in: studentIds }, date: { $gte: dateFrom, $lte: dateTo } })
            .populate('studentId', 'name').sort({ date: 1 }),
        Expense.find({ branchId, date: { $gte: dateFrom, $lte: dateTo } })
            .populate('teacherId', 'name').populate('createdBy', 'name').sort({ date: 1 }),
    ])

    const entries = []
    payments.forEach(p => entries.push({
        date: p.date, type: 'credit', amount: p.amount, category: 'Payment',
        description: p.studentId?.name || '—', method: p.method,
        refunded: p.refunded, refundedAmount: p.refundedAmount || 0,
        sourceType: 'payment', sourceId: p._id,
    }))
    expenses.forEach(e => entries.push({
        date: e.date, type: 'debit', amount: e.amount, category: e.category,
        description: e.name || e.recipient || e.category, method: e.method,
        teacherName: e.teacherId?.name || null, recordedBy: e.createdBy?.name || null,
        sourceType: 'expense', sourceId: e._id,
    }))
    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let balance = openingBalance
    entries.forEach(e => {
        balance += e.type === 'credit' ? e.amount : -e.amount
        e.balanceAfter = balance
    })

    const totalIn = entries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0)
    const totalOut = entries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0)

    // per-method balance is a LIFETIME figure (like a real cash-drawer/bank-account balance is never
    // "for the dates you happen to be looking at right now") - deliberately NOT scoped to
    // dateFrom/dateTo the way `entries` above is. Drilling into one method on the frontend just
    // filters the already-fetched `entries` for the CURRENT date range, so "balance" and "history"
    // intentionally answer two different questions (all-time total vs. this period's activity).
    const [paymentsByMethodAgg, expensesByMethodAgg] = await Promise.all([
        Payment.aggregate([
            { $match: { studentId: { $in: studentIds } } },
            { $group: { _id: '$method', total: { $sum: '$amount' } } },
        ]),
        Expense.aggregate([
            { $match: { branchId } },
            { $group: { _id: '$method', total: { $sum: '$amount' } } },
        ]),
    ])
    const inByMethod = Object.fromEntries(paymentsByMethodAgg.map(r => [r._id, r.total]))
    const outByMethod = Object.fromEntries(expensesByMethodAgg.map(r => [r._id, r.total]))
    const byMethod = METHODS.map(method => ({
        method, in: inByMethod[method] || 0, out: outByMethod[method] || 0,
        balance: (inByMethod[method] || 0) - (outByMethod[method] || 0),
    }))

    return { openingBalance, entries, closingBalance: balance, totalIn, totalOut, byMethod, dateFrom, dateTo }
}
