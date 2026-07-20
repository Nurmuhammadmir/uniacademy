import mongoose from "mongoose"
import crypto from "crypto"

// one field of a public lead-intake form. 'name'/'phone'/'comment' keys map onto the Lead's own
// top-level fields when a submission comes in; any other key is stored under Lead.answers[key].
const fieldSchema = new mongoose.Schema({
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'phone', 'textarea', 'select'], default: 'text' },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] }, // only meaningful for type:'select'
}, { _id: false })

const DEFAULT_FIELDS = [
    { key: 'name', label: 'Ism va Familiya', type: 'text', required: true, options: [] },
    { key: 'phone', label: 'Telefon', type: 'phone', required: true, options: [] },
    { key: 'comment', label: 'Izoh', type: 'textarea', required: false, options: [] },
]

// a public, unauthenticated lead-intake form - anyone with the link can submit one. Every
// submission is tagged with this form's own sourceName and always lands in this form's chosen
// column/subgroup (see publicLeadFormController.submitPublicLeadForm) - the auto-intake-by-source
// binding on LeadSubgroup is a separate, more general mechanism for leads that aren't tied to a form.
const leadFormSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, default: '' },
    columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadColumn', required: true },
    subgroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadSubgroup', default: null },
    sourceName: { type: String, required: true },
    fields: { type: [fieldSchema], default: () => DEFAULT_FIELDS },
    slug: { type: String, required: true, unique: true, default: () => crypto.randomBytes(9).toString('base64url') },
}, { timestamps: true })

leadFormSchema.index({ branchId: 1 })

const LeadForm = mongoose.models.LeadForm || mongoose.model('LeadForm', leadFormSchema)
export default LeadForm
