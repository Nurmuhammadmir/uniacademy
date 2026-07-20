import mongoose from "mongoose"
const leadColumnSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    order: { type: Number, default: 0 },
    locked: { type: Boolean, default: false }, // locked columns can't accept/lose dragged leads - protects a "won"/"lost" stage from accidental drops
}, { timestamps: true })
leadColumnSchema.index({ branchId: 1, order: 1 })
const LeadColumn = mongoose.models.LeadColumn || mongoose.model('LeadColumn', leadColumnSchema)
export default LeadColumn
