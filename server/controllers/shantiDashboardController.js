// Powers the Dashboard home page - a summary panel (debtors/seller-debts/this-month figures) plus
// an income-vs-expense series bucketed by week/month/year. "Income" is real cash in: a sale's
// paidAmount plus any debt-collection payments (see shantiDebt.service.js); "expense" is a
// purchase's paidAmount plus general company expenses (ShantiExpense, which also covers paying
// down supplier debt - see shantiSellerDebt.service.js). Everything is computed on read from the
// raw collections - there is no separate ledger to keep in sync.
import ShantiSale from "../models/ShantiSale.js"
import ShantiPurchase from "../models/ShantiPurchase.js"
import ShantiPayment from "../models/ShantiPayment.js"
import ShantiExpense from "../models/ShantiExpense.js"
import { getClientDebtMap } from "../services/shantiDebt.service.js"
import { getSellerDebtMap } from "../services/shantiSellerDebt.service.js"
import { bucketConfig } from "../services/shantiChartBuckets.service.js"

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)

export const getDashboardSummary = async (req, res) => {
    try {
        const now = new Date()
        const monthStart = startOfMonth(now)
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        const [debtMap, sellerDebtMap, monthSales, monthPurchases, monthExpenses] = await Promise.all([
            getClientDebtMap(),
            getSellerDebtMap(),
            ShantiSale.find({ date: { $gte: monthStart, $lt: nextMonthStart } }).select('date amount items').lean(),
            ShantiPurchase.find({ date: { $gte: monthStart, $lt: nextMonthStart } }).select('date amount').lean(),
            ShantiExpense.find({ date: { $gte: monthStart, $lt: nextMonthStart } }).select('date amount').lean(),
        ])

        const debtors = [...debtMap.values()].filter(v => v.debt > 0.0001)
        const debtorsTotal = debtors.reduce((s, v) => s + v.debt, 0)
        const sellerDebts = [...sellerDebtMap.values()].filter(v => v.debt > 0.0001)
        const sellerDebtTotal = sellerDebts.reduce((s, v) => s + v.debt, 0)

        const soldQuantity = monthSales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0)
        const salesSum = monthSales.reduce((s, sale) => s + sale.amount, 0)
        const purchasesSum = monthPurchases.reduce((s, p) => s + p.amount, 0)
        const expensesSum = monthExpenses.reduce((s, e) => s + e.amount, 0)

        res.json({
            debtors: { count: debtors.length, total: debtorsTotal },
            sellerDebts: { count: sellerDebts.length, total: sellerDebtTotal },
            thisMonth: {
                soldQuantity, salesCount: monthSales.length, salesSum,
                purchasesCount: monthPurchases.length, purchasesSum,
                expenseSum: purchasesSum + expensesSum,
            },
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getDashboardSeries = async (req, res) => {
    try {
        const period = ['week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month'
        const { start, end, keys, keyFn } = bucketConfig(period)

        const [sales, payments, purchases, expenses] = await Promise.all([
            ShantiSale.find({ date: { $gte: start, $lt: end } }).select('date paidAmount').lean(),
            ShantiPayment.find({ date: { $gte: start, $lt: end } }).select('date amount').lean(),
            ShantiPurchase.find({ date: { $gte: start, $lt: end } }).select('date paidAmount').lean(),
            ShantiExpense.find({ date: { $gte: start, $lt: end } }).select('date amount').lean(),
        ])

        const incomeMap = Object.fromEntries(keys.map(k => [k, 0]))
        const expenseMap = Object.fromEntries(keys.map(k => [k, 0]))
        for (const s of sales) { const k = keyFn(new Date(s.date)); if (k in incomeMap) incomeMap[k] += s.paidAmount }
        for (const p of payments) { const k = keyFn(new Date(p.date)); if (k in incomeMap) incomeMap[k] += p.amount }
        for (const p of purchases) { const k = keyFn(new Date(p.date)); if (k in expenseMap) expenseMap[k] += p.paidAmount }
        for (const e of expenses) { const k = keyFn(new Date(e.date)); if (k in expenseMap) expenseMap[k] += e.amount }

        const income = keys.map(k => ({ label: k, value: incomeMap[k] }))
        const expense = keys.map(k => ({ label: k, value: expenseMap[k] }))
        const totalIncome = income.reduce((s, r) => s + r.value, 0)
        const totalExpense = expense.reduce((s, r) => s + r.value, 0)

        res.json({ period, income, expense, totalIncome, totalExpense, netProfit: totalIncome - totalExpense })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
