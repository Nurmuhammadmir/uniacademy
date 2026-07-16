import mongoose from "mongoose"
const pricingSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    levelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
    monthlyPrice: { type: Number, required: true },
}, { timestamps: true })
pricingSchema.index({ languageId: 1, levelId: 1 })
const Pricing = mongoose.models.Pricing || mongoose.model('Pricing', pricingSchema)
export default Pricing
