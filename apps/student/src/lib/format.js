// space-separated thousands (500 000, 1 200 000) regardless of the browser's locale settings -
// .toLocaleString() without an explicit locale can render commas, dots, or nothing depending on
// the user's OS/browser, so this guarantees a consistent, easily-readable format everywhere money
// is shown across the app.
export const formatMoney = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// concept images are stored as backend-relative paths (e.g. /static/images/concepts/apple.png) so
// the database isn't coupled to a specific host/port - the frontend resolves them against the
// actual backend origin at render time. Already-absolute URLs (http/https) pass through untouched.
export const resolveImageUrl = (path, backendUrl) => {
    if (!path) return path
    if (/^https?:\/\//.test(path)) return path
    return `${backendUrl}${path}`
}
