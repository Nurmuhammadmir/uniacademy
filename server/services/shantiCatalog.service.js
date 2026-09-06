// seed helpers for LasummaShanti's small manageable lists (units, the material/client category
// fallback). Every list-read endpoint (listUnits/listMaterialCategories/listClientCategories) calls
// its "ensure" function first - fine once, but over a tunneled DB connection (see mongodb.js) each
// extra round trip has real, felt latency, and these three were each paying for one on literally
// every single list fetch even though the thing being "ensured" essentially never changes once
// created. Each one now checks an in-memory flag first (this server process's own lifetime is a
// perfectly good cache for "have I already confirmed this exists") and only ever talks to the
// database again if the process just started or the flag was reset - a real DB round trip becomes
// the rare case instead of the every-request case.
import ShantiUnit from "../models/ShantiUnit.js"
import ShantiMaterialCategory from "../models/ShantiMaterialCategory.js"
import ShantiClientCategory from "../models/ShantiClientCategory.js"

export const OTHER_MATERIAL_CATEGORY = 'Другое'
export const OTHER_CLIENT_CATEGORY = 'Другое'
const DEFAULT_UNITS = ['шт', 'кг', 'л', 'услуга']

let unitsSeeded = false
export const ensureDefaultShantiUnits = async () => {
    if (unitsSeeded) return
    const existing = await ShantiUnit.countDocuments({})
    if (existing === 0) {
        try {
            await ShantiUnit.insertMany(DEFAULT_UNITS.map(name => ({ name })), { ordered: false })
        } catch (error) {
            if (error.code !== 11000 && !error.writeErrors) throw error
        }
    }
    unitsSeeded = true
}

let materialCategorySeeded = false
export const ensureOtherMaterialCategoryExists = async () => {
    if (materialCategorySeeded) return
    await ShantiMaterialCategory.findOneAndUpdate(
        { name: OTHER_MATERIAL_CATEGORY },
        { $setOnInsert: { name: OTHER_MATERIAL_CATEGORY, color: '#7A7266' } },
        { upsert: true }
    )
    materialCategorySeeded = true
}

let clientCategorySeeded = false
export const ensureOtherClientCategoryExists = async () => {
    if (clientCategorySeeded) return
    await ShantiClientCategory.findOneAndUpdate(
        { name: OTHER_CLIENT_CATEGORY },
        { $setOnInsert: { name: OTHER_CLIENT_CATEGORY, color: '#7A7266' } },
        { upsert: true }
    )
    clientCategorySeeded = true
}
