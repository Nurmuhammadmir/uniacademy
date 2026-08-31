import mongoose from "mongoose"

const paymentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // confirmed spec: a payment is NEVER for one particular course - it's a deposit into the
    // student's one shared wallet (their overall Account.balance). This field only survives on
    // legacy rows recorded before that rework; new payments never set it. Which course(s) a
    // payment's money actually settles is decided entirely by billingCycle.service.js's
    // account-wide FIFO walk, never by this field.
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', default: null },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subscriptionEnd: { type: Date, default: null }, // resulting expiry after this payment was applied, filled in right after creation
    // not `required` here on purpose - recalculateCourseBilling re-saves every historical Payment
    // row for a student+language whenever billing recomputes, which runs full-document validation;
    // requiring this field would 500 that recompute the instant a student has one payment
    // predating this field. "required on create" is enforced in adminController.createPayment
    // instead, leaving legacy rows validly unset and shown as "not recorded" in the UI.
    // 'payme' was missing here even though adminController's PAYMENT_METHODS and the admin payment
    // form both already allowed it - any real Payme payment would have 500'd on save
    method: { type: String, enum: ['cash', 'bank_transfer', 'card', 'click', 'payme'] },
    // a refund keeps the row (unlike the old hard-delete "void") so the ledger stays honest and
    // auditable - refundedAmount supports a PARTIAL refund (any amount up to the payment's own
    // amount); `refunded` just means "at least something was refunded", true once refundedAmount > 0.
    // recalculateCourseBilling/finance reporting use (amount - refundedAmount) as the payment's real
    // net contribution rather than a binary include/exclude.
    refunded: { type: Boolean, default: false },
    refundedAmount: { type: Number, default: 0 },
    refundedAt: { type: Date, default: null },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // legacy attribution snapshot - levelId/groupId/teacherId were set once at createPayment time,
    // back when a payment was recorded against one specific course. New payments never set these
    // (a payment isn't for any particular course/group/teacher anymore); they survive only so old
    // rows recorded before that rework keep whatever historical context they were given.
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    // links this receipt to the LedgerEntry transaction it posted (student decrease / branch
    // increase) - lets updatePayment/refundPayment/deletePayment find and adjust/reverse the exact
    // ledger posting this document caused, instead of re-deriving it from scratch on every edit.
    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true })

paymentSchema.index({ studentId: 1, languageId: 1 })
// every Finance page load filters/aggregates Payment by branchId + date range at least 4 times
// (list, count, total, trailing-period series) - without this it's a full collection scan each time
paymentSchema.index({ branchId: 1, date: 1 })

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
export default Payment
