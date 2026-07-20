import Lesson from "../models/Lesson.js"
import { getScheduleDays, addMinutesToTime } from "./scheduleDays.service.js"

const toUTCDateOnly = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

// idempotently ensures every scheduled lesson date within [rangeStart, rangeEnd] (clamped to the
// group's own active window) exists as a Lesson row - safe to call repeatedly, only inserts
// whichever dates are still missing. Called lazily whenever the Davomat tab is opened for a given
// month, rather than eagerly generating a group's entire lifetime up front.
export const ensureLessonsGenerated = async (group, rangeStart, rangeEnd) => {
    const days = getScheduleDays(group)
    if (days.length === 0) return []

    const groupStart = toUTCDateOnly(new Date(group.startDate))
    const groupEnd = group.endDate ? toUTCDateOnly(new Date(group.endDate)) : null

    let start = toUTCDateOnly(new Date(rangeStart))
    let end = toUTCDateOnly(new Date(rangeEnd))
    if (start < groupStart) start = groupStart
    if (groupEnd && end > groupEnd) end = groupEnd
    if (start > end) return []

    const existing = await Lesson.find({ groupId: group._id, date: { $gte: start, $lte: end } }).select('date')
    const existingDates = new Set(existing.map(l => l.date.toISOString().slice(0, 10)))

    const endTime = addMinutesToTime(group.time, group.durationMinutes || 90)
    const toCreate = []
    const cursor = new Date(start)
    while (cursor <= end) {
        if (days.includes(cursor.getUTCDay())) {
            const key = cursor.toISOString().slice(0, 10)
            if (!existingDates.has(key)) {
                toCreate.push({ groupId: group._id, date: new Date(cursor), startTime: group.time, endTime })
            }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    if (toCreate.length > 0) {
        try {
            await Lesson.insertMany(toCreate, { ordered: false })
        } catch (error) {
            // duplicate-key races (two concurrent calls generating the same date) are harmless -
            // whichever call lost just means the lesson already exists, which is exactly the goal
            if (error.code !== 11000 && !error.writeErrors) throw error
        }
    }

    return Lesson.find({ groupId: group._id, date: { $gte: start, $lte: end } }).sort({ date: 1 })
}
