// the sales-side catalog - deliberately separate from ShantiMaterial (no conversion/recipe link
// requested). `price` is just a prefill default for a new sale line, never locked. `stock` is set at
// creation and directly editable (restocking), decremented by shantiSalesController on each sale.
import mongoose from "mongoose"

const shantiProductSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    unit: { type: String, required: true },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
}, { timestamps: true })

const ShantiProduct = mongoose.models.ShantiProduct || mongoose.model('ShantiProduct', shantiProductSchema)
export default ShantiProduct
