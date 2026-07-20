import mongoose from "mongoose"

// manageable expense categories (Xarajatlar page) - a branch can add/rename/recolor/delete its own.
// Expense.category stores the category NAME as a plain string rather than a ref, so deleting a
// category can simply reassign existing rows to "Other" without an orphaned foreign key.
const expenseCategorySchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#7A7266' },
}, { timestamps: true })

expenseCategorySchema.index({ branchId: 1, name: 1 }, { unique: true })

const ExpenseCategory = mongoose.models.ExpenseCategory || mongoose.model('ExpenseCategory', expenseCategorySchema)
export default ExpenseCategory
