import mongoose from "mongoose"

const roomSchema = new mongoose.Schema({
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 20 },
}, { timestamps: true })

roomSchema.index({ branchId: 1 })

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema)
export default Room
