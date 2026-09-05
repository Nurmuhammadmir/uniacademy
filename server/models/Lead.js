import mongoose from "mongoose"
const leadSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadColumn', required: true },
    subgroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSubgroup', default: null },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    // free string matching a LeadSource.name for this branch (not an enum/ref) - same reasoning as
    // Expense.category: deleting a source just reassigns existing leads to "Other"
    source: { type: String, default: 'Other' },
    comment: { type: String, default: '' },
    order: { type: Number, default: 0 },
    // set when this lead was created through a public LeadForm submission rather than added manually
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadForm', default: null },
    // custom form fields beyond name/phone/comment (e.g. "Kursingizni tanlang") - keyed by the
    // form field's own key, free-shape since every form defines its own extra fields
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    // set once this lead is converted into a real student (see leadsController.convertLead) - the
    // lead itself is never deleted or moved automatically, this just tags it so the board can show
    // which leads already became paying students instead of that history being lost the moment
    // someone creates the student record separately in the Students page.
    convertedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    convertedAt: { type: Date, default: null },
}, { timestamps: true })
leadSchema.index({ columnId: 1, subgroupId: 1, order: 1 })
leadSchema.index({ branchId: 1 })
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema)
export default Lead
