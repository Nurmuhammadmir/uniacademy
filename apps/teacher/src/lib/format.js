// concept images are stored as backend-relative paths (e.g. /static/images/concepts/apple.png) so
// the database isn't coupled to a specific host/port - the frontend resolves them against the
// actual backend origin at render time. Already-absolute URLs (http/https) pass through untouched.
export const resolveImageUrl = (path, backendUrl) => {
    if (!path) return path
    if (/^https?:\/\//.test(path)) return path
    return `${backendUrl}${path}`
}

// same comma-thousands formatting as the admin/director apps' own formatMoney (see
// apps/director/src/lib/format.js) - kept as its own small copy here rather than a shared package
// since this app has no cross-app import boundary today, and it's the one place a teacher-facing
// page needs to render a money figure (a student's owed balance, see GroupRoster.jsx)
export const formatMoney = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '—'
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
