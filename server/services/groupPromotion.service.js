// RULE (confirmed spec): which course, which group a student is in is ALWAYS the admin's own
// manual decision - a group finishing a level never automatically creates or moves anyone into a
// new group, and never touches a student's own levelId/groupId by itself. The only thing this does
// automatically is flag that a level is DONE (levelCompletedAt on the group, courseCompleted on a
// student's course entry once there's no further level to go to) - deciding what happens next
// (create/pick a group for the next level, or leave the course finished) is the admin's own call,
// same "Guruhga qo'shish" flow used for any other enrollment.
import Level from "../models/Level.js"
import Group from "../models/Group.js"
import User from "../models/User.js"
import { closeMembership } from "./groupMembership.service.js"
import { isPastLevelEnd } from "./dayCounter.service.js"

// called lazily whenever a group's dayCounter gets resynced (see studentController's
// getGroupAndSyncWindow) - so it can run concurrently for several students in the same finishing
// group. Made race-safe with an atomic claim: the findOneAndUpdate filter requires
// levelCompletedAt:null, so if two requests hit this at once, only one can actually stamp it; the
// other gets null back and does nothing. Confirmed spec: `status` itself is never touched by this
// (or anything automatic) - the group just keeps whatever status it already had, roster and all,
// until an admin decides what to do with it (start a new group for the next level and manually add
// these students, or leave it be).
export const promoteGroupIfLevelComplete = async (group, durationDays) => {
    if (group.status === 'archived' || group.levelCompletedAt) return
    if (!isPastLevelEnd(group, durationDays)) return

    const currentLevel = await Level.findById(group.levelId)
    if (!currentLevel) {
        // dangling level reference (e.g. deleted while a group was still active on it) - bail
        // without touching anything rather than crashing every request that would otherwise
        // dereference currentLevel.order below
        console.log(`promoteGroupIfLevelComplete: group ${group._id} references missing level ${group.levelId}`)
        return
    }

    const claimed = await Group.findOneAndUpdate(
        { _id: group._id, levelCompletedAt: null },
        { levelCompletedAt: new Date() },
        { new: false }
    )
    if (!claimed) return // another concurrent request already claimed this group

    const nextLevel = await Level.findOne({ languageId: claimed.languageId, order: { $gt: currentLevel.order } }).sort({ order: 1 })
    // only the "top of the ladder, nothing further to take" case marks anything on the student -
    // and even that isn't a group change, just an honest "this course is finished" flag so the app
    // can tell it apart from "never enrolled". Every other case (there IS a next level) does nothing
    // further at all: the admin picks/creates whichever group these students go to next themselves.
    if (!nextLevel) {
        for (const studentId of claimed.studentIds) {
            try {
                const student = await User.findById(studentId)
                if (!student) continue
                const courseEntry = student.courses.find(c => String(c.languageId) === String(claimed.languageId))
                if (courseEntry) {
                    courseEntry.courseCompleted = true
                    await student.save()
                }
                await closeMembership(studentId, claimed._id)
            } catch (error) {
                console.log('promoteGroupIfLevelComplete: failed marking course complete for student', studentId, 'group', claimed._id, error)
            }
        }
    }
}
