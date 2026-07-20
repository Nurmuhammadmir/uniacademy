import mongoose from "mongoose"

// manageable lead-source list (Leads Kanban) - a branch can add/rename/recolor/delete its own.
// Lead.source, LeadForm.sourceName, and LeadSubgroup.autoIntakeSourceNames all store the source
// NAME as a plain string rather than a ref, so deleting a source can reassign existing references
// to "Other" without an orphaned foreign key (same pattern as ExpenseCategory).
const leadSourceSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#7A7266' },
}, { timestamps: true })

leadSourceSchema.index({ branchId: 1, name: 1 }, { unique: true })

const LeadSource = mongoose.models.LeadSource || mongoose.model('LeadSource', leadSourceSchema)
export default LeadSource
