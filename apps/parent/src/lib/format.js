// space-separated thousands (500 000, 1 200 000) regardless of the browser's locale settings -
// .toLocaleString() without an explicit locale can render commas, dots, or nothing depending on
// the user's OS/browser, so this guarantees a consistent, easily-readable format everywhere money
// is shown across the app.
export const formatMoney = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
