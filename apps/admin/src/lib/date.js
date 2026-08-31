// "today" for a date picker's default value needs to mean the branch's own local day (Asia/Tashkent,
// UTC+5), not the browser's timezone and NOT `new Date().toISOString()` (which always renders the
// UTC calendar date). Those two disagree for part of every day - anywhere from 19:00 to 23:59 UTC is
// already "tomorrow" in Tashkent, so a naive UTC default silently shows yesterday for hours at a time.
// en-CA is the standard trick for getting Intl.DateTimeFormat to output YYYY-MM-DD.
export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())

export const firstOfMonthISO = () => todayISO().slice(0, 8) + '01'

export const currentMonthISO = () => todayISO().slice(0, 7)

// last calendar day of a 'YYYY-MM' month string, as 'YYYY-MM-DD' - day 0 of "next month" is always
// the last day of the target month, a plain-JS trick that avoids hardcoding month lengths/leap years
export const lastDayOfMonthISO = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number)
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return `${monthStr}-${String(last).padStart(2, '0')}`
}

// a billing period's periodStart/periodEnd are UTC calendar-date markers (e.g. "the last day of
// August"), but the server stores periodEnd at 23:59:59.999 UTC - plain `.toLocaleDateString()`
// renders that in the BROWSER's own timezone, so anyone west of UTC (Tashkent is UTC+5) sees it
// silently roll over to the 1st of the next month. This forces the same Intl formatter to read the
// date's UTC calendar fields instead of converting to local time first.
export const formatUTCDate = (date) => new Intl.DateTimeFormat(undefined, { timeZone: 'UTC' }).format(new Date(date))

// date + hours:minutes, browser locale - for a real financial operation (payment, expense,
// discount, ledger entry), not a billing-period marker. A branch doing real daily volume easily
// records more than one of these on the same calendar day, so the date alone can't tell them apart.
export const formatDateTime = (date) => date ? new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'
