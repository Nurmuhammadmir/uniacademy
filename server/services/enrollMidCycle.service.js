// RULE #6 — joining a group mid-cycle starts at the group's current day, not day 1
import StudentProgress from "../models/StudentProgress.js"
import { computeDayCounter } from "./dayCounter.service.js"

// `group.dayCounter` is never kept in sync in the database except at creation/promotion time (see
// dayCounter.service.computeDayCounter's doc comment) - always recompute the REAL current day from
// startDate rather than trusting whatever stale value happens to be sitting on the fetched
// document, or a student added today could be seeded days behind (or ahead of) where the group
// actually is.
export const enrollStudentMidCycle = async (studentId, group, durationDays = 30) => {
    const day = computeDayCounter(group.startDate, durationDays)
    return StudentProgress.create({ studentId, groupId: group._id, day, status: 'open' })
}
