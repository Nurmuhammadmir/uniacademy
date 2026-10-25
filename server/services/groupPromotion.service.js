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

// daily catch-up sweep (see server.js's 3am cron, same cadence as runDailyBillingCycle) - confirmed
// real bug, found live (teacher support ticket, 2026-10-25): promoteGroupIfLevelComplete above was
// ONLY ever triggered lazily from the STUDENT side (studentController's getGroupAndSyncWindow) - a
// group whose students simply stop opening the app after its level's last lesson (entirely plausible:
// nothing requires every enrolled student to open their homework page every day) never got promoted
// at all, and since computeDayCounter caps AT durationDays and stays there forever (see
// dayCounter.service.js), every TEACHER-side endpoint keyed off that same group/day number
// (createAttendanceSession, markStudentAttendance) kept reopening/rewriting the SAME frozen day
// indefinitely - attendance silently stopped advancing, with no error, while real calendar Lesson
// rows kept generating and sitting unmarked. Sweeping every active, not-yet-completed group once a
// day here means this can never again depend on which side (student or teacher) happens to ask first.
// Each group wrapped in its own try/catch (same reasoning as runDailyBillingCycle) so one bad
// group/level reference can't take the rest of the sweep down.
export const runDailyGroupPromotionSweep = async () => {
    const groups = await Group.find({ status: 'active', levelCompletedAt: null }).lean()
    let promoted = 0
    const failures = []
    for (const group of groups) {
        try {
            const level = await Level.findById(group.levelId).select('durationDays').lean()
            await promoteGroupIfLevelComplete(group, level?.durationDays || 30)
            if (await Group.exists({ _id: group._id, levelCompletedAt: { $ne: null } })) promoted++
        } catch (error) {
            console.log('runDailyGroupPromotionSweep: failed for group', group._id, error)
            failures.push({ groupId: group._id, error: error.message })
        }
    }
    return { groupsChecked: groups.length, promoted, failures }
}
