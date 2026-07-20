import mongoose from "mongoose"

// the "Onlayn Darslar va materiallar" tab - a simple named-link list (recording lesson URL, a
// document link, etc) rather than a file-upload system, since no file-hosting infra exists for
// arbitrary materials beyond the vocab/reading image pipeline
const groupMaterialSchema = new mongoose.Schema({
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

groupMaterialSchema.index({ groupId: 1 })

const GroupMaterial = mongoose.models.GroupMaterial || mongoose.model('GroupMaterial', groupMaterialSchema)
export default GroupMaterial
