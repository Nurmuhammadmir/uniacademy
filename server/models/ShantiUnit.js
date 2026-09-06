// units of measurement (dona/kg/litr/xizmat...) - a real manageable collection rather than a fixed
// array, since this vocabulary is business-specific and the company will want to extend it without
// a deploy. ShantiMaterial.unit/ShantiProduct.unit store the NAME (not a ref), same "rename cascades,
// delete is blocked while in use" idiom as ShantiMaterialCategory.
import mongoose from "mongoose"

const shantiUnitSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
}, { timestamps: true })

const ShantiUnit = mongoose.models.ShantiUnit || mongoose.model('ShantiUnit', shantiUnitSchema)
export default ShantiUnit
