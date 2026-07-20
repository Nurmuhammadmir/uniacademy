import ExpenseCategory from "../models/ExpenseCategory.js"

// "Salary" must always exist as a real category (not just a string paySalary happens to write) so
// a payout always lands with a correct name/color instead of silently falling back to nothing -
// shared between expenseController (branch's category-management UI) and adminController.paySalary
// (which needs this guarantee at the moment a payout is recorded, not just whenever the Expenses
// page has already been opened once).
export const DEFAULT_CATEGORIES = [
    { name: 'Salary', color: '#3E7CB1' },
    { name: 'Prepayment', color: '#E67E22' },
    { name: 'Refund', color: '#C0392B' },
    { name: 'Rent', color: '#8E44AD' },
    { name: 'Utilities', color: '#16A085' },
    { name: 'Marketing', color: '#D6497A' },
    { name: 'Equipment', color: '#B7950B' },
    { name: 'Other', color: '#7A7266' },
]

export const ensureDefaultCategories = async (branchId) => {
    const existing = await ExpenseCategory.countDocuments({ branchId })
    if (existing > 0) return
    try {
        await ExpenseCategory.insertMany(DEFAULT_CATEGORIES.map(c => ({ branchId, ...c })), { ordered: false })
    } catch (error) {
        // a concurrent request seeding the same branch at the same time is a harmless race - whichever
        // call lost just means the categories already exist, which is exactly the goal
        if (error.code !== 11000 && !error.writeErrors) throw error
    }
}

// guarantees ONE specific category exists with a real name/color, regardless of whether this
// branch already has other categories set up - ensureDefaultCategories above only seeds anything
// for a branch with ZERO categories, so a category introduced after a branch is already active
// (like 'Prepayment') would otherwise never get created for it
export const ensureCategoryExists = async (branchId, name, color) => {
    await ExpenseCategory.findOneAndUpdate(
        { branchId, name },
        { $setOnInsert: { branchId, name, color } },
        { upsert: true }
    )
}
