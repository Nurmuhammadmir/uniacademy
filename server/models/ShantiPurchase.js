// one purchase of a material. Separates "how much this cost" (amount) from "how much of it has
// actually been paid" (paidAmount, defaults to amount but editable) - debt is just amount-paidAmount,
// computed on read, never stored (same idiom as Payment.refundedAmount on the school side). Category
// is deliberately NOT denormalized here - filtering by category resolves through materialId at read
// time, so a purchase always reflects the material's CURRENT classification, not a stale snapshot.
import mongoose from "mongoose"
import { SHANTI_METHODS } from "./shantiConstants.js"

const shantiPurchaseSchema = new mongoose.Schema({
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiMaterial', required: true },
    quantity: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    method: { type: String, enum: SHANTI_METHODS, default: 'cash' },
    // who the material was actually bought from - a real ShantiSeller (so contact info like phone
    // is attached once and reused), not free text - optional since the seller isn't always known.
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiSeller', default: null },
    comment: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiUser', required: true },
}, { timestamps: true })

shantiPurchaseSchema.index({ date: 1 })
shantiPurchaseSchema.index({ materialId: 1 })
shantiPurchaseSchema.index({ sellerId: 1 })

const ShantiPurchase = mongoose.models.ShantiPurchase || mongoose.model('ShantiPurchase', shantiPurchaseSchema)
export default ShantiPurchase
