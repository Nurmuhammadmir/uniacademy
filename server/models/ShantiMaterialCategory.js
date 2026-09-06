// manageable material categories (Purchases department) - exact shape of the school's
// ExpenseCategory minus branchId (LasummaShanti is single-tenant). ShantiMaterial.category stores
// the category NAME as a plain string rather than a ref, so deleting a category can simply reassign
// existing materials to "Другое" without an orphaned foreign key.
import mongoose from "mongoose"

const shantiMaterialCategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    color: { type: String, default: '#7A7266' },
}, { timestamps: true })

const ShantiMaterialCategory = mongoose.models.ShantiMaterialCategory || mongoose.model('ShantiMaterialCategory', shantiMaterialCategorySchema)
export default ShantiMaterialCategory
