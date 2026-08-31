import mongoose from "mongoose"

// one row per COURSE (language) - price is set for the course itself, not for any individual
// level. A course can legitimately have zero levels at all (a flat course with no sub-divisions)
// and still needs a price; even a course that DOES have levels charges the same price no matter
// which level a given group is currently running.
const pricingSchema = new mongoose.Schema({
    languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true, unique: true },
    monthlyPrice: { type: Number, required: true },
}, { timestamps: true })
const Pricing = mongoose.models.Pricing || mongoose.model('Pricing', pricingSchema)
export default Pricing
