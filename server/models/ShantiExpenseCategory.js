// manageable expense categories (fuel, utilities, rent, ...) - exact shape of ShantiMaterialCategory.
// ShantiExpense.category stores the category NAME as a plain string, so deleting a category can
// simply reassign existing expenses to "Другое" without an orphaned foreign key.
import mongoose from "mongoose"

const shantiExpenseCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    color: { type: String, default: '#7A7266' },
}, { timestamps: true })

const ShantiExpenseCategory = mongoose.models.ShantiExpenseCategory || mongoose.model('ShantiExpenseCategory', shantiExpenseCategorySchema)
export default ShantiExpenseCategory
