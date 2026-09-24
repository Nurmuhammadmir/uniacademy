// LasummaShanti's Sales department - client categories, clients, products (with their stock), and
// the actual sales ledger. Mirrors shantiPurchasesController.js's shape; a sale's items[] each
// decrement their product's stock (symmetric to a purchase incrementing its material's stock).
import mongoose from "mongoose"
import ShantiClientCategory from "../models/ShantiClientCategory.js"
import ShantiClient from "../models/ShantiClient.js"
import ShantiProduct from "../models/ShantiProduct.js"
import ShantiMaterial from "../models/ShantiMaterial.js"
import ShantiSale from "../models/ShantiSale.js"
import { SHANTI_METHODS } from "../models/shantiConstants.js"
import { ensureOtherClientCategoryExists, OTHER_CLIENT_CATEGORY } from "../services/shantiCatalog.service.js"
import { getClientDebtMap } from "../services/shantiDebt.service.js"
import { validateMethodBreakdown, normalizeMethodBreakdown } from "../services/shantiMethodBreakdown.service.js"
import { resolveBonusItems, syncBonusExpense, removeBonusExpense } from "../services/shantiBonus.service.js"
import { deleteProductPhotoFile } from "./shantiUploadController.js"

// validates a product's recipe - each row needs a real ShantiMaterial and a positive quantity (how
// much of it one unit of the product consumes). Returns the cleaned array (materialId/quantity
// only, dropping anything else the client sent) so a bad/extra field never sneaks into storage.
const resolveMaterialsUsed = async (materialsUsed) => {
    if (materialsUsed === undefined) return undefined
    if (!Array.isArray(materialsUsed)) return null
    const cleaned = []
    for (const row of materialsUsed) {
        if (!row?.materialId || !(row.quantity > 0)) return null
        const material = await ShantiMaterial.findById(row.materialId).select('_id').lean()
        if (!material) return null
        cleaned.push({ materialId: row.materialId, quantity: Number(row.quantity) })
    }
    return cleaned
}

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

// producing `quantity` units of a product consumes its recipe from the material warehouse - the
// ONLY place a sale/product touches the material warehouse at all (see applyStockDelta below,
// which deliberately does not). A negative quantity (a downward stock correction) symmetrically
// gives materials back. Always applied against the recipe as it stands AFTER whatever save just
// happened, never a stale snapshot.
const applyMaterialsForProductionDelta = async (materialsUsed, quantity) => {
    if (!quantity) return
    for (const usage of materialsUsed || []) {
        await ShantiMaterial.updateOne({ _id: usage.materialId }, { $inc: { stock: -quantity * usage.quantity } })
    }
}

export const createProduct = async (req, res) => {
    try {
        const { name, unit, price, stock, materialsUsed } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        if (!unit?.trim()) return res.status(400).json({ error: 'unit_required' })
        const cleanedMaterials = await resolveMaterialsUsed(materialsUsed)
        if (cleanedMaterials === null) return res.status(400).json({ error: 'invalid_materials_used' })
        const resolvedStock = stock || 0
        const resolvedMaterials = cleanedMaterials || []
        const product = await ShantiProduct.create({
            name: name.trim(), unit: unit.trim(), price: price || 0, stock: resolvedStock,
            materialsUsed: resolvedMaterials,
        })
        await applyMaterialsForProductionDelta(resolvedMaterials, resolvedStock)
        res.status(201).json({ product })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'product_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// no `stock` field accepted here - stock only ever moves through sales, restocks, or production
// (see restockProduct below and applyStockDelta), never a direct overwrite, by design (same
// reasoning as updateMaterial in shantiPurchasesController.js).
export const updateProduct = async (req, res) => {
    try {
        const { name, unit, price, materialsUsed } = req.body
        const product = await ShantiProduct.findById(req.params.id)
        if (!product) return res.status(404).json({ error: 'not_found' })
        const cleanedMaterials = await resolveMaterialsUsed(materialsUsed)
        if (cleanedMaterials === null) return res.status(400).json({ error: 'invalid_materials_used' })
        if (name !== undefined && name.trim()) product.name = name.trim()
        if (unit !== undefined && unit.trim()) product.unit = unit.trim()
        if (price !== undefined) product.price = price
        if (cleanedMaterials !== undefined) product.materialsUsed = cleanedMaterials
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
        await applyMaterialsForProductionDelta(product.materialsUsed, resolvedQuantity)
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
        const inUse = await ShantiSale.countDocuments({ $or: [{ 'items.productId': product._id }, { 'bonusItems.productId': product._id }] })
        if (inUse > 0) return res.status(409).json({ error: 'product_in_use' })
        deleteProductPhotoFile(product._id) // never leave an orphaned photo file behind on disk
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
        const { productId } = req.query
        const match = await buildSaleMatch(req.query)
        const sales = await ShantiSale.find(match).sort({ date: -1 }).populate('clientId', 'name category').populate('items.productId', 'name unit').populate('bonusItems.productId', 'name unit').populate('createdBy', 'name').lean()
        const totalAmount = sales.reduce((sum, s) => sum + s.amount, 0)
        // grouped by unit, not a single number - a sale can carry several products with different
        // units, and buildSaleMatch's productId filter only narrows WHICH sales come back (a sale
        // with a matching item still brings its other items along), so quantity itself is summed
        // here, per unit, counting only items that match productId when that filter is set
        const quantityByUnit = {}
        for (const s of sales) {
            for (const item of s.items) {
                if (productId && String(item.productId?._id) !== String(productId)) continue
                const unit = item.productId?.unit || ''
                quantityByUnit[unit] = (quantityByUnit[unit] || 0) + item.quantity
            }
        }
        const totalQuantity = Object.entries(quantityByUnit).map(([unit, quantity]) => ({ unit, quantity }))
        res.json({ sales, totalAmount, totalQuantity })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getSalesDebtors = async (req, res) => {
    try {
        const { clientId, category } = req.query
        const debtMap = await getClientDebtMap()
        const ids = [...debtMap.entries()].filter(([, v]) => v.debt > 0.0001).map(([id]) => id)
        const match = { _id: { $in: ids } }
        if (clientId) match._id = new mongoose.Types.ObjectId(clientId)
        if (category) match.category = category
        const clients = await ShantiClient.find(match).select('name phone category').lean()
        const debtors = clients
            .map(c => ({ clientId: c._id, name: c.name, phone: c.phone, category: c.category, ...debtMap.get(String(c._id)) }))
            .map(d => ({ ...d, totalDebt: d.debt }))
            .sort((a, b) => b.totalDebt - a.totalDebt)

        // quantity behind these debtors' unpaid sales, grouped by unit - the debt map above nets
        // against payments (not tracked per item), so this sums every item on every still-unpaid
        // sale (amount > paidAmount) belonging to one of the listed debtor clients, same "debt"
        // definition PurchaseDebts already uses for purchases
        const debtorIds = debtors.map(d => d.clientId)
        // 0.0001 tolerance, not a strict $gt, so a fully-paid sale with sub-cent float residue
        // doesn't get counted here either (same reasoning as PurchaseDebts' own $expr filter)
        const unpaidSales = await ShantiSale.find({ clientId: { $in: debtorIds }, $expr: { $gt: [{ $subtract: ['$amount', '$paidAmount'] }, 0.0001] } })
            .populate('items.productId', 'unit').lean()
        const quantityByUnit = {}
        for (const s of unpaidSales) {
            for (const item of s.items) {
                const unit = item.productId?.unit || ''
                quantityByUnit[unit] = (quantityByUnit[unit] || 0) + item.quantity
            }
        }
        const totalQuantity = Object.entries(quantityByUnit).map(([unit, quantity]) => ({ unit, quantity }))

        res.json({ debtors, totalQuantity })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// every bonus line ever given, flattened one row per (sale, product), plus who-got-what rollups.
// A bonus only exists inside a sale, so this reads sales that carry bonusItems; `cost` is what the
// line cost us (quantity x the price snapshotted when it was saved), not revenue.
export const getBonusesOverview = async (req, res) => {
    try {
        const { productId, ...filters } = req.query
        const match = await buildSaleMatch({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, category: filters.category, clientId: filters.clientId })
        match['bonusItems.0'] = { $exists: true }
        if (productId) match['bonusItems.productId'] = new mongoose.Types.ObjectId(productId)
        const sales = await ShantiSale.find(match).sort({ date: -1 })
            .populate('clientId', 'name category').populate('bonusItems.productId', 'name unit').lean()

        const rows = []
        for (const s of sales) {
            for (const item of s.bonusItems) {
                if (productId && String(item.productId?._id) !== String(productId)) continue
                rows.push({
                    saleId: s._id, date: s.date,
                    clientId: s.clientId?._id, clientName: s.clientId?.name || '—', category: s.clientId?.category || '',
                    productId: item.productId?._id, productName: item.productId?.name || '—', unit: item.productId?.unit || '',
                    quantity: item.quantity, price: item.price, cost: item.quantity * item.price,
                })
            }
        }

        const byUnit = (list) => Object.entries(list.reduce((acc, r) => { acc[r.unit] = (acc[r.unit] || 0) + r.quantity; return acc }, {}))
            .map(([unit, quantity]) => ({ unit, quantity }))
        const groupBy = (keyOf, make) => {
            const groups = new Map()
            for (const r of rows) {
                const key = String(keyOf(r))
                if (!groups.has(key)) groups.set(key, [])
                groups.get(key).push(r)
            }
            return [...groups.values()]
                .map(list => ({ ...make(list[0]), saleCount: new Set(list.map(r => String(r.saleId))).size, quantity: byUnit(list), totalCost: list.reduce((s, r) => s + r.cost, 0) }))
                .sort((a, b) => b.totalCost - a.totalCost)
        }

        res.json({
            rows,
            totalCost: rows.reduce((sum, r) => sum + r.cost, 0),
            totalQuantity: byUnit(rows),
            byClient: groupBy(r => r.clientId, r => ({ clientId: r.clientId, name: r.clientName, category: r.category })),
            byProduct: groupBy(r => r.productId, r => ({ productId: r.productId, name: r.productName, unit: r.unit })),
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getSaleDetail = async (req, res) => {
    try {
        const sale = await ShantiSale.findById(req.params.id).populate('clientId', 'name category phone').populate('items.productId', 'name unit').populate('bonusItems.productId', 'name unit').populate('createdBy', 'name').lean()
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

// selling (sign -1) decrements the product's OWN stock; reversing a sale (sign +1, from an edit or
// delete) gives it back. Deliberately does NOT touch materialsUsed/the material warehouse - a
// recipe's materials are consumed once, at production time (restockProduct, "Mahsulotni
// to'ldirish" - see applyMaterialsForProductionDelta below), the same way a factory draws raw
// materials down when it manufactures a batch, not again every time a already-produced unit is
// later sold off the shelf. Sales only ever move finished-goods stock. Callers pass a sale's
// bonusItems along with its items - free goods leave the shelf just the same.
const applyStockDelta = async (items, sign) => {
    for (const item of items) {
        await ShantiProduct.updateOne({ _id: item.productId }, { $inc: { stock: sign * item.quantity } })
    }
}

export const createSale = async (req, res) => {
    try {
        const { clientId, date, items, bonusItems, amount, paidAmount, method, methodBreakdown, comment } = req.body
        if (!clientId) return res.status(400).json({ error: 'client_required' })
        const client = await ShantiClient.findById(clientId)
        if (!client) return res.status(404).json({ error: 'client_not_found' })
        const itemsError = await validateItems(items)
        if (itemsError) return res.status(400).json({ error: itemsError })
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })
        const bonus = await resolveBonusItems(bonusItems || [], items)
        if (bonus.error) return res.status(400).json({ error: bonus.error })

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
            bonusItems: bonus.items,
            amount: resolvedAmount, paidAmount: resolvedPaid,
            method: normalizedBreakdown.length ? normalizedBreakdown[0].method : (method || 'cash'),
            methodBreakdown: normalizedBreakdown, comment: comment || '',
            createdBy: req.auth.userId,
        })
        await applyStockDelta([...sale.items, ...sale.bonusItems], -1)
        await syncBonusExpense(sale, client.name, req.auth.userId)
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
        const { clientId, date, items, bonusItems, amount, paidAmount, method, methodBreakdown, comment } = req.body
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })

        let newItems = sale.items
        if (items !== undefined) {
            const itemsError = await validateItems(items)
            if (itemsError) return res.status(400).json({ error: itemsError })
            newItems = items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price }))
        }
        // omitted = leave the bonus alone (e.g. a comment-only edit); an array, even an empty one,
        // replaces it - which is how an admin removes a bonus from an existing sale
        let newBonusItems = sale.bonusItems
        if (bonusItems !== undefined) {
            const bonus = await resolveBonusItems(bonusItems, newItems, sale.bonusItems)
            if (bonus.error) return res.status(400).json({ error: bonus.error })
            newBonusItems = bonus.items
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
        await applyStockDelta([...sale.items, ...sale.bonusItems], 1)
        await applyStockDelta([...newItems, ...newBonusItems], -1)

        if (clientId !== undefined) {
            const client = await ShantiClient.findById(clientId)
            if (!client) return res.status(404).json({ error: 'client_not_found' })
            sale.clientId = clientId
        }
        sale.items = newItems
        sale.bonusItems = newBonusItems
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
        const client = await ShantiClient.findById(sale.clientId).select('name').lean()
        await syncBonusExpense(sale, client?.name || '', req.auth.userId)
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
        await applyStockDelta([...sale.items, ...sale.bonusItems], 1)
        await removeBonusExpense(sale._id)
        await sale.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
