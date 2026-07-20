import GroupMembership from "../models/GroupMembership.js"

// call whenever a student is actually added to a group's studentIds (addStudentToGroup, a group
// promotion moving them to the next level's group) - opens a new membership window
export const openMembership = async (studentId, group, at = new Date()) => {
    await GroupMembership.create({ studentId, groupId: group._id, languageId: group.languageId, joinedAt: at })
}

// call whenever a student actually leaves a group's studentIds (removeStudentFromGroup, or the OLD
// group side of a promotion) - closes whichever membership window for this student+group is still
// open. No-ops harmlessly if there's no open row (e.g. a student added before this feature existed
// and never explicitly re-added) - splitPeriodByMembership treats that gap as unattributed revenue
// rather than crashing.
export const closeMembership = async (studentId, groupId, at = new Date()) => {
    await GroupMembership.findOneAndUpdate({ studentId, groupId, leftAt: null }, { leftAt: at })
}
