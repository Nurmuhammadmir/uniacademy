import mongoose from "mongoose"

// generic branch expense ledger - backs the Finance page's "Xarajatlar" (Expenses) tab and its
// "net profit" figure (payments minus expenses). A salary payout is just an expense with
// category:'salary' and teacherId set; other operating costs (rent, utilities, etc.) are logged the
// same way with whichever category the branch has defined in ExpenseCategory.
const EXPENSE_METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']
const expenseSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, default: '' }, // "Nomi" - what the expense was for
    category: { type: String, default: 'Boshqa' }, // matches an ExpenseCategory.name for this branch (falls back to expenseCategories.service.js's OTHER_CATEGORY if that category was since deleted)
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    recipient: { type: String, default: '' }, // "Oluvchi" - who received the money
    method: { type: String, enum: EXPENSE_METHODS, default: 'cash' },
    note: { type: String, default: '' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // set for category:'salary' rows
    // salary/prepayment payouts only: the pay period the money was FOR (what the Salary page had
    // selected when Pay/Prepay was clicked), independent of `date` (when the money left the till).
    // The Salary calculator attributes a payout to the period it was for, so paying September's
    // salary on Oct 3 still counts against September. Rows without it (older payouts) fall back to
    // `date`.
    salaryPeriodFrom: { type: Date, default: null },
    salaryPeriodTo: { type: Date, default: null },
    // set only for a refund's own bookkeeping Expense (see adminController.refundPayment) - the one
    // link back to the Payment it refunded, so deletePayment can find and remove it too. Without this,
    // permanently deleting a payment that had been refunded correctly erases the ledger's own trace of
    // both events but leaves this Expense behind forever, silently overstating costs (and understating
    // net profit) for a refund whose underlying payment no longer even exists.
    refundOfPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // links this record to the LedgerEntry it posted (branch decrease, teacher decrease for salary
    // payouts) - see Payment.ledgerTransactionId for why this exists.
    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true })

export { EXPENSE_METHODS }

expenseSchema.index({ branchId: 1, date: 1 })

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema)
export default Expense
