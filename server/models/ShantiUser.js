// LasummaShanti's own user collection - fully separate from the school's User model (different
// business entirely, sharing only the VPS/Mongo database, never the data). No branchId, no roles
// tiering yet - a single shared login sees both Purchases and Sales.
import mongoose from "mongoose"

const shantiUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['shanti'], default: 'shanti' },
}, { timestamps: true })

const ShantiUser = mongoose.models.ShantiUser || mongoose.model('ShantiUser', shantiUserSchema)
export default ShantiUser
