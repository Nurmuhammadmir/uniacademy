// Asia/Tashkent is UTC+5 year-round (no DST) - this offset is only for interpreting a human-typed
// 'YYYY-MM-DD' date-range filter (Finance/Salary) as the ADMIN's own wall-clock day, not a UTC
// calendar day. Everywhere else in this codebase (lesson generation, teacher check-in truncation,
// billing month boundaries) deliberately stays pure-UTC because both the write side and the read
// side agree on that convention already - mixing timezones there would break that self-consistency.
// This is specifically for filters where the human means "today" in their own timezone.
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000

export const startOfLocalDay = (dateStr) => new Date(new Date(dateStr + 'T00:00:00.000Z').getTime() - TZ_OFFSET_MS)

export const endOfLocalDay = (dateStr) => new Date(startOfLocalDay(dateStr).getTime() + 24 * 60 * 60 * 1000 - 1)
