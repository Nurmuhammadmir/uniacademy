// A debt-collection receipt from a client - reduces their outstanding sales debt (see
// shantiDebt.service.js) without ever touching the underlying Sale documents, so a sale's own
// paidAmount/method stay an accurate record of that specific transaction while this is a separate,
// independently editable/deletable log of "money the client paid down against their balance".
import mongoose from "mongoose"
import { SHANTI_METHODS } from "./shantiConstants.js"

const methodBreakdownSchema = new mongoose.Schema({
    method: { type: String, enum: SHANTI_METHODS, required: true },
    amount: { type: Number, required: true },
}, { _id: false })

const shantiPaymentSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiClient', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: SHANTI_METHODS, default: 'cash' },
    // set only when this payment was actually split across more than one method at once.
    methodBreakdown: { type: [methodBreakdownSchema], default: [] },
    date: { type: Date, default: Date.now },
    comment: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiUser', required: true },
}, { timestamps: true })

shantiPaymentSchema.index({ date: 1 })
shantiPaymentSchema.index({ clientId: 1 })

const ShantiPayment = mongoose.models.ShantiPayment || mongoose.model('ShantiPayment', shantiPaymentSchema)
export default ShantiPayment
