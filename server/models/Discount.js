import mongoose from "mongoose"

// a genuine price reduction for one student's course for ONE specific calendar month - NOT an
// expense (a discount is revenue the business simply never collects, not money it spends), so it's
// applied directly inside the billing engine's cost computation (recalculateCourseBilling /
// getPaymentPreview / the ledger's own cost replay) rather than booked as a transaction anywhere.
// Scoped to a single month by design: a discount for "August" only reduces August's chunk cost, not
// every future month - re-apply it if the discount should continue.
const discountSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    month: { type: String, required: true }, // 'YYYY-MM'
    type: { type: String, enum: ['percent', 'amount'], required: true },
    value: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

// one discount per student+course+month - setting a new one for the same month replaces the old
// rather than stacking (upserted via findOneAndUpdate, see adminController.setStudentDiscount)
discountSchema.index({ studentId: 1, languageId: 1, month: 1 }, { unique: true })

const Discount = mongoose.models.Discount || mongoose.model('Discount', discountSchema)
export default Discount
