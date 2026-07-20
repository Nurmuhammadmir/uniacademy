// "today" for a date picker's default value needs to mean the branch's own local day (Asia/Tashkent,
// UTC+5), not the browser's timezone and NOT `new Date().toISOString()` (which always renders the
// UTC calendar date). Those two disagree for part of every day - anywhere from 19:00 to 23:59 UTC is
// already "tomorrow" in Tashkent, so a naive UTC default silently shows yesterday for hours at a time.
// en-CA is the standard trick for getting Intl.DateTimeFormat to output YYYY-MM-DD.
export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())

export const currentMonthISO = () => todayISO().slice(0, 7)
