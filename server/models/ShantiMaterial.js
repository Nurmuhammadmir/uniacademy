// a raw material bought in the Purchases department. `stock` is denormalized (not a live sum of
// purchases) - mutated only by shantiPurchasesController's create/update/delete, exactly like
// Account.balance is mutated only by ledger.service.js's posting functions. There is no "material
// consumption" feature requested, so stock only ever moves via purchases.
import mongoose from "mongoose"

const shantiMaterialSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String, default: 'Другое' },
    unit: { type: String, required: true },
    stock: { type: Number, default: 0 },
}, { timestamps: true })

const ShantiMaterial = mongoose.models.ShantiMaterial || mongoose.model('ShantiMaterial', shantiMaterialSchema)
export default ShantiMaterial
