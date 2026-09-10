// The "Settings" panel - manual, one-off corrections that reconcile Shanti's records against a
// real business that already existed before it started using this platform: topping up a payment
// method's balance (ShantiBalanceAdjustment) and restocking an existing material's on-hand quantity
// (a plain stock increment - no financial trail, since it isn't a purchase, just a count correction).
import ShantiBalanceAdjustment from "../models/ShantiBalanceAdjustment.js"
import ShantiMaterial from "../models/ShantiMaterial.js"
import { SHANTI_METHODS } from "../models/shantiConstants.js"
import { validateMethodBreakdown, normalizeMethodBreakdown } from "../services/shantiMethodBreakdown.service.js"

const buildAdjustmentMatch = ({ dateFrom, dateTo, method }) => {
    const match = {}
    if (dateFrom || dateTo) {
        match.date = {}
        if (dateFrom) match.date.$gte = new Date(dateFrom + 'T00:00:00.000Z')
        if (dateTo) match.date.$lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    if (method) match.method = method
    return match
}

export const getBalanceAdjustments = async (req, res) => {
    try {
        const match = buildAdjustmentMatch(req.query)
        const adjustments = await ShantiBalanceAdjustment.find(match).sort({ date: -1 }).populate('createdBy', 'name').lean()
        res.json({ adjustments })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createBalanceAdjustment = async (req, res) => {
    try {
        const { amount, method, methodBreakdown, date, comment } = req.body
        const resolvedAmount = Number(amount)
        if (!(resolvedAmount > 0)) return res.status(400).json({ error: 'invalid_amount' })
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })
        const breakdownError = validateMethodBreakdown(methodBreakdown, resolvedAmount)
        if (breakdownError) return res.status(400).json({ error: breakdownError })
        const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)
        const adjustment = await ShantiBalanceAdjustment.create({
            amount: resolvedAmount,
            method: normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || 'cash'),
            methodBreakdown: normalizedBreakdown,
            date: date ? new Date(date) : new Date(), comment: comment || '',
            createdBy: req.auth.userId,
        })
        res.status(201).json({ adjustment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateBalanceAdjustment = async (req, res) => {
    try {
        const adjustment = await ShantiBalanceAdjustment.findById(req.params.id)
        if (!adjustment) return res.status(404).json({ error: 'not_found' })
        const { amount, method, methodBreakdown, date, comment } = req.body
        if (method !== undefined && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })
        if (amount !== undefined) {
            const resolvedAmount = Number(amount)
            if (!(resolvedAmount > 0)) return res.status(400).json({ error: 'invalid_amount' })
            adjustment.amount = resolvedAmount
        }
        if (methodBreakdown !== undefined) {
            const breakdownError = validateMethodBreakdown(methodBreakdown, adjustment.amount)
            if (breakdownError) return res.status(400).json({ error: breakdownError })
            const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)
            adjustment.methodBreakdown = normalizedBreakdown
            adjustment.method = normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || adjustment.method)
        } else if (method !== undefined) {
            adjustment.method = method
        }
        if (date !== undefined) adjustment.date = new Date(date)
        if (comment !== undefined) adjustment.comment = comment
        await adjustment.save()
        res.json({ adjustment })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteBalanceAdjustment = async (req, res) => {
    try {
        const adjustment = await ShantiBalanceAdjustment.findById(req.params.id)
        if (!adjustment) return res.status(404).json({ error: 'not_found' })
        await adjustment.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const restockMaterial = async (req, res) => {
    try {
        const { quantity } = req.body
        const resolvedQuantity = Number(quantity)
        if (!(resolvedQuantity > 0)) return res.status(400).json({ error: 'invalid_quantity' })
        const material = await ShantiMaterial.findByIdAndUpdate(
            req.params.id, { $inc: { stock: resolvedQuantity } }, { new: true }
        )
        if (!material) return res.status(404).json({ error: 'not_found' })
        res.json({ material })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
