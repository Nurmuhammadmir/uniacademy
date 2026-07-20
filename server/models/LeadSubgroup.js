import mongoose from "mongoose"
const leadSubgroupSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    columnId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeadColumn', required: true },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    // source NAMEs bound to this subgroup - a lead created with a matching source and no explicit
    // subgroup auto-lands here (see leadsController.createLead). Several sources can point at one
    // subgroup; a source should only be bound to one subgroup at a time (enforced client-side).
    autoIntakeSourceNames: { type: [String], default: [] },
}, { timestamps: true })
leadSubgroupSchema.index({ columnId: 1, order: 1 })
const LeadSubgroup = mongoose.models.LeadSubgroup || mongoose.model('LeadSubgroup', leadSubgroupSchema)
export default LeadSubgroup
