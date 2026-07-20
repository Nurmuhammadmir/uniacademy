// backs the Finance section's "Xarajatlar" (Expenses) tab - manageable categories plus the actual
// expense ledger (salary payouts land here too, written by adminController.paySalary)
import mongoose from "mongoose"
import Expense, { EXPENSE_METHODS } from "../models/Expense.js"
import ExpenseCategory from "../models/ExpenseCategory.js"
import { startOfLocalDay, endOfLocalDay } from "../services/businessTime.service.js"
import { ensureDefaultCategories } from "../services/expenseCategories.service.js"

// ==== Categories ====

export const listExpenseCategories = async (req, res) => {
    try {
        await ensureDefaultCategories(req.auth.branchId)
        const categories = await ExpenseCategory.find({ branchId: req.auth.branchId }).sort({ name: 1 })
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
        if (category.name === 'Other') return res.status(400).json({ error: 'cannot_delete_other' })

        await ensureDefaultCategories(req.auth.branchId)
        await Expense.updateMany({ branchId: req.auth.branchId, category: category.name }, { category: 'Other' })
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

        const expenses = await Expense.find(match).sort({ date: -1 }).populate('teacherId', 'name').populate('createdBy', 'name')

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
            .populate('teacherId', 'name').populate('createdBy', 'name')
        if (!expense) return res.status(404).json({ error: 'not_found' })
        res.json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createExpense = async (req, res) => {
    try {
        const { name, category, amount, date, recipient, method } = req.body
        if (!amount) return res.status(400).json({ error: 'amount_required' })
        if (method && !EXPENSE_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const expense = await Expense.create({
            branchId: req.auth.branchId, name: name || '', category: category || 'Other',
            amount, date: date ? new Date(date) : new Date(), recipient: recipient || '',
            method: method || 'cash', createdBy: req.auth.userId,
        })
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

        const patch = {}
        if (name !== undefined) patch.name = name
        if (category !== undefined) patch.category = category
        if (amount !== undefined) patch.amount = amount
        if (date !== undefined) patch.date = new Date(date)
        if (recipient !== undefined) patch.recipient = recipient
        if (method !== undefined) patch.method = method

        const expense = await Expense.findOneAndUpdate({ _id: req.params.id, branchId: req.auth.branchId }, patch, { new: true })
        if (!expense) return res.status(404).json({ error: 'not_found' })
        res.json({ expense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteExpense = async (req, res) => {
    try {
        await Expense.findOneAndDelete({ _id: req.params.id, branchId: req.auth.branchId })
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
