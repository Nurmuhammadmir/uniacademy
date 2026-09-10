// General company operating costs (fuel, utilities, rent, ...), categorized exactly like materials/
// clients. A "pay a supplier" action is just an expense with `sellerId` set - see
// shantiSellerDebt.service.js for how that then reduces the seller's outstanding purchase debt.
import mongoose from "mongoose"
import ShantiExpenseCategory from "../models/ShantiExpenseCategory.js"
import ShantiExpense from "../models/ShantiExpense.js"
import ShantiSeller from "../models/ShantiSeller.js"
import { SHANTI_METHODS } from "../models/shantiConstants.js"
import { ensureOtherExpenseCategoryExists, OTHER_EXPENSE_CATEGORY } from "../services/shantiCatalog.service.js"
import { getSellerDebt } from "../services/shantiSellerDebt.service.js"
import { validateMethodBreakdown, normalizeMethodBreakdown } from "../services/shantiMethodBreakdown.service.js"
import { bucketConfig } from "../services/shantiChartBuckets.service.js"

// ==== Expense categories ====

export const listExpenseCategories = async (req, res) => {
    try {
        await ensureOtherExpenseCategoryExists()
        const categories = await ShantiExpenseCategory.find({}).sort({ name: 1 }).lean()
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
        const category = await ShantiExpenseCategory.create({ name: name.trim(), color: color || '#7A7266' })
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
        const category = await ShantiExpenseCategory.findById(req.params.id)
        if (!category) return res.status(404).json({ error: 'not_found' })
        const oldName = category.name
        if (name !== undefined && name.trim()) category.name = name.trim()
        if (color !== undefined) category.color = color
        await category.save()
        if (category.name !== oldName) {
            await ShantiExpense.updateMany({ category: oldName }, { category: category.name })
        }
        res.json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteExpenseCategory = async (req, res) => {
    try {
        const category = await ShantiExpenseCategory.findById(req.params.id)
        if (!category) return res.status(404).json({ error: 'not_found' })
        if (category.name === OTHER_EXPENSE_CATEGORY) return res.status(400).json({ error: 'cannot_delete_other' })
        await ensureOtherExpenseCategoryExists()
        await ShantiExpense.updateMany({ category: category.name }, { category: OTHER_EXPENSE_CATEGORY })
        await category.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Expenses ====

const buildExpenseMatch = ({ dateFrom, dateTo, category, sellerId, amountMin, amountMax, search }) => {
    const match = {}
    if (dateFrom || dateTo) {
        match.date = {}
        if (dateFrom) match.date.$gte = new Date(dateFrom + 'T00:00:00.000Z')
        if (dateTo) match.date.$lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    if (category) match.category = category
    if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId)
    if (amountMin || amountMax) {
        match.amount = {}
        if (amountMin) match.amount.$gte = Number(amountMin)
        if (amountMax) match.amount.$lte = Number(amountMax)
    }
    if (search) match.comment = new RegExp(search.trim(), 'i')
    return match
}

export const getExpensesOverview = async (req, res) => {
    try {
        const match = buildExpenseMatch(req.query)
        const expenses = await ShantiExpense.find(match).sort({ date: -1 }).populate('sellerId', 'name phone').populate('createdBy', 'name').lean()
        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
        res.json({ expenses, totalAmount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getExpensesChart = async (req, res) => {
    try {
        const period = ['week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month'
        const { start, end, keys, keyFn } = bucketConfig(period)
        const expenses = await ShantiExpense.find({ date: { $gte: start, $lt: end } }).select('date amount').lean()
        const map = Object.fromEntries(keys.map(k => [k, 0]))
        for (const e of expenses) { const k = keyFn(new Date(e.date)); if (k in map) map[k] += e.amount }
        const series = keys.map(k => ({ label: k, value: map[k] }))
        res.json({ period, series, total: series.reduce((s, r) => s + r.value, 0) })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createExpense = async (req, res) => {
    try {
        const { category, amount, date, method, methodBreakdown, sellerId, comment } = req.body
        const resolvedAmount = Number(amount)
        if (!(resolvedAmount > 0)) return res.status(400).json({ error: 'invalid_amount' })
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })
        const breakdownError = validateMethodBreakdown(methodBreakdown, resolvedAmount)
        if (breakdownError) return res.status(400).json({ error: breakdownError })
        const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)

        if (sellerId) {
            const seller = await ShantiSeller.findById(sellerId)
            if (!seller) return res.status(404).json({ error: 'seller_not_found' })
            const debt = await getSellerDebt(sellerId)
            if (resolvedAmount > debt + 0.0001) return res.status(400).json({ error: 'amount_exceeds_debt' })
        }

        const expense = await ShantiExpense.create({
            category: category || OTHER_EXPENSE_CATEGORY, amount: resolvedAmount,
            date: date ? new Date(date) : new Date(),
            method: normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || 'cash'),
            methodBreakdown: normalizedBreakdown, sellerId: sellerId || null, comment: comment || '',
            createdBy: req.auth.userId,
        })
        const populated = await expense.populate('sellerId', 'name phone')
        res.status(201).json({ expense: populated })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateExpense = async (req, res) => {
    try {
        const expense = await ShantiExpense.findById(req.params.id)
        if (!expense) return res.status(404).json({ error: 'not_found' })
        const { category, amount, date, method, methodBreakdown, sellerId, comment } = req.body
        if (method !== undefined && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const effectiveSellerId = sellerId !== undefined ? sellerId : expense.sellerId
        if (amount !== undefined) {
            const resolvedAmount = Number(amount)
            if (!(resolvedAmount > 0)) return res.status(400).json({ error: 'invalid_amount' })
            if (effectiveSellerId) {
                const debtIncludingThisExpense = (await getSellerDebt(effectiveSellerId)) + (String(expense.sellerId) === String(effectiveSellerId) ? expense.amount : 0)
                if (resolvedAmount > debtIncludingThisExpense + 0.0001) return res.status(400).json({ error: 'amount_exceeds_debt' })
            }
            expense.amount = resolvedAmount
        }
        if (methodBreakdown !== undefined) {
            const breakdownError = validateMethodBreakdown(methodBreakdown, expense.amount)
            if (breakdownError) return res.status(400).json({ error: breakdownError })
            const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)
            expense.methodBreakdown = normalizedBreakdown
            expense.method = normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || expense.method)
        } else if (method !== undefined) {
            expense.method = method
        }
        if (category !== undefined) expense.category = category || OTHER_EXPENSE_CATEGORY
        if (date !== undefined) expense.date = new Date(date)
        if (sellerId !== undefined) {
            if (sellerId) {
                const seller = await ShantiSeller.findById(sellerId)
                if (!seller) return res.status(404).json({ error: 'seller_not_found' })
            }
            expense.sellerId = sellerId || null
        }
        if (comment !== undefined) expense.comment = comment
        await expense.save()
        const populated = await expense.populate('sellerId', 'name phone')
        res.json({ expense: populated })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteExpense = async (req, res) => {
    try {
        const expense = await ShantiExpense.findById(req.params.id)
        if (!expense) return res.status(404).json({ error: 'not_found' })
        await expense.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
