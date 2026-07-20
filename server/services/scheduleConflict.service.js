// RULE #4 — teacher/room double-booking
import Group from "../models/Group.js"
import { getScheduleDays, timeToMinutes } from "./scheduleDays.service.js"

const timeRangesOverlap = (startA, durA, startB, durB) => {
    const aStart = timeToMinutes(startA), aEnd = aStart + durA
    const bStart = timeToMinutes(startB), bEnd = bStart + durB
    return aStart < bEnd && bStart < aEnd
}

const daysOverlap = (daysA, daysB) => daysA.some(d => daysB.includes(d))

// a conflict requires a shared weekday AND an overlapping time range against another active group.
// Teacher conflicts are checked regardless of branch (a teacher's time is one shared calendar across
// every branch they work in, per additionalBranchIds); room conflicts are inherently branch-scoped
// since a given roomId only ever belongs to one branch, so no extra branch filter is needed there.
export const assertNoScheduleConflict = async ({ teacherId, roomId, schedulePattern, customDays, time, durationMinutes, excludeGroupId }) => {
    const orConditions = []
    if (teacherId) orConditions.push({ teacherId })
    if (roomId) orConditions.push({ roomId })
    if (orConditions.length === 0) return

    const query = { status: 'active', $or: orConditions }
    if (excludeGroupId) query._id = { $ne: excludeGroupId }

    const days = getScheduleDays({ schedulePattern, customDays })
    const duration = durationMinutes || 90

    const candidates = await Group.find(query)
    for (const candidate of candidates) {
        if (!daysOverlap(days, getScheduleDays(candidate))) continue
        if (!timeRangesOverlap(time, duration, candidate.time, candidate.durationMinutes || 90)) continue

        if (teacherId && String(candidate.teacherId) === String(teacherId)) {
            const err = new Error('teacher_schedule_conflict')
            err.status = 409; err.code = 'teacher_schedule_conflict'
            throw err
        }
        if (roomId && candidate.roomId && String(candidate.roomId) === String(roomId)) {
            const err = new Error('room_schedule_conflict')
            err.status = 409; err.code = 'room_schedule_conflict'
            throw err
        }
    }
}
