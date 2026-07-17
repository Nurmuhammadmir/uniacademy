// RULE #3 — group day counter over the level's own duration (director-configurable per level via
// Level.durationDays, no longer a fixed 30). No rest days - every day carries homework.
export const computeDayCounter = (startDate, durationDays = 30) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1
    if (diffDays < 1) return 1
    if (diffDays > durationDays) return durationDays
    return diffDays
}

// true only once a full day has elapsed PAST the level's last day - group promotion waits for
// this (not for dayCounter alone, which caps AT durationDays and stays there forever) so a student
// gets the entire final day to finish homework and sit the exam before their group moves on
// without them. e.g. a 30-day level promotes on day 31, not the moment day 30 begins.
export const isPastLevelEnd = (startDate, durationDays = 30) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1
    return diffDays > durationDays
}

// Rest days were removed - every one of the 30 days in a level carries homework now.
// Kept as a function (always false) so existing imports/callers keep working unchanged.
export const isRestDay = () => false
