// A general company operating cost (fuel, utilities, rent, ...) - separate from Purchases (buying
// material inventory) and from Sales debt collection. `sellerId` is set ONLY when this specific
// expense IS a debt payment to a supplier: paying down what we owe a seller for past purchases is
// still money leaving the business, so it belongs in this same list/category system rather than a
// parallel one - see shantiSellerDebt.service.js for how it then reduces that seller's debt.
import mongoose from "mongoose"
import { SHANTI_METHODS } from "./shantiConstants.js"

const methodBreakdownSchema = new mongoose.Schema({
    method: { type: String, enum: SHANTI_METHODS, required: true },
    amount: { type: Number, required: true },
}, { _id: false })

const shantiExpenseSchema = new mongoose.Schema({
    category: { type: String, default: 'Другое' },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: SHANTI_METHODS, default: 'cash' },
    methodBreakdown: { type: [methodBreakdownSchema], default: [] },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiSeller', default: null },
    comment: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiUser', required: true },
}, { timestamps: true })

shantiExpenseSchema.index({ date: 1 })
shantiExpenseSchema.index({ sellerId: 1 })

const ShantiExpense = mongoose.models.ShantiExpense || mongoose.model('ShantiExpense', shantiExpenseSchema)
export default ShantiExpense
