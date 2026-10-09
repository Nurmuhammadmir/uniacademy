// one sale to a client, normally one or more product lines. `amount` defaults to sum(items.qty*price)
// at create time but is directly overridable (confirmed: neither a line's price nor the sale's total
// should be hard-locked to the product catalog). `paidAmount` defaults to `amount`; debt is computed
// on read, same idiom as ShantiPurchase.
// `items` can be empty - confirmed spec: a pure-bonus "deal" (free goods with nothing actually sold,
// e.g. a promo giveaway) is still a real sale worth recording, as long as `bonusItems` carries
// something; the controller enforces "not both empty" since a sale with neither is nothing at all.
import mongoose from "mongoose"
import { SHANTI_METHODS } from "./shantiConstants.js"

const shantiSaleItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiProduct', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
}, { _id: false })

const methodBreakdownSchema = new mongoose.Schema({
    method: { type: String, enum: SHANTI_METHODS, required: true },
    amount: { type: Number, required: true },
}, { _id: false })

const shantiSaleSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiClient', required: true },
    date: { type: Date, default: Date.now },
    items: { type: [shantiSaleItemSchema], default: [] },
    // free goods thrown in with this sale. Same shape as `items`, but `price` here is the per-unit
    // COST we absorb (never revenue): they leave stock like any sold item, add nothing to `amount`,
    // and are booked as ONE linked cash ShantiExpense (see shantiBonus.service.js). The price is
    // resolved by the server (never typed by the user) and kept as a snapshot, so a later catalog
    // price change doesn't rewrite history.
    bonusItems: { type: [shantiSaleItemSchema], default: [] },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, required: true },
    method: { type: String, enum: SHANTI_METHODS, default: 'cash' },
    // set only when paidAmount was actually split across more than one method (part cash, part
    // transfer, etc.) - empty/absent means the whole paidAmount went via `method` (the common case).
    methodBreakdown: { type: [methodBreakdownSchema], default: [] },
    comment: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShantiUser', required: true },
}, { timestamps: true })

shantiSaleSchema.index({ date: 1 })
shantiSaleSchema.index({ clientId: 1 })

const ShantiSale = mongoose.models.ShantiSale || mongoose.model('ShantiSale', shantiSaleSchema)
export default ShantiSale
