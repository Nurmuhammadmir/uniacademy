export const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())

export const firstOfMonthISO = () => todayISO().slice(0, 8) + '01'

export const formatDateTime = (date) => date ? new Date(date).toLocaleString('ru', { dateStyle: 'medium' }) : '—'

// plain DD.MM.YYYY - used where a fixed, locale-independent short date reads better than
// formatDateTime's "medium" style (e.g. the Акт сверки PDF/table, printed documents)
export const formatDateShort = (date) => {
    if (!date) return '—'
    const d = new Date(date)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}
