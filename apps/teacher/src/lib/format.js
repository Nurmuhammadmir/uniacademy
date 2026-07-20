// concept images are stored as backend-relative paths (e.g. /static/images/concepts/apple.png) so
// the database isn't coupled to a specific host/port - the frontend resolves them against the
// actual backend origin at render time. Already-absolute URLs (http/https) pass through untouched.
export const resolveImageUrl = (path, backendUrl) => {
    if (!path) return path
    if (/^https?:\/\//.test(path)) return path
    return `${backendUrl}${path}`
}
