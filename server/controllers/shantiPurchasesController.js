// LasummaShanti's Purchases department - units, material categories, materials (with their stock),
// and the actual purchase ledger. Mirrors the school's expenseController.js in shape (manageable
// named lists + a filtered/paginated-free transaction list), but purchases carry their own
// amount/paidAmount directly (no shared double-entry ledger - see ShantiPurchase.js).
import mongoose from "mongoose"
import ShantiUnit from "../models/ShantiUnit.js"
import ShantiMaterialCategory from "../models/ShantiMaterialCategory.js"
import ShantiMaterial from "../models/ShantiMaterial.js"
import ShantiPurchase from "../models/ShantiPurchase.js"
import ShantiSeller from "../models/ShantiSeller.js"
import { SHANTI_METHODS } from "../models/shantiConstants.js"
import { ensureDefaultShantiUnits, ensureOtherMaterialCategoryExists, OTHER_MATERIAL_CATEGORY } from "../services/shantiCatalog.service.js"

// ==== Units ====

export const listUnits = async (req, res) => {
    try {
        await ensureDefaultShantiUnits()
        const units = await ShantiUnit.find({}).sort({ name: 1 }).lean()
        res.json({ units })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createUnit = async (req, res) => {
    try {
        const { name } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const unit = await ShantiUnit.create({ name: name.trim() })
        res.status(201).json({ unit })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'unit_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateUnit = async (req, res) => {
    try {
        const { name } = req.body
        const unit = await ShantiUnit.findById(req.params.id)
        if (!unit) return res.status(404).json({ error: 'not_found' })
        const oldName = unit.name
        if (name !== undefined && name.trim()) unit.name = name.trim()
        await unit.save()
        if (unit.name !== oldName) {
            await ShantiMaterial.updateMany({ unit: oldName }, { unit: unit.name })
        }
        res.json({ unit })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'unit_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteUnit = async (req, res) => {
    try {
        const unit = await ShantiUnit.findById(req.params.id)
        if (!unit) return res.status(404).json({ error: 'not_found' })
        const inUse = await ShantiMaterial.countDocuments({ unit: unit.name })
        if (inUse > 0) return res.status(409).json({ error: 'unit_in_use' })
        await unit.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Material categories ====

export const listMaterialCategories = async (req, res) => {
    try {
        await ensureOtherMaterialCategoryExists()
        const categories = await ShantiMaterialCategory.find({}).sort({ name: 1 }).lean()
        res.json({ categories })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createMaterialCategory = async (req, res) => {
    try {
        const { name, color } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const category = await ShantiMaterialCategory.create({ name: name.trim(), color: color || '#7A7266' })
        res.status(201).json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateMaterialCategory = async (req, res) => {
    try {
        const { name, color } = req.body
        const category = await ShantiMaterialCategory.findById(req.params.id)
        if (!category) return res.status(404).json({ error: 'not_found' })
        const oldName = category.name
        if (name !== undefined && name.trim()) category.name = name.trim()
        if (color !== undefined) category.color = color
        await category.save()
        if (category.name !== oldName) {
            await ShantiMaterial.updateMany({ category: oldName }, { category: category.name })
        }
        res.json({ category })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'category_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteMaterialCategory = async (req, res) => {
    try {
        const category = await ShantiMaterialCategory.findById(req.params.id)
        if (!category) return res.status(404).json({ error: 'not_found' })
        if (category.name === OTHER_MATERIAL_CATEGORY) return res.status(400).json({ error: 'cannot_delete_other' })
        await ensureOtherMaterialCategoryExists()
        await ShantiMaterial.updateMany({ category: category.name }, { category: OTHER_MATERIAL_CATEGORY })
        await category.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Materials ====

export const listMaterials = async (req, res) => {
    try {
        const { category, search } = req.query
        const match = {}
        if (category) match.category = category
        if (search) match.name = new RegExp(search.trim(), 'i')
        const materials = await ShantiMaterial.find(match).sort({ name: 1 }).lean()
        res.json({ materials })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createMaterial = async (req, res) => {
    try {
        const { name, category, unit } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        if (!unit?.trim()) return res.status(400).json({ error: 'unit_required' })
        const material = await ShantiMaterial.create({ name: name.trim(), category: category || OTHER_MATERIAL_CATEGORY, unit: unit.trim() })
        res.status(201).json({ material })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'material_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateMaterial = async (req, res) => {
    try {
        const { name, category, unit } = req.body
        const material = await ShantiMaterial.findById(req.params.id)
        if (!material) return res.status(404).json({ error: 'not_found' })
        if (name !== undefined && name.trim()) material.name = name.trim()
        if (category !== undefined) material.category = category
        if (unit !== undefined && unit.trim()) material.unit = unit.trim()
        await material.save()
        res.json({ material })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'material_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteMaterial = async (req, res) => {
    try {
        const material = await ShantiMaterial.findById(req.params.id)
        if (!material) return res.status(404).json({ error: 'not_found' })
        const inUse = await ShantiPurchase.countDocuments({ materialId: material._id })
        if (inUse > 0) return res.status(409).json({ error: 'material_in_use' })
        await material.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Sellers ====

export const listSellers = async (req, res) => {
    try {
        const sellers = await ShantiSeller.find({}).sort({ name: 1 }).lean()
        res.json({ sellers })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createSeller = async (req, res) => {
    try {
        const { name, phone, comment } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'name_required' })
        const seller = await ShantiSeller.create({ name: name.trim(), phone: phone || '', comment: comment || '' })
        res.status(201).json({ seller })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'seller_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updateSeller = async (req, res) => {
    try {
        const { name, phone, comment } = req.body
        const seller = await ShantiSeller.findById(req.params.id)
        if (!seller) return res.status(404).json({ error: 'not_found' })
        if (name !== undefined && name.trim()) seller.name = name.trim()
        if (phone !== undefined) seller.phone = phone
        if (comment !== undefined) seller.comment = comment
        await seller.save()
        res.json({ seller })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'seller_already_exists' })
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteSeller = async (req, res) => {
    try {
        const seller = await ShantiSeller.findById(req.params.id)
        if (!seller) return res.status(404).json({ error: 'not_found' })
        const inUse = await ShantiPurchase.countDocuments({ sellerId: seller._id })
        if (inUse > 0) return res.status(409).json({ error: 'seller_in_use' })
        await seller.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// ==== Purchases ====

const buildPurchaseMatch = async ({ dateFrom, dateTo, category, materialId, sellerId, amountMin, amountMax, search }) => {
    const match = {}
    if (dateFrom || dateTo) {
        match.date = {}
        if (dateFrom) match.date.$gte = new Date(dateFrom + 'T00:00:00.000Z')
        if (dateTo) match.date.$lte = new Date(dateTo + 'T23:59:59.999Z')
    }
    if (materialId) match.materialId = new mongoose.Types.ObjectId(materialId)
    else if (category) {
        const materialIds = await ShantiMaterial.find({ category }).select('_id').lean()
        match.materialId = { $in: materialIds.map(m => m._id) }
    }
    if (sellerId) match.sellerId = new mongoose.Types.ObjectId(sellerId)
    if (amountMin || amountMax) {
        match.amount = {}
        if (amountMin) match.amount.$gte = Number(amountMin)
        if (amountMax) match.amount.$lte = Number(amountMax)
    }
    if (search) match.comment = new RegExp(search.trim(), 'i')
    return match
}

export const getPurchasesOverview = async (req, res) => {
    try {
        const match = await buildPurchaseMatch(req.query)
        const purchases = await ShantiPurchase.find(match).sort({ date: -1 }).populate('materialId', 'name category unit').populate('sellerId', 'name phone').populate('createdBy', 'name').lean()
        const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0)
        res.json({ purchases, totalAmount })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getPurchaseDebts = async (req, res) => {
    try {
        const match = await buildPurchaseMatch(req.query)
        match.$expr = { $gt: [{ $subtract: ['$amount', '$paidAmount'] }, 0] }
        const purchases = await ShantiPurchase.find(match).sort({ date: -1 }).populate('materialId', 'name category unit').populate('sellerId', 'name phone').populate('createdBy', 'name').lean()
        const totalDebt = purchases.reduce((sum, p) => sum + (p.amount - p.paidAmount), 0)
        res.json({ purchases, totalDebt })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const getPurchaseDetail = async (req, res) => {
    try {
        const purchase = await ShantiPurchase.findById(req.params.id).populate('materialId', 'name category unit').populate('sellerId', 'name phone').populate('createdBy', 'name').lean()
        if (!purchase) return res.status(404).json({ error: 'not_found' })
        res.json({ purchase })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const createPurchase = async (req, res) => {
    try {
        const { materialId, quantity, date, amount, paidAmount, method, sellerId, comment } = req.body
        if (!materialId) return res.status(400).json({ error: 'material_required' })
        if (!(quantity > 0)) return res.status(400).json({ error: 'invalid_quantity' })
        if (!(amount > 0)) return res.status(400).json({ error: 'invalid_amount' })
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })
        const material = await ShantiMaterial.findById(materialId)
        if (!material) return res.status(404).json({ error: 'material_not_found' })
        if (sellerId) {
            const seller = await ShantiSeller.findById(sellerId)
            if (!seller) return res.status(404).json({ error: 'seller_not_found' })
        }

        const resolvedPaid = paidAmount !== undefined ? Number(paidAmount) : amount
        if (resolvedPaid < 0 || resolvedPaid > amount) return res.status(400).json({ error: 'invalid_paid_amount' })

        const purchase = await ShantiPurchase.create({
            materialId, quantity, date: date ? new Date(date) : new Date(), amount, paidAmount: resolvedPaid,
            method: method || 'cash', sellerId: sellerId || null, comment: comment || '', createdBy: req.auth.userId,
        })
        await ShantiMaterial.updateOne({ _id: materialId }, { $inc: { stock: quantity } })
        res.status(201).json({ purchase })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const updatePurchase = async (req, res) => {
    try {
        const purchase = await ShantiPurchase.findById(req.params.id)
        if (!purchase) return res.status(404).json({ error: 'not_found' })
        const { materialId, quantity, date, amount, paidAmount, method, sellerId, comment } = req.body
        if (method && !SHANTI_METHODS.includes(method)) return res.status(400).json({ error: 'invalid_method' })
        if (sellerId) {
            const seller = await ShantiSeller.findById(sellerId)
            if (!seller) return res.status(404).json({ error: 'seller_not_found' })
        }

        const oldMaterialId = String(purchase.materialId)
        const oldQuantity = purchase.quantity
        const newMaterialId = materialId ? String(materialId) : oldMaterialId
        const newQuantity = quantity !== undefined ? Number(quantity) : oldQuantity
        if (!(newQuantity > 0)) return res.status(400).json({ error: 'invalid_quantity' })

        const newAmount = amount !== undefined ? Number(amount) : purchase.amount
        if (!(newAmount > 0)) return res.status(400).json({ error: 'invalid_amount' })
        const newPaid = paidAmount !== undefined ? Number(paidAmount) : Math.min(purchase.paidAmount, newAmount)
        if (newPaid < 0 || newPaid > newAmount) return res.status(400).json({ error: 'invalid_paid_amount' })

        if (newMaterialId !== oldMaterialId) {
            await ShantiMaterial.updateOne({ _id: oldMaterialId }, { $inc: { stock: -oldQuantity } })
            const targetMaterial = await ShantiMaterial.findById(newMaterialId)
            if (!targetMaterial) return res.status(404).json({ error: 'material_not_found' })
            await ShantiMaterial.updateOne({ _id: newMaterialId }, { $inc: { stock: newQuantity } })
        } else if (newQuantity !== oldQuantity) {
            await ShantiMaterial.updateOne({ _id: oldMaterialId }, { $inc: { stock: newQuantity - oldQuantity } })
        }

        purchase.materialId = newMaterialId
        purchase.quantity = newQuantity
        purchase.amount = newAmount
        purchase.paidAmount = newPaid
        if (date !== undefined) purchase.date = new Date(date)
        if (method !== undefined) purchase.method = method
        if (sellerId !== undefined) purchase.sellerId = sellerId || null
        if (comment !== undefined) purchase.comment = comment
        await purchase.save()
        res.json({ purchase })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deletePurchase = async (req, res) => {
    try {
        const purchase = await ShantiPurchase.findById(req.params.id)
        if (!purchase) return res.status(404).json({ error: 'not_found' })
        await ShantiMaterial.updateOne({ _id: purchase.materialId }, { $inc: { stock: -purchase.quantity } })
        await purchase.deleteOne()
        res.json({ deleted: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
