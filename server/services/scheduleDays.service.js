// shared weekday/time math for anything that needs to know "which real calendar days does this
// group meet on" - lesson generation, salary per_lesson/per_hour approximation, and schedule
// conflict detection all used to keep their own copy of this; centralized here so adding the
// 'CUSTOM' pattern (arbitrary weekday picks, for the Jadval "Boshqa" tab) only had to happen once.
const PATTERN_DAYS = { MON_WED_FRI: [1, 3, 5], TUE_THU_SAT: [2, 4, 6] }

export const getScheduleDays = (group) => {
    if (group.schedulePattern === 'CUSTOM') return group.customDays || []
    return PATTERN_DAYS[group.schedulePattern] || []
}

export const countScheduledDaysInRange = (group, from, to) => {
    const days = getScheduleDays(group)
    if (days.length === 0) return 0
    let count = 0
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
    while (cursor <= end) {
        if (days.includes(cursor.getUTCDay())) count++
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return count
}

export const timeToMinutes = (time) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

export const addMinutesToTime = (time, minutes) => {
    const total = timeToMinutes(time) + minutes
    const h = Math.floor(total / 60) % 24
    const m = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// the next real calendar date+time this group meets, from `from` onward (today included, unless
// today's slot has already passed) - walks forward day by day rather than depending on Lesson rows
// existing, since those are only lazily generated when a Davomat tab is opened (see
// lessonGenerator.service.js) and a "next lesson" banner needs to work even if that's never happened
// for this group yet. Returns null if the group has no schedule, or its active window has ended.
export const getNextLessonDate = (group, from = new Date()) => {
    const days = getScheduleDays(group)
    if (days.length === 0 || !group.time) return null

    const nowMinutes = from.getUTCHours() * 60 + from.getUTCMinutes()
    const todayUTC = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))

    const start = new Date(group.startDate)
    const startUTC = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
    let endUTC = null
    if (group.endDate) {
        const end = new Date(group.endDate)
        endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
    }

    for (let offset = 0; offset <= 13; offset++) {
        const cursor = new Date(todayUTC)
        cursor.setUTCDate(cursor.getUTCDate() + offset)
        if (cursor < startUTC) continue
        if (endUTC && cursor > endUTC) break
        if (!days.includes(cursor.getUTCDay())) continue
        if (offset === 0 && timeToMinutes(group.time) < nowMinutes) continue
        return cursor
    }
    return null
}
