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

// Rest days were removed - every one of the 30 days in a level carries homework now.
// Kept as a function (always false) so existing imports/callers keep working unchanged.
export const isRestDay = () => false
