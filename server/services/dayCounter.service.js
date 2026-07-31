// RULE #3 — group day counter over the level's own duration (director-configurable per level via
// Level.durationDays, no longer a fixed 30). Counts only real LESSON days elapsed per the group's
// own schedule pattern (e.g. Tue/Thu/Sat) - a non-lesson weekday no longer advances this at all, so
// "day 5" means this group's 5th actual class, not the 5th calendar day since it started.
import { getScheduleDays } from "./scheduleDays.service.js"

const startOfUTCDay = (date) => {
    const d = new Date(date)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export const computeDayCounter = (group, durationDays = 30) => {
    const scheduleDays = getScheduleDays(group)
    const startUTC = startOfUTCDay(group.startDate)
    const todayUTC = startOfUTCDay(new Date())
    // before the group has technically started, or a group with no schedule at all (shouldn't
    // happen in practice - every group requires a schedulePattern) - same permissive floor the old
    // calendar-day version used, so a brand new group immediately shows day 1 content
    if (todayUTC < startUTC || scheduleDays.length === 0) return 1

    let count = 0
    const cursor = new Date(startUTC)
    while (cursor <= todayUTC) {
        if (scheduleDays.includes(cursor.getUTCDay())) {
            count++
            if (count >= durationDays) return durationDays
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return Math.max(1, count)
}

// the real calendar date of the Nth scheduled lesson counting from startDate (n=1 is the group's
// very first class) - walks forward day by day. Returns null if the group has no schedule days at
// all (shouldn't happen - schedulePattern is required - but guards the loop below regardless).
export const dateOfNthLessonDay = (group, n) => {
    const scheduleDays = getScheduleDays(group)
    if (scheduleDays.length === 0 || n < 1) return null
    const cursor = startOfUTCDay(group.startDate)
    let count = 0
    // hard safety cap so a pathological input can never spin forever - at minimum 1 scheduled
    // day/week, n lessons needs at most n*7 calendar days to occur
    const maxIterations = n * 7 + 14
    for (let i = 0; i < maxIterations; i++) {
        if (scheduleDays.includes(cursor.getUTCDay())) {
            count++
            if (count === n) return new Date(cursor)
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    return null
}

// true only once a full day has elapsed PAST the level's last scheduled lesson - group promotion
// waits for this (not for dayCounter alone, which caps AT durationDays and stays there forever) so
// a student gets the entire day of their final lesson to finish homework and sit the exam before
// their group moves on without them.
export const isPastLevelEnd = (group, durationDays = 30) => {
    const lastLessonDate = dateOfNthLessonDay(group, durationDays)
    if (!lastLessonDate) return false
    const endOfLastLessonDayUTC = new Date(lastLessonDate)
    endOfLastLessonDayUTC.setUTCDate(endOfLastLessonDayUTC.getUTCDate() + 1)
    return new Date() >= endOfLastLessonDayUTC
}

// the admin/director "edit this group's current day" tool works by back-dating startDate so that
// TODAY computes out to the requested day - walks backward from today counting scheduled lesson
// days (today counts if it's itself scheduled) until `targetDay` of them have been found; that
// date becomes the new startDate. Schedule-aware counterpart of the old "just subtract N calendar
// days" math, which only worked back when every day was a lesson day.
export const startDateForTargetDayToday = (group, targetDay) => {
    const scheduleDays = getScheduleDays(group)
    const cursor = startOfUTCDay(new Date())
    if (scheduleDays.length === 0 || targetDay < 1) return cursor

    let count = 0
    const maxIterations = targetDay * 7 + 14
    for (let i = 0; i < maxIterations; i++) {
        if (scheduleDays.includes(cursor.getUTCDay())) {
            count++
            if (count === targetDay) return cursor
        }
        cursor.setUTCDate(cursor.getUTCDate() - 1)
    }
    return cursor
}

// Sunday is special-cased as a "review" day (see homeworkReview in studentController.js) UNLESS
// the group's own schedule already meets on Sundays (possible with a CUSTOM pattern), in which
// case Sunday is just a normal lesson day like any other and this is false.
export const isReviewDay = (group, date = new Date()) => {
    const dow = startOfUTCDay(date).getUTCDay()
    if (dow !== 0) return false
    return !getScheduleDays(group).includes(0)
}

// any weekday that isn't one of the group's scheduled lesson days, and isn't the special Sunday
// review case - a blank day with no homework at all.
export const isRestDay = (group, date = new Date()) => {
    const dow = startOfUTCDay(date).getUTCDay()
    if (getScheduleDays(group).includes(dow)) return false
    return !isReviewDay(group, date)
}
