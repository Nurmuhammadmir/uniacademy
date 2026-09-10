// The "Финансы" panel - a plain log of debt-collection receipts against clients. See
// shantiDebt.service.js for how a payment's effect on a client's debt is computed on read.
import mongoose from "mongoose"
import ShantiClient from "../models/ShantiClient.js"
import ShantiPayment from "../models/ShantiPayment.js"
import { SHANTI_METHODS } from "../models/shantiConstants.js"
import { getClientDebt } from "../services/shantiDebt.service.js"
import { bucketConfig } from "../services/shantiChartBuckets.service.js"
import { validateMethodBreakdown, normalizeMethodBreakdown } from "../services/shantiMethodBreakdown.service.js"

const buildPaymentMatch = ({ dateFrom, dateTo, clientId, method, amountMin, amountMax, search }) => {
    const match = {}
    if (dateFrom || dateTo) {
        match.date = {}
        if (dateFrom) match.date.$gte = new Date(dateFrom + 'T00:00:00.000Z')
        if (dateTo) match.date.$lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    if (clientId) match.clientId = new mongoose.Types.ObjectId(clientId)
    if (method) match.method = method
    if (amountMin || amountMax) {
        match.amount = {}
        if (amountMin) match.amount.$gte = Number(amountMin)
        if (amountMax) match.amount.$lte = Number(amountMax)
    }
    if (search) match.comment = new RegExp(search.trim(), 'i')
    return match
}

export const getPaymentsOverview = async (req, res) => {
    try {
        const match = buildPaymentMatch(req.query)
        const payments = await ShantiPayment.find(match).sort({ date: -1 }).populate('clientId', 'name category').populate('createdBy', 'name').lean()
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
        res.json({ payments, totalAmount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createPayment = async (req, res) => {
    try {
        const { clientId, amount, method, methodBreakdown, date, comment } = req.body
        if (!clientId) return res.status(400).json({ error: 'client_required' })
        const client = await ShantiClient.findById(clientId)
        if (!client) return res.status(404).json({ error: 'client_not_found' })
        const resolvedAmount = Number(amount)
        if (!(resolvedAmount > 0)) return res.status(400).json({ error: 'invalid_amount' })
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })
        const breakdownError = validateMethodBreakdown(methodBreakdown, resolvedAmount)
        if (breakdownError) return res.status(400).json({ error: breakdownError })
        const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)

        const debt = await getClientDebt(clientId)
        if (resolvedAmount > debt + 0.0001) return res.status(400).json({ error: 'amount_exceeds_debt' })

        const payment = await ShantiPayment.create({
            clientId, amount: resolvedAmount,
            method: normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || 'cash'),
            methodBreakdown: normalizedBreakdown,
            date: date ? new Date(date) : new Date(), comment: comment || '',
            createdBy: req.auth.userId,
        })
        const populated = await payment.populate('clientId', 'name category')
        res.status(201).json({ payment: populated })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updatePayment = async (req, res) => {
    try {
        const payment = await ShantiPayment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })
        const { amount, method, methodBreakdown, date, comment } = req.body
        if (method !== undefined && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        if (amount !== undefined) {
            const resolvedAmount = Number(amount)
            if (!(resolvedAmount > 0)) return res.status(400).json({ error: 'invalid_amount' })
            const debtIncludingThisPayment = (await getClientDebt(payment.clientId)) + payment.amount
            if (resolvedAmount > debtIncludingThisPayment + 0.0001) return res.status(400).json({ error: 'amount_exceeds_debt' })
            payment.amount = resolvedAmount
        }
        if (methodBreakdown !== undefined) {
            const breakdownError = validateMethodBreakdown(methodBreakdown, payment.amount)
            if (breakdownError) return res.status(400).json({ error: breakdownError })
            const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)
            payment.methodBreakdown = normalizedBreakdown
            payment.method = normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || payment.method)
        } else if (method !== undefined) {
            payment.method = method
        }
        if (date !== undefined) payment.date = new Date(date)
        if (comment !== undefined) payment.comment = comment
        await payment.save()
        const populated = await payment.populate('clientId', 'name category')
        res.json({ payment: populated })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getPaymentsChart = async (req, res) => {
    try {
        const period = ['week', 'month', 'year'].includes(req.query.period) ? req.query.period : 'month'
        const { start, end, keys, keyFn } = bucketConfig(period)
        const payments = await ShantiPayment.find({ date: { $gte: start, $lt: end } }).select('date amount').lean()
        const map = Object.fromEntries(keys.map(k => [k, 0]))
        for (const p of payments) { const k = keyFn(new Date(p.date)); if (k in map) map[k] += p.amount }
        const series = keys.map(k => ({ label: k, value: map[k] }))
        res.json({ period, series, total: series.reduce((s, r) => s + r.value, 0) })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deletePayment = async (req, res) => {
    try {
        const payment = await ShantiPayment.findById(req.params.id)
        if (!payment) return res.status(404).json({ error: 'not_found' })
        await payment.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
