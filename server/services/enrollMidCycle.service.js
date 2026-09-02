// RULE #6 — joining a group mid-cycle starts at the group's current day, not day 1
import StudentProgress from "../models/StudentProgress.js"
import { computeDayCounter } from "./dayCounter.service.js"

// `group.dayCounter` is never kept in sync in the database except at creation/promotion time (see
// dayCounter.service.computeDayCounter's doc comment) - always recompute the REAL current day from
// startDate rather than trusting whatever stale value happens to be sitting on the fetched
// document, or a student added today could be seeded days behind (or ahead of) where the group
// actually is.
// Upsert, not a bare create: a student removed from this exact group and re-added the SAME day
// (confirmed real scenario this session, just for a different group) computes the identical day
// both times - a plain create() throws on StudentProgress's own unique {studentId,groupId,day}
// index. addStudentToGroup has already pushed them onto the group's roster and opened a fresh
// membership by the time this runs, so that crash used to leave a genuinely broken half-state: on
// the group's roster, but with no course link and no debt posted, and the admin looking at a 500.
export const enrollStudentMidCycle = async (studentId, group, durationDays = 30) => {
    const day = computeDayCounter(group, durationDays)
    return StudentProgress.findOneAndUpdate(
        { studentId, groupId: group._id, day },
        { $setOnInsert: { studentId, groupId: group._id, day, status: 'open' } },
        { upsert: true, new: true },
    )
}
