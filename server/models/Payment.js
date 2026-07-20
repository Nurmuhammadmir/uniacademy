import mongoose from "mongoose"

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true }, // which course this payment funds
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionEnd: { type: Date, default: null }, // resulting expiry after this payment was applied, filled in right after creation
    // not `required` here on purpose - recalculateCourseBilling re-saves every historical Payment
    // row for a student+language whenever billing recomputes, which runs full-document validation;
    // requiring this field would 500 that recompute the instant a student has one payment
    // predating this field. "required on create" is enforced in adminController.createPayment
    // instead, leaving legacy rows validly unset and shown as "not recorded" in the UI.
    method: { type: String, enum: ['cash', 'bank_transfer', 'card', 'click'] },
    // a refund keeps the row (unlike the old hard-delete "void") so the ledger stays honest and
    // auditable - refundedAmount supports a PARTIAL refund (any amount up to the payment's own
    // amount); `refunded` just means "at least something was refunded", true once refundedAmount > 0.
    // recalculateCourseBilling/finance reporting use (amount - refundedAmount) as the payment's real
    // net contribution rather than a binary include/exclude.
    refunded: { type: Boolean, default: false },
    refundedAmount: { type: Number, default: 0 },
    refundedAt: { type: Date, default: null },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // attribution snapshot, taken once at createPayment time and NEVER re-derived later - a
    // student's group/teacher/branch can all change after the fact, but this payment funded
    // whichever ones were true at the moment it was recorded, and finance/salary reporting needs
    // that historical truth, not "whatever is true today". Not `required` for the exact same
    // reason `method` isn't (recalculateCourseBilling re-saves old rows on every recompute) - also
    // legitimately null when a payment is recorded before the student has ever been placed in a group.
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
}, { timestamps: true })

paymentSchema.index({ studentId: 1, languageId: 1 })

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
export default Payment
