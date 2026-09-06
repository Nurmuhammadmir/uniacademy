// seed helpers for LasummaShanti's small manageable lists (units, the material/client category
// fallback) - same "insertMany once if empty, upsert-if-missing for one specific entry later" shape
// as the school's expenseCategories.service.js.
import ShantiUnit from "../models/ShantiUnit.js"
import ShantiMaterialCategory from "../models/ShantiMaterialCategory.js"
import ShantiClientCategory from "../models/ShantiClientCategory.js"

export const OTHER_MATERIAL_CATEGORY = 'Другое'
export const OTHER_CLIENT_CATEGORY = 'Другое'
const DEFAULT_UNITS = ['шт', 'кг', 'л', 'услуга']

export const ensureDefaultShantiUnits = async () => {
    const existing = await ShantiUnit.countDocuments({})
    if (existing > 0) return
    try {
        await ShantiUnit.insertMany(DEFAULT_UNITS.map(name => ({ name })), { ordered: false })
    } catch (error) {
        if (error.code !== 11000 && !error.writeErrors) throw error
    }
}

export const ensureOtherMaterialCategoryExists = async () => {
    await ShantiMaterialCategory.findOneAndUpdate(
        { name: OTHER_MATERIAL_CATEGORY },
        { $setOnInsert: { name: OTHER_MATERIAL_CATEGORY, color: '#7A7266' } },
        { upsert: true }
    )
}

export const ensureOtherClientCategoryExists = async () => {
    await ShantiClientCategory.findOneAndUpdate(
        { name: OTHER_CLIENT_CATEGORY },
        { $setOnInsert: { name: OTHER_CLIENT_CATEGORY, color: '#7A7266' } },
        { upsert: true }
    )
}
