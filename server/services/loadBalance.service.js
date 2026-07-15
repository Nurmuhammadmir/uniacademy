// RULE #5 — load balancing suggestion
import Group from "../models/Group.js"

export const suggestLeastLoadedGroup = async (branchId, languageId, levelId) => {
    const groups = await Group.find({ branchId, languageId, levelId, status: 'active' }).lean()
    if (groups.length === 0) return null
    return groups.reduce((least, current) => current.studentIds.length < least.studentIds.length ? current : least)
}
