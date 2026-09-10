// Shared week/month/year bucketing for Shanti trend charts (dashboard income/expense, finance
// receipts) - one definition of "what does 'this week/month/year' mean and how do we key a date
// into it" so every chart on the same period toggle lines up exactly.
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
const startOfYear = (d) => new Date(d.getFullYear(), 0, 1)

export const bucketConfig = (period) => {
    const now = new Date()
    if (period === 'week') {
        const days = []
        for (let i = 6; i >= 0; i--) { const d = startOfDay(now); d.setDate(d.getDate() - i); days.push(d) }
        return {
            start: days[0], end: new Date(startOfDay(now).getTime() + 24 * 60 * 60 * 1000),
            keys: days.map(d => d.toISOString().slice(0, 10)),
            keyFn: (d) => startOfDay(d).toISOString().slice(0, 10),
        }
    }
    if (period === 'year') {
        const keys = Array.from({ length: 12 }, (_, i) => `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`)
        return {
            start: startOfYear(now), end: new Date(now.getFullYear() + 1, 0, 1), keys,
            keyFn: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        }
    }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const keys = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'))
    return {
        start: startOfMonth(now), end: new Date(now.getFullYear(), now.getMonth() + 1, 1), keys,
        keyFn: (d) => String(d.getDate()).padStart(2, '0'),
    }
}
