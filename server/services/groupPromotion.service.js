// The WHOLE group advances to the next level together the day AFTER it finishes a level's
// homework window (dayCounter would have exceeded durationDays - see dayCounter.service.isPastLevelEnd)
// - completely independent of anyone's exam result, and NEVER gated on payment/subscription status.
// A student who never paid still moves up with their cohort; their course's `isActive` flag is
// left honestly reflecting whether their subscription has actually lapsed, rather than being
// silently carried over as "active." It's an admin's manual call afterwards (looking at
// ExamAttempt history and payment status) whether a struggling or unpaid student needs to be
// moved back down or chased for payment - this mirrors the old per-student "next cohort" logic in
// examPromotion.service.js, just applied to every student in the group at once.
import Level from "../models/Level.js"
import Group from "../models/Group.js"
import User from "../models/User.js"
import StudentProgress from "../models/StudentProgress.js"
import { computeDayCounter, isPastLevelEnd } from "./dayCounter.service.js"

// only reuses an existing next-level group if it was ALSO created today (i.e. is itself a
// freshly-promoted cohort, not one that's been running for weeks) AND has room for the whole
// incoming cohort - matching on the group's own `dayCounter` field would be unreliable since that
// field is never persisted except at creation/promotion time, so a long-running group could still
// show a stale, misleadingly-low value.
const findOrCreateNextGroup = async (group, nextLevel, cohortSize) => {
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)

    const candidate = await Group.findOne({
        branchId: group.branchId,
        languageId: group.languageId,
        levelId: nextLevel._id,
        teacherId: group.teacherId,
        schedulePattern: group.schedulePattern,
        time: group.time,
        status: 'active',
        startDate: { $gte: startOfToday },
    })

    if (candidate && candidate.studentIds.length + cohortSize <= candidate.capacity) {
        return candidate
    }

    return Group.create({
        branchId: group.branchId,
        languageId: group.languageId,
        levelId: nextLevel._id,
        teacherId: group.teacherId,
        schedulePattern: group.schedulePattern,
        time: group.time,
        startDate: new Date(),
        studentIds: [],
    })
}

// called lazily whenever a group's dayCounter gets resynced (see studentController's
// getGroupAndSyncWindow) - so it can run concurrently for several students in the same finishing
// group. Made race-safe with an atomic claim: the findOneAndUpdate filter requires status:'active',
// so if two requests hit this at once, only one can actually flip it to 'completed'; the other
// gets null back and does nothing, which is what prevents the cohort from being split across
// duplicate next-level groups. The old group's studentIds are deliberately NOT cleared, so
// director/admin historical reporting (attendance stats, a student's past-group profile listing)
// keeps working after a group completes.
export const promoteGroupIfLevelComplete = async (group, durationDays) => {
    if (group.status !== 'active') return
    if (!isPastLevelEnd(group.startDate, durationDays)) return

    const currentLevel = await Level.findById(group.levelId)
    if (!currentLevel) {
        // dangling level reference (e.g. deleted while a group was still active on it) - bail
        // without touching anything rather than crashing every student in this group on every
        // request that would otherwise dereference currentLevel.order below
        console.log(`promoteGroupIfLevelComplete: group ${group._id} references missing level ${group.levelId}`)
        return
    }

    const claimed = await Group.findOneAndUpdate(
        { _id: group._id, status: 'active' },
        { status: 'completed' },
        { new: false }
    )
    if (!claimed) return // another concurrent request already claimed/promoted this group

    const studentIds = claimed.studentIds
    if (studentIds.length === 0) return // nothing further to move - already marked completed above

    const nextLevel = await Level.findOne({ languageId: claimed.languageId, order: { $gt: currentLevel.order } }).sort({ order: 1 })

    if (!nextLevel) {
        // top of the ladder for this language - mark every student's course entry complete so the
        // app can tell "finished the whole course" apart from "never enrolled"
        for (const studentId of studentIds) {
            const student = await User.findById(studentId)
            if (!student) continue
            const courseEntry = student.courses.find(c => String(c.languageId) === String(claimed.languageId))
            if (courseEntry) {
                courseEntry.courseCompleted = true
                await student.save()
            }
        }
        return
    }

    const nextGroup = await findOrCreateNextGroup(claimed, nextLevel, studentIds.length)
    const nextGroupDayNow = computeDayCounter(nextGroup.startDate, nextLevel.durationDays || 30)

    for (const studentId of studentIds) {
        const student = await User.findById(studentId)
        if (!student) continue // don't re-add a deleted user to the new group

        nextGroup.studentIds.push(studentId)

        const courseEntry = student.courses.find(c => String(c.languageId) === String(claimed.languageId))
        if (courseEntry) {
            courseEntry.levelId = nextLevel._id
            // promotion is never gated on payment - an unpaid student still moves up with their
            // cohort, but their course should honestly show as expired rather than silently
            // carrying over a stale "active" flag from the level they just left
            if (courseEntry.subscriptionExpiresAt && courseEntry.subscriptionExpiresAt < new Date()) {
                courseEntry.isActive = false
            }
            await student.save()
        }

        // seed at the DESTINATION group's real current day, not a hardcoded day 1 - a brand new
        // group's real day IS 1, but a group formed earlier today from a different origin cohort
        // may already be a little further along
        await StudentProgress.create({ studentId, groupId: nextGroup._id, day: nextGroupDayNow, status: 'open' })
    }
    await nextGroup.save()
}
