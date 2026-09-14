// the sales-side catalog. `price` is just a prefill default for a new sale line, never locked.
// `stock` is set at creation and directly editable (restocking), decremented by
// shantiSalesController on each sale. `materialsUsed` is this product's recipe - how much of each
// ShantiMaterial one unit of it consumes - so selling it can automatically decrement the right
// materials too (see shantiSalesController.applyStockDelta), instead of a seller having to remember
// to separately log material usage by hand. `imageUrl` points at a resized copy already written to
// disk by shantiUploadController (never the original upload - see that file for why), so this model
// never carries image bytes itself.
import mongoose from "mongoose"

const shantiProductSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    unit: { type: String, required: true },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    imageUrl: { type: String, default: null },
    materialsUsed: {
        type: [{
            materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiMaterial', required: true },
            quantity: { type: Number, required: true },
        }],
        default: [],
    },
}, { timestamps: true })

const ShantiProduct = mongoose.models.ShantiProduct || mongoose.model('ShantiProduct', shantiProductSchema)
export default ShantiProduct
