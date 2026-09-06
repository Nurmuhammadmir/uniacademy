export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())

export const firstOfMonthISO = () => todayISO().slice(0, 8) + '01'

export const formatDateTime = (date) => date ? new Date(date).toLocaleString('ru', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
