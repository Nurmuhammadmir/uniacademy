import mongoose from "mongoose"
const branchSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: true })
const Branch = mongoose.models.Branch || mongoose.model('Branch', branchSchema)
export default Branch
