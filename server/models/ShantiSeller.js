// who a material was actually bought from - a real entity (not free text) so contact info (phone)
// can be attached and reused across purchases, mirroring ShantiClient on the sales side.
import mongoose from "mongoose"

const shantiSellerSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    phone: { type: String, default: '' },
    comment: { type: String, default: '' },
}, { timestamps: true })

const ShantiSeller = mongoose.models.ShantiSeller || mongoose.model('ShantiSeller', shantiSellerSchema)
export default ShantiSeller
