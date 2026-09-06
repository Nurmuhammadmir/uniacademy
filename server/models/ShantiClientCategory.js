// manageable client categories (Sales department) - own collection rather than a shared
// {type,name,color} model with ShantiMaterialCategory, matching this codebase's own granularity
// (ExpenseCategory/LeadColumn/LeadSource are all separately-modeled small named lists too).
import mongoose from "mongoose"

const shantiClientCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    color: { type: String, default: '#7A7266' },
}, { timestamps: true })

const ShantiClientCategory = mongoose.models.ShantiClientCategory || mongoose.model('ShantiClientCategory', shantiClientCategorySchema)
export default ShantiClientCategory
