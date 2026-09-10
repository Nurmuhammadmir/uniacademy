// A manual top-up of the cash-position balance, per payment method - exists purely to let a
// brand-new install of this platform be reconciled against a business that already has real
// existing cash/turnover from before it started using Shanti. Purely additive to a method's
// balance (see shantiBalanceController.js); never tied to a sale, purchase, or client.
import mongoose from "mongoose"
import { SHANTI_METHODS } from "./shantiConstants.js"

const methodBreakdownSchema = new mongoose.Schema({
    method: { type: String, enum: SHANTI_METHODS, required: true },
    amount: { type: Number, required: true },
}, { _id: false })

const shantiBalanceAdjustmentSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    method: { type: String, enum: SHANTI_METHODS, default: 'cash' },
    methodBreakdown: { type: [methodBreakdownSchema], default: [] },
    date: { type: Date, default: Date.now },
    comment: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiUser', required: true },
}, { timestamps: true })

shantiBalanceAdjustmentSchema.index({ date: 1 })

const ShantiBalanceAdjustment = mongoose.models.ShantiBalanceAdjustment || mongoose.model('ShantiBalanceAdjustment', shantiBalanceAdjustmentSchema)
export default ShantiBalanceAdjustment
