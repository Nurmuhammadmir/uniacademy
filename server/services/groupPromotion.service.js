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
import Pricing from "../models/Pricing.js"
import StudentProgress from "../models/StudentProgress.js"
import { computeDayCounter, isPastLevelEnd } from "./dayCounter.service.js"
import { openMembership, closeMembership } from "./groupMembership.service.js"
import { recognizeEnrollmentDebt } from "./billingCycle.service.js"

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

    // price/endDate are required on Group now (they drive real billing) - price comes from whatever
    // the director has set for this COURSE (price is per-language now, not per-level - promoting to
    // the next level never changes it); endDate defaults to preserving the OLD group's own duration
    // span (in days), applied fresh from today, since there's no admin here to ask for one
    const pricing = await Pricing.findOne({ languageId: group.languageId }).lean()
    const startDate = new Date()
    const spanMs = group.endDate ? group.endDate.getTime() - group.startDate.getTime() : 30 * 86400000
    const endDate = new Date(startDate.getTime() + Math.max(spanMs, 86400000))

    return Group.create({
        branchId: group.branchId,
        languageId: group.languageId,
        levelId: nextLevel._id,
        teacherId: group.teacherId,
        schedulePattern: group.schedulePattern,
        time: group.time,
        startDate, endDate,
        price: pricing?.monthlyPrice || 0,
        studentIds: [],
    })
}

// called lazily whenever a group's dayCounter gets resynced (see studentController's
// getGroupAndSyncWindow) - so it can run concurrently for several students in the same finishing
// group. Made race-safe with an atomic claim: the findOneAndUpdate filter requires
// levelCompletedAt:null, so if two requests hit this at once, only one can actually stamp it; the
// other gets null back and does nothing, which is what prevents the cohort from being split across
// duplicate next-level groups. Confirmed spec: `status` itself is never touched by this (or
// anything automatic) - the old group just keeps whatever status it already had, 0 students and
// all, until an admin notices and archives it manually. The old group's studentIds are deliberately
// NOT cleared, so director/admin historical reporting (attendance stats, a student's past-group
// profile listing) keeps working after a group's cohort graduates away from it.
export const promoteGroupIfLevelComplete = async (group, durationDays) => {
    if (group.status === 'archived' || group.levelCompletedAt) return
    if (!isPastLevelEnd(group, durationDays)) return

    const currentLevel = await Level.findById(group.levelId)
    if (!currentLevel) {
        // dangling level reference (e.g. deleted while a group was still active on it) - bail
        // without touching anything rather than crashing every student in this group on every
        // request that would otherwise dereference currentLevel.order below
        console.log(`promoteGroupIfLevelComplete: group ${group._id} references missing level ${group.levelId}`)
        return
    }

    const claimed = await Group.findOneAndUpdate(
        { _id: group._id, levelCompletedAt: null },
        { levelCompletedAt: new Date() },
        { new: false }
    )
    if (!claimed) return // another concurrent request already claimed/promoted this group

    const studentIds = claimed.studentIds
    if (studentIds.length === 0) return // nothing further to move - already claimed above

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
            await closeMembership(studentId, claimed._id)
        }
        return
    }

    const nextGroup = await findOrCreateNextGroup(claimed, nextLevel, studentIds.length)
    const nextGroupDayNow = computeDayCounter(nextGroup, nextLevel.durationDays || 30)

    for (const studentId of studentIds) {
        const student = await User.findById(studentId)
        if (!student) continue // don't re-add a deleted user to the new group

        nextGroup.studentIds.push(studentId)
        await closeMembership(studentId, claimed._id)
        await openMembership(studentId, nextGroup)

        const courseEntry = student.courses.find(c => String(c.languageId) === String(claimed.languageId))
        if (courseEntry) {
            courseEntry.levelId = nextLevel._id
            courseEntry.groupId = nextGroup._id
            // promotion is never gated on payment - an unpaid student still moves up with their
            // cohort. Posts the new level's price as a fresh debt right away (same as any other
            // group enrollment - see billingCycle.service.js), so an unpaid student's course
            // honestly shows as owing/inactive rather than silently carrying over a stale status.
            await recognizeEnrollmentDebt(student, courseEntry, null)
        }

        // seed at the DESTINATION group's real current day, not a hardcoded day 1 - a brand new
        // group's real day IS 1, but a group formed earlier today from a different origin cohort
        // may already be a little further along
        await StudentProgress.create({ studentId, groupId: nextGroup._id, day: nextGroupDayNow, status: 'open' })
    }
    await nextGroup.save()
}
