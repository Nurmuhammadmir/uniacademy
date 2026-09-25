import Language from "../models/Language.js"

// A course's `code` is only ever an internal unique identifier - nobody should have to type it. It's
// derived from the course name (accents stripped, lowercase, non-alphanumerics collapsed to dashes) and
// made unique with a numeric suffix when another course already owns it.
const slugify = (name) => String(name || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40)

export const generateLanguageCode = async (name, skip = 0) => {
    const base = slugify(name) || 'course'
    let n = 1 + skip
    for (;;) {
        const code = n === 1 ? base : `${base}-${n}`
        if (!(await Language.exists({ code }))) return code
        n++
    }
}
