// one sale to a client, one or more product lines. `amount` defaults to sum(items.qty*price) at
// create time but is directly overridable (confirmed: neither a line's price nor the sale's total
// should be hard-locked to the product catalog). `paidAmount` defaults to `amount`; debt is computed
// on read, same idiom as ShantiPurchase.
import mongoose from "mongoose"
import { SHANTI_METHODS } from "./shantiConstants.js"

const shantiSaleItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiProduct', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
}, { _id: false })

const shantiSaleSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiClient', required: true },
    date: { type: Date, default: Date.now },
    items: { type: [shantiSaleItemSchema], required: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    method: { type: String, enum: SHANTI_METHODS, default: 'cash' },
    comment: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiUser', required: true },
}, { timestamps: true })

shantiSaleSchema.index({ date: 1 })
shantiSaleSchema.index({ clientId: 1 })

const ShantiSale = mongoose.models.ShantiSale || mongoose.model('ShantiSale', shantiSaleSchema)
export default ShantiSale
