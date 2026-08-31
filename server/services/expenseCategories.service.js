import ExpenseCategory from "../models/ExpenseCategory.js"

// shared category-name constants - anything that needs to POST an expense under one of these exact
// categories (salary payouts, prepayments, refunds) or check for the fallback category imports
// these instead of repeating the literal string, so renaming one only ever means changing it here.
// All default categories are Uzbek-named (this branch's own working language), not English -
// "Ish haqi MENTOR" specifically (not a generic "Salary"/"Ish haqi") since every teacher salary
// payout, from any admin or director, always lands under this one exact category by design.
export const SALARY_CATEGORY = 'Ish haqi MENTOR'
export const PREPAYMENT_CATEGORY = 'Avans'
export const REFUND_CATEGORY = 'Qaytarish'
export const CHEGIRMA_CATEGORY = 'Chegirma'
export const OTHER_CATEGORY = 'Boshqa'

// "Ish haqi MENTOR" must always exist as a real category (not just a string paySalary happens to
// write) so a payout always lands with a correct name/color instead of silently falling back to
// nothing - shared between expenseController (branch's category-management UI) and
// adminController/directorController's paySalary (which needs this guarantee at the moment a payout
// is recorded, not just whenever the Expenses page has already been opened once).
export const DEFAULT_CATEGORIES = [
    { name: SALARY_CATEGORY, color: '#3E7CB1' },
    { name: PREPAYMENT_CATEGORY, color: '#E67E22' },
    { name: REFUND_CATEGORY, color: '#C0392B' },
    { name: CHEGIRMA_CATEGORY, color: '#C2185B' },
    { name: 'Arenda', color: '#8E44AD' },
    { name: 'Kommunal', color: '#16A085' },
    { name: 'Reklama', color: '#D6497A' },
    { name: 'Jihozlar', color: '#B7950B' },
    { name: OTHER_CATEGORY, color: '#7A7266' },
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
// (like Avans) would otherwise never get created for it
export const ensureCategoryExists = async (branchId, name, color) => {
    await ExpenseCategory.findOneAndUpdate(
        { branchId, name },
        { $setOnInsert: { branchId, name, color } },
        { upsert: true }
    )
}
