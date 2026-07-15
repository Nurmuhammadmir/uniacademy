// RULE #3 — group day counter, Sundays count but return as rest days
export const computeDayCounter = (startDate) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1
    if (diffDays < 1) return 1
    if (diffDays > 30) return 30
    return diffDays
}

export const isRestDay = (startDate, dayNumber) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + (dayNumber - 1))
    return date.getDay() === 0
}
