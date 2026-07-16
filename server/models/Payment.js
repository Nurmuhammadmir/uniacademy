import mongoose from "mongoose"

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true }, // which course this payment funds
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionEnd: { type: Date, default: null }, // resulting expiry after this payment was applied, filled in right after creation
}, { timestamps: true })

paymentSchema.index({ studentId: 1, languageId: 1 })

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
export default Payment
