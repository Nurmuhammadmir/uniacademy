// Image upload for the homework builder. Photos are stored ON DISK in server/public/images/<kind>
// (kind = vocab | reading), which server.js already serves at /static - no Cloudinary, no Mongo blob.
// Files are named after the word/name the director types, lowercased with spaces -> hyphens, so the
// student app resolves them predictably (e.g. "Market Stall" -> /static/images/vocab/market-stall.png).
import multer from "multer"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_ROOT = path.join(__dirname, "..", "public", "images")

// stream straight to disk instead of buffering the whole file in RAM (multer.memoryStorage()
// would hold every concurrent upload's full bytes - up to fileSize each - in the Node heap until
// the handler below finishes writing it out; diskStorage lets the OS do that copy instead, so RAM
// use per upload stays tiny regardless of how many directors are uploading photos at once). Written
// under a throwaway name first since the real, slugified filename isn't known until uploadImage
// below reads req.query.name - it renames this temp file into place once it does.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const kind = req.params.kind === 'reading' ? 'reading' : 'vocab'
        const dir = path.join(PUBLIC_ROOT, kind)
        fs.mkdirSync(dir, { recursive: true })
        cb(null, dir)
    },
    filename: (req, file, cb) => cb(null, `__tmp-${Date.now()}-${Math.round(Math.random() * 1e9)}`),
})

export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is plenty for a vocab picture
    fileFilter: (req, file, cb) => {
        if (/^image\//.test(file.mimetype)) cb(null, true)
        else cb(new Error('not_an_image'))
    },
}).single('image')

const slugify = (name) => String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const extFor = (mimetype, originalname) => {
    const fromName = path.extname(originalname || '').toLowerCase().replace('.', '')
    if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName
    if (mimetype === 'image/png') return 'png'
    if (mimetype === 'image/jpeg') return 'jpg'
    if (mimetype === 'image/webp') return 'webp'
    return 'png'
}

// looks for a photo the director already dropped into server/public/images/<kind> by hand, matched
// by a slugified word against common extensions. Pure/sync so it can be called directly from other
// controllers (e.g. the vocab word-bank filler) as well as from the resolveImage HTTP handler below.
// Returns '' rather than throwing when nothing matches - "not found yet" is a normal state while
// the director is still typing/pasting, not an error.
//
// Falls back to the word with any trailing "(...)" annotation stripped - an irregular-plural entry
// like "mouse (mice)" slugifies to "mouse-mice" on the first pass, but the actual photo on disk is
// almost always just named after the depictable base word ("mouse.png"), never the whole annotation.
//
// The on-disk filename is slugified before comparing too, not just the search term - a director
// who drops in a file literally named "deer (deer).png" (mirroring the word exactly, unslugified)
// must still match "deer (deer)" the word - comparing the slugified search term against the RAW
// filename would never match since "deer-deer" !== "deer (deer)".
export const findImageByName = (kind, name) => {
    const dir = path.join(PUBLIC_ROOT, kind === 'reading' ? 'reading' : 'vocab')
    if (!fs.existsSync(dir)) return ''
    const slug = slugify(name)
    if (!slug) return ''
    const files = fs.readdirSync(dir)
    const tryMatch = (s) => files.find(f => slugify(path.parse(f).name) === s)

    let match = tryMatch(slug)
    if (!match) {
        const baseWord = String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim()
        const baseSlug = slugify(baseWord)
        if (baseSlug && baseSlug !== slug) match = tryMatch(baseSlug)
    }
    return match ? `/static/images/${kind}/${match}` : ''
}

// filename lookup (used for reading images, which are named explicitly rather than derived from a
// word) - also pure/sync so contentController's reading bank can resolve server-side. Matched
// case-insensitively (like findImageByName) since directors and the JSON they paste often disagree
// with the actual on-disk casing (e.g. "Bees.png" vs "bees.png") on case-sensitive Linux hosts, and
// trimmed since a stray leading/trailing space (easy to pick up pasting out of JSON, or typing on
// mobile) would otherwise silently fail to match an on-disk filename that has none. Falls back to a
// bare-name match (no extension needed) when there's no exact filename hit - directors very
// naturally type just "giraffe" the same way they do for vocab words, not "giraffe.png", and that
// must still find giraffe.png sitting on disk instead of reporting no match.
export const findImageByFilename = (kind, filename) => {
    const dir = path.join(PUBLIC_ROOT, kind === 'reading' ? 'reading' : 'vocab')
    if (!fs.existsSync(dir)) return ''
    const safeFilename = path.basename(String(filename).trim()).toLowerCase() // strip any path traversal
    if (!safeFilename) return ''
    const files = fs.readdirSync(dir)
    const exact = files.find(f => f.toLowerCase() === safeFilename)
    if (exact) return `/static/images/${kind}/${exact}`
    const bareName = path.parse(safeFilename).name
    const byBareName = files.find(f => path.parse(f).name.toLowerCase() === bareName)
    return byBareName ? `/static/images/${kind}/${byBareName}` : ''
}

// HTTP wrapper for the builder UI - ?name= (vocab words) or ?filename= (reading, named explicitly)
export const resolveImage = async (req, res) => {
    try {
        const kind = req.params.kind === 'reading' ? 'reading' : 'vocab'
        const found = req.query.filename ? findImageByFilename(kind, req.query.filename) : findImageByName(kind, req.query.name)
        res.json({ path: found || null })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const uploadImage = async (req, res) => {
    try {
        const kind = req.params.kind === 'reading' ? 'reading' : 'vocab'
        const name = slugify(req.query.name || req.body?.name)
        if (!name) {
            if (req.file) fs.unlink(req.file.path, () => {}) // clean up the temp file multer already wrote
            return res.status(400).json({ error: 'missing_name' })
        }
        if (!req.file) return res.status(400).json({ error: 'no_file' })

        const dir = path.join(PUBLIC_ROOT, kind)

        // remove any existing file(s) for this same word FIRST, regardless of their extension -
        // otherwise "changing the photo" to a different format (e.g. replacing a .jpg with a .png)
        // leaves the old file sitting on disk too, and findImageByName's directory scan can end up
        // resolving back to whichever one it lists first, silently undoing the change. Excludes the
        // just-uploaded temp file itself, which also lives in this same directory.
        const existing = fs.readdirSync(dir).filter(f => f !== path.basename(req.file.path) && slugify(path.parse(f).name) === name)
        existing.forEach(f => fs.unlinkSync(path.join(dir, f)))

        const ext = extFor(req.file.mimetype, req.file.originalname)
        const filename = `${name}.${ext}`
        fs.renameSync(req.file.path, path.join(dir, filename))

        // static assets are served with a 7-day cache (server.js), so re-uploading a REPLACEMENT
        // photo under the exact same filename would otherwise keep showing the old cached bytes in
        // every browser that already loaded it. A cache-busting query string forces a fresh fetch
        // without touching the actual cache policy - this exact path (with the query string) is
        // what gets stored as the concept's `image` and used as the <img src> everywhere.
        const servedPath = `/static/images/${kind}/${filename}?v=${Date.now()}`
        res.json({ path: servedPath })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
