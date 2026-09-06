import mongoose from "mongoose"

const shantiClientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, default: '' },
    category: { type: String, default: 'Другое' },
    comment: { type: String, default: '' },
}, { timestamps: true })

const ShantiClient = mongoose.models.ShantiClient || mongoose.model('ShantiClient', shantiClientSchema)
export default ShantiClient
