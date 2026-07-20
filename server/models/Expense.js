import mongoose from "mongoose"

// generic branch expense ledger - backs the Finance page's "Xarajatlar" (Expenses) tab and its
// "net profit" figure (payments minus expenses). A salary payout is just an expense with
// category:'salary' and teacherId set; other operating costs (rent, utilities, etc.) are logged the
// same way with whichever category the branch has defined in ExpenseCategory.
const EXPENSE_METHODS = ['cash', 'card', 'click', 'bank_transfer', 'payme', 'apelsin']
const expenseSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, default: '' }, // "Nomi" - what the expense was for
    category: { type: String, default: 'other' }, // matches an ExpenseCategory.name for this branch (falls back to "Other" if that category was since deleted)
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    recipient: { type: String, default: '' }, // "Oluvchi" - who received the money
    method: { type: String, enum: EXPENSE_METHODS, default: 'cash' },
    note: { type: String, default: '' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // set for category:'salary' rows
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export { EXPENSE_METHODS }

expenseSchema.index({ branchId: 1, date: 1 })

const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema)
export default Expense
