// Asia/Tashkent is UTC+5 year-round (no DST) - this offset is only for interpreting a human-typed
// 'YYYY-MM-DD' date-range filter (Finance/Salary) as the ADMIN's own wall-clock day, not a UTC
// calendar day. Everywhere else in this codebase (lesson generation, teacher check-in truncation,
// billing month boundaries) deliberately stays pure-UTC because both the write side and the read
// side agree on that convention already - mixing timezones there would break that self-consistency.
// This is specifically for filters where the human means "today" in their own timezone.
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000

export const startOfLocalDay = (dateStr) => new Date(new Date(dateStr + 'T00:00:00.000Z').getTime() - TZ_OFFSET_MS)

export const endOfLocalDay = (dateStr) => new Date(startOfLocalDay(dateStr).getTime() + 24 * 60 * 60 * 1000 - 1)

// "today" as a 'YYYY-MM-DD' string in the admin's own wall-clock day (Asia/Tashkent), for the same
// "today" a human means when they say "today's expense" - not the UTC calendar date, which can
// already be tomorrow in Tashkent for several hours each evening
export const todayLocalISO = () => new Date(Date.now() + TZ_OFFSET_MS).toISOString().slice(0, 10)

// confirmed spec: a financial record (payment or expense) can only be edited/deleted/refunded on
// the same business-local calendar day it's dated for - once that day has passed, it's locked as
// permanent history, so a branch's daily cash position can never quietly change after the fact.
// Shared by expenseController and adminController's payment endpoints so this rule can't drift
// between the two. Keyed off the record's own `date` field (when it happened), not `createdAt`
// (when someone typed it in) - those can differ if it's logged for an earlier time the same day,
// but never differ once a whole day has actually rolled over.
export const isEditableToday = (record) => {
    const today = todayLocalISO()
    return record.date >= startOfLocalDay(today) && record.date <= endOfLocalDay(today)
}
