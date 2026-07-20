import mongoose from "mongoose"

// a private scratchpad for one admin - never shared with other admins/directors, not branch-wide.
// Deliberately simple: just a list of free-text notes, newest first.
const adminNoteSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
}, { timestamps: true })

adminNoteSchema.index({ adminId: 1, createdAt: -1 })

const AdminNote = mongoose.models.AdminNote || mongoose.model('AdminNote', adminNoteSchema)
export default AdminNote
