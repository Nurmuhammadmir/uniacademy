// RULE #7 — sliding homework window: [dayCounter-2, dayCounter]
export const resolveDayStatus = (day, groupDayCounter) => {
    if (day > groupDayCounter) return 'locked'
    if (day < groupDayCounter - 2) return 'expired'
    return 'open'
}
