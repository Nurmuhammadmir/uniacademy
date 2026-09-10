// LasummaShanti's Sales department - client categories, clients, products (with their stock), and
// the actual sales ledger. Mirrors shantiPurchasesController.js's shape; a sale's items[] each
// decrement their product's stock (symmetric to a purchase incrementing its material's stock).
import mongoose from "mongoose"
import ShantiClientCategory from "../models/ShantiClientCategory.js"
import ShantiClient from "../models/ShantiClient.js"
import ShantiProduct from "../models/ShantiProduct.js"
import ShantiSale from "../models/ShantiSale.js"
import { SHANTI_METHODS } from "../models/shantiConstants.js"
import { ensureOtherClientCategoryExists, OTHER_CLIENT_CATEGORY } from "../services/shantiCatalog.service.js"
import { getClientDebtMap } from "../services/shantiDebt.service.js"
import { validateMethodBreakdown, normalizeMethodBreakdown } from "../services/shantiMethodBreakdown.service.js"

// ==== Client categories ====

export const listClientCategories = async (req, res) => {
    try {
        await ensureOtherClientCategoryExists()
        const categories = await ShantiClientCategory.find({}).sort({ name: 1 }).lean()
        res.json({ categories })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createClientCategory = async (req, res) => {
    try {
        const { name, color } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const category = await ShantiClientCategory.create({ name: name.trim(), color: color || '#7A7266' })
        res.status(201).json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateClientCategory = async (req, res) => {
    try {
        const { name, color } = req.body
        const category = await ShantiClientCategory.findById(req.params.id)
        if (!category) return res.status(404).json({ error: 'not_found' })
        const oldName = category.name
        if (name !== undefined && name.trim()) category.name = name.trim()
        if (color !== undefined) category.color = color
        await category.save()
        if (category.name !== oldName) {
            await ShantiClient.updateMany({ category: oldName }, { category: category.name })
        }
        res.json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteClientCategory = async (req, res) => {
    try {
        const category = await ShantiClientCategory.findById(req.params.id)
        if (!category) return res.status(404).json({ error: 'not_found' })
        if (category.name === OTHER_CLIENT_CATEGORY) return res.status(400).json({ error: 'cannot_delete_other' })
        await ensureOtherClientCategoryExists()
        await ShantiClient.updateMany({ category: category.name }, { category: OTHER_CLIENT_CATEGORY })
        await category.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Clients ====

export const listClients = async (req, res) => {
    try {
        const { category, search } = req.query
        const match = {}
        if (category) match.category = category
        if (search) match.$or = [{ name: new RegExp(search.trim(), 'i') }, { phone: new RegExp(search.trim(), 'i') }]
        const clients = await ShantiClient.find(match).sort({ name: 1 }).lean()
        res.json({ clients })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createClient = async (req, res) => {
    try {
        const { name, phone, category, comment } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const client = await ShantiClient.create({ name: name.trim(), phone: phone || '', category: category || OTHER_CLIENT_CATEGORY, comment: comment || '' })
        res.status(201).json({ client })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateClient = async (req, res) => {
    try {
        const { name, phone, category, comment } = req.body
        const client = await ShantiClient.findById(req.params.id)
        if (!client) return res.status(404).json({ error: 'not_found' })
        if (name !== undefined && name.trim()) client.name = name.trim()
        if (phone !== undefined) client.phone = phone
        if (category !== undefined) client.category = category
        if (comment !== undefined) client.comment = comment
        await client.save()
        res.json({ client })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteClient = async (req, res) => {
    try {
        const client = await ShantiClient.findById(req.params.id)
        if (!client) return res.status(404).json({ error: 'not_found' })
        const inUse = await ShantiSale.countDocuments({ clientId: client._id })
        if (inUse > 0) return res.status(409).json({ error: 'client_in_use' })
        await client.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Products ====

export const listProducts = async (req, res) => {
    try {
        const { search } = req.query
        const match = {}
        if (search) match.name = new RegExp(search.trim(), 'i')
        const products = await ShantiProduct.find(match).sort({ name: 1 }).lean()
        res.json({ products })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createProduct = async (req, res) => {
    try {
        const { name, unit, price, stock } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        if (!unit?.trim()) return res.status(400).json({ error: 'unit_required' })
        const product = await ShantiProduct.create({ name: name.trim(), unit: unit.trim(), price: price || 0, stock: stock || 0 })
        res.status(201).json({ product })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'product_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateProduct = async (req, res) => {
    try {
        const { name, unit, price, stock } = req.body
        const product = await ShantiProduct.findById(req.params.id)
        if (!product) return res.status(404).json({ error: 'not_found' })
        if (name !== undefined && name.trim()) product.name = name.trim()
        if (unit !== undefined && unit.trim()) product.unit = unit.trim()
        if (price !== undefined) product.price = price
        if (stock !== undefined) product.stock = stock
        await product.save()
        res.json({ product })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'product_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const restockProduct = async (req, res) => {
    try {
        const { quantity } = req.body
        const resolvedQuantity = Number(quantity)
        if (!(resolvedQuantity > 0)) return res.status(400).json({ error: 'invalid_quantity' })
        const product = await ShantiProduct.findByIdAndUpdate(
            req.params.id, { $inc: { stock: resolvedQuantity } }, { new: true }
        )
        if (!product) return res.status(404).json({ error: 'not_found' })
        res.json({ product })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const product = await ShantiProduct.findById(req.params.id)
        if (!product) return res.status(404).json({ error: 'not_found' })
        const inUse = await ShantiSale.countDocuments({ 'items.productId': product._id })
        if (inUse > 0) return res.status(409).json({ error: 'product_in_use' })
        await product.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Sales ====

const buildSaleMatch = async ({ dateFrom, dateTo, category, clientId, productId, amountMin, amountMax, search }) => {
    const match = {}
    if (dateFrom || dateTo) {
        match.date = {}
        if (dateFrom) match.date.$gte = new Date(dateFrom + 'T00:00:00.000Z')
        if (dateTo) match.date.$lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    if (clientId) match.clientId = new mongoose.Types.ObjectId(clientId)
    else if (category) {
        const clientIds = await ShantiClient.find({ category }).select('_id').lean()
        match.clientId = { $in: clientIds.map(c => c._id) }
    }
    if (productId) match['items.productId'] = new mongoose.Types.ObjectId(productId)
    if (amountMin || amountMax) {
        match.amount = {}
        if (amountMin) match.amount.$gte = Number(amountMin)
        if (amountMax) match.amount.$lte = Number(amountMax)
    }
    if (search) match.comment = new RegExp(search.trim(), 'i')
    return match
}

export const getSalesOverview = async (req, res) => {
    try {
        const match = await buildSaleMatch(req.query)
        const sales = await ShantiSale.find(match).sort({ date: -1 }).populate('clientId', 'name category').populate('items.productId', 'name unit').populate('createdBy', 'name').lean()
        const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0)
        res.json({ sales, totalAmount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getSalesDebtors = async (req, res) => {
    try {
        const debtMap = await getClientDebtMap()
        const ids = [...debtMap.entries()].filter(([, v]) => v.debt > 0.0001).map(([id]) => id)
        const clients = await ShantiClient.find({ _id: { $in: ids } }).select('name phone category').lean()
        const debtors = clients
            .map(c => ({ clientId: c._id, name: c.name, phone: c.phone, category: c.category, ...debtMap.get(String(c._id)) }))
            .map(d => ({ ...d, totalDebt: d.debt }))
            .sort((a, b) => b.totalDebt - a.totalDebt)
        res.json({ debtors })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getSaleDetail = async (req, res) => {
    try {
        const sale = await ShantiSale.findById(req.params.id).populate('clientId', 'name category phone').populate('items.productId', 'name unit').populate('createdBy', 'name').lean()
        if (!sale) return res.status(404).json({ error: 'not_found' })
        res.json({ sale })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

const validateItems = async (items) => {
    if (!Array.isArray(items) || items.length === 0) return 'items_required'
    for (const item of items) {
        if (!item.productId || !(item.quantity > 0) || !(item.price >= 0)) return 'invalid_item'
        const product = await ShantiProduct.findById(item.productId)
        if (!product) return 'product_not_found'
    }
    return null
}

const applyStockDelta = async (items, sign) => {
    for (const item of items) {
        await ShantiProduct.updateOne({ _id: item.productId }, { $inc: { stock: sign * item.quantity } })
    }
}

export const createSale = async (req, res) => {
    try {
        const { clientId, date, items, amount, paidAmount, method, methodBreakdown, comment } = req.body
        if (!clientId) return res.status(400).json({ error: 'client_required' })
        const client = await ShantiClient.findById(clientId)
        if (!client) return res.status(404).json({ error: 'client_not_found' })
        const itemsError = await validateItems(items)
        if (itemsError) return res.status(400).json({ error: itemsError })
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        const computedTotal = items.reduce((sum, i) => sum + i.quantity * i.price, 0)
        const resolvedAmount = amount !== undefined ? Number(amount) : computedTotal
        if (!(resolvedAmount >= 0)) return res.status(400).json({ error: 'invalid_amount' })
        const resolvedPaid = paidAmount !== undefined ? Number(paidAmount) : resolvedAmount
        if (resolvedPaid < 0 || resolvedPaid > resolvedAmount) return res.status(400).json({ error: 'invalid_paid_amount' })
        const breakdownError = validateMethodBreakdown(methodBreakdown, resolvedPaid)
        if (breakdownError) return res.status(400).json({ error: breakdownError })
        const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)

        const sale = await ShantiSale.create({
            clientId, date: date ? new Date(date) : new Date(),
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
            amount: resolvedAmount, paidAmount: resolvedPaid,
            method: normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || 'cash'),
            methodBreakdown: normalizedBreakdown, comment: comment || '',
            createdBy: req.auth.userId,
        })
        await applyStockDelta(sale.items, -1)
        res.status(201).json({ sale })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateSale = async (req, res) => {
    try {
        const sale = await ShantiSale.findById(req.params.id)
        if (!sale) return res.status(404).json({ error: 'not_found' })
        const { clientId, date, items, amount, paidAmount, method, methodBreakdown, comment } = req.body
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        let newItems = sale.items
        if (items !== undefined) {
            const itemsError = await validateItems(items)
            if (itemsError) return res.status(400).json({ error: itemsError })
            newItems = items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price }))
        }

        const computedTotal = newItems.reduce((sum, i) => sum + i.quantity * i.price, 0)
        const newAmount = amount !== undefined ? Number(amount) : (items !== undefined ? computedTotal : sale.amount)
        if (!(newAmount >= 0)) return res.status(400).json({ error: 'invalid_amount' })
        const newPaid = paidAmount !== undefined ? Number(paidAmount) : Math.min(sale.paidAmount, newAmount)
        if (newPaid < 0 || newPaid > newAmount) return res.status(400).json({ error: 'invalid_paid_amount' })
        if (methodBreakdown !== undefined) {
            const breakdownError = validateMethodBreakdown(methodBreakdown, newPaid)
            if (breakdownError) return res.status(400).json({ error: breakdownError })
        }

        // reverse the OLD items' stock effect, then apply the NEW ones - correct whether items
        // actually changed or not (a no-op reverse+reapply for unchanged items nets to zero)
        await applyStockDelta(sale.items, 1)
        await applyStockDelta(newItems, -1)

        if (clientId !== undefined) {
            const client = await ShantiClient.findById(clientId)
            if (!client) return res.status(404).json({ error: 'client_not_found' })
            sale.clientId = clientId
        }
        sale.items = newItems
        sale.amount = newAmount
        sale.paidAmount = newPaid
        if (date !== undefined) sale.date = new Date(date)
        if (methodBreakdown !== undefined) {
            const normalizedBreakdown = normalizeMethodBreakdown(methodBreakdown)
            sale.methodBreakdown = normalizedBreakdown
            sale.method = normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || sale.method)
        } else if (method !== undefined) {
            sale.method = method
        }
        if (comment !== undefined) sale.comment = comment
        await sale.save()
        res.json({ sale })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteSale = async (req, res) => {
    try {
        const sale = await ShantiSale.findById(req.params.id)
        if (!sale) return res.status(404).json({ error: 'not_found' })
        await applyStockDelta(sale.items, 1)
        await sale.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
