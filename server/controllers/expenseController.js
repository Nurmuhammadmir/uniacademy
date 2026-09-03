// backs the Finance section's "Xarajatlar" (Expenses) tab - manageable categories plus the actual
// expense ledger (salary payouts land here too, written by adminController.paySalary)
import mongoose from "mongoose"
import Expense, { EXPENSE_METHODS } from "../models/Expense.js"
import ExpenseCategory from "../models/ExpenseCategory.js"
import LedgerEntry from "../models/LedgerEntry.js"
import { startOfLocalDay, endOfLocalDay, isEditableToday } from "../services/businessTime.service.js"
import { ensureDefaultCategories, OTHER_CATEGORY } from "../services/expenseCategories.service.js"
import { getOrCreateAccount, postEntry, deleteEntries } from "../services/ledger.service.js"

// ==== Categories ====

export const listExpenseCategories = async (req, res) => {
    try {
        await ensureDefaultCategories(req.auth.branchId)
        const categories = await ExpenseCategory.find({ branchId: req.auth.branchId }).sort({ name: 1 }).lean()
        res.json({ categories })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createExpenseCategory = async (req, res) => {
    try {
        const { name, color } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const category = await ExpenseCategory.create({ branchId: req.auth.branchId, name: name.trim(), color: color || '#7A7266' })
        res.status(201).json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateExpenseCategory = async (req, res) => {
    try {
        const { name, color } = req.body
        const category = await ExpenseCategory.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!category) return res.status(404).json({ error: 'not_found' })

        const oldName = category.name
        if (name !== undefined && name.trim()) category.name = name.trim()
        if (color !== undefined) category.color = color
        await category.save()

        // existing expense rows carry the category NAME, not an id - renaming must cascade so they
        // stay attributed to the (renamed) category instead of silently becoming "unknown"
        if (category.name !== oldName) {
            await Expense.updateMany({ branchId: req.auth.branchId, category: oldName }, { category: category.name })
        }
        res.json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// deleting a category reassigns its existing expenses to "Other" rather than leaving them pointed
// at a category name that no longer exists in the manageable list
export const deleteExpenseCategory = async (req, res) => {
    try {
        const category = await ExpenseCategory.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!category) return res.status(404).json({ error: 'not_found' })
        if (category.name === OTHER_CATEGORY) return res.status(400).json({ error: 'cannot_delete_other' })

        await ensureDefaultCategories(req.auth.branchId)
        await Expense.updateMany({ branchId: req.auth.branchId, category: category.name }, { category: OTHER_CATEGORY })
        await category.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Expenses ====

// not paginated (unlike payments) - a branch's operating-expense volume is typically small enough
// to load in full, and the bar/pie charts need the whole set to aggregate correctly anyway
export const getExpensesOverview = async (req, res) => {
    try {
        const { dateFrom, dateTo, category, categories, method, search, amountMin, amountMax, groupBy } = req.query
        // cast explicitly - .find() below auto-casts a raw string fine, but the .aggregate() $match
        // further down does NOT, and would silently match zero documents against a real ObjectId field
        const match = { branchId: new mongoose.Types.ObjectId(req.auth.branchId) }
        if (dateFrom || dateTo) {
            match.date = {}
            if (dateFrom) match.date.$gte = startOfLocalDay(dateFrom)
            if (dateTo) match.date.$lte = endOfLocalDay(dateTo)
        }
        // `categories` (comma-separated, from the filter panel's multi-select) and the older
        // single `category` (from a legend/pie-slice quick-filter click) both narrow by category -
        // whichever one the caller sent wins, they're never both present at once
        const categoryList = categories ? categories.split(',').filter(Boolean) : (category ? [category] : [])
        if (categoryList.length > 0) match.category = { $in: categoryList }
        if (method) match.method = method
        if (amountMin || amountMax) {
            match.amount = {}
            if (amountMin) match.amount.$gte = Number(amountMin)
            if (amountMax) match.amount.$lte = Number(amountMax)
        }
        if (search) {
            const q = search.trim()
            match.$or = [{ name: new RegExp(q, 'i') }, { recipient: new RegExp(q, 'i') }]
        }

        const expenses = await Expense.find(match).sort({ date: -1 }).populate('teacherId', 'name').populate('createdBy', 'name').lean()

        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

        const byCategoryMap = {}
        expenses.forEach(e => { byCategoryMap[e.category] = (byCategoryMap[e.category] || 0) + e.amount })
        const byCategory = Object.entries(byCategoryMap).map(([cat, total]) => ({ category: cat, total }))

        const dateFormat = groupBy === 'year' ? '%Y' : '%Y-%m'
        const series = await Expense.aggregate([
            { $match: match },
            { $group: { _id: { $dateToString: { format: dateFormat, date: '$date' } }, total: { $sum: '$amount' } } },
            { $sort: { _id: 1 } },
        ])

        res.json({
            expenses, totalAmount, byCategory,
            series: series.map(s => ({ period: s._id, total: s.total })),
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// full single-expense detail backing the Finance page's "click a transaction row" page - includes
// fields the list/overview row never shows (note, who logged it, exact created timestamp)
export const getExpenseDetail = async (req, res) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, branchId: req.auth.branchId })
            .populate('teacherId', 'name').populate('createdBy', 'name').lean()
        if (!expense) return res.status(404).json({ error: 'not_found' })
        res.json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// every expense - rent, marketing, equipment, everything except salary/prepayment (which post their
// own ledger entry directly in adminController.js's paySalary/prepaySalary) - decreases the branch
// account the same way. `kind:'expense'` in the ledger, `category` stays on the Expense document
// itself (see LedgerEntry.sourceType/sourceId, which businessLedger.service.js joins back through).
export const createExpense = async (req, res) => {
    try {
        const { name, category, amount, date, recipient, method } = req.body
        // !amount let a negative amount straight through (only 0/null/undefined/NaN are falsy) -
        // same class of bug already fixed on createPayment/updatePayment this session
        if (!(amount > 0)) return res.status(400).json({ error: 'amount_required' })
        if (method && !EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const expenseDate = date ? new Date(date) : new Date()
        const expense = await Expense.create({
            branchId: req.auth.branchId, name: name || '', category: category || OTHER_CATEGORY,
            amount, date: expenseDate, recipient: recipient || '',
            method: method || 'cash', createdBy: req.auth.userId,
        })
        const branchAccount = await getOrCreateAccount('branch', req.auth.branchId)
        const entry = await postEntry({
            accountId: branchAccount._id, direction: 'decrease', amount, kind: 'expense', method: expense.method,
            meta: { sourceType: 'expense', sourceId: expense._id },
            description: expense.name || expense.category, createdBy: req.auth.userId, date: expenseDate,
        })
        if (entry) { expense.ledgerTransactionId = entry.transactionId; await expense.save({ validateModifiedOnly: true }) }
        res.status(201).json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateExpense = async (req, res) => {
    try {
        const { name, category, amount, date, recipient, method } = req.body
        if (method && !EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const expense = await Expense.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!expense) return res.status(404).json({ error: 'not_found' })
        if (!isEditableToday(expense)) return res.status(403).json({ error: 'expense_locked' })
        // matches createExpense's own guard - without it, a zero/negative corrected amount stored
        // straight onto the expense document while the ledger delta posted against the OLD amount,
        // leaving the two permanently disagreeing about this expense's real size
        if (amount !== undefined && !(Number(amount) > 0)) return res.status(400).json({ error: 'amount_required' })

        if (amount !== undefined && Number(amount) !== expense.amount) {
            const delta = Number(amount) - expense.amount
            const branchAccount = await getOrCreateAccount('branch', req.auth.branchId)
            await postEntry({
                accountId: branchAccount._id, direction: delta > 0 ? 'decrease' : 'increase', amount: Math.abs(delta),
                kind: 'expense', method: expense.method,
                meta: { sourceType: 'expense', sourceId: expense._id },
                description: `Correction to ${expense.name || expense.category} - ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta).toLocaleString()}`,
                createdBy: req.auth.userId, date: new Date(),
            })
            expense.amount = Number(amount)
        }
        if (method !== undefined && method !== expense.method && expense.ledgerTransactionId) {
            await LedgerEntry.updateMany({ transactionId: expense.ledgerTransactionId }, { method })
        }

        if (name !== undefined) expense.name = name
        if (category !== undefined) expense.category = category
        if (date !== undefined) expense.date = new Date(date)
        if (recipient !== undefined) expense.recipient = recipient
        if (method !== undefined) expense.method = method
        await expense.save()

        res.json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// confirmed product decision: deleting an expense (a plain cost, or a salary/prepayment payout -
// same Expense model, same delete path) must leave no trace in the ledger at all. deleteEntries
// removes every entry this expense ever posted - the branch's own decrease, AND the teacher's own
// decrease too for a salary/prepayment payout, since both legs share this expense's sourceId - so
// every account involved ends up exactly as if the expense never happened, not merely netted to
// zero by a second entry sitting next to the first forever.
export const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, branchId: req.auth.branchId })
        if (!expense) return res.status(404).json({ error: 'not_found' })
        if (!isEditableToday(expense)) return res.status(403).json({ error: 'expense_locked' })

        await deleteEntries({ sourceType: 'expense', sourceId: expense._id })

        await expense.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
