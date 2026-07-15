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

// keep the whole file in memory, then write it ourselves once we know the intended name
export const uploadMiddleware = multer({
    storage: multer.memoryStorage(),
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
// either by ?name= (slugified, tried against common extensions - used for vocab words) or by an
// exact ?filename= (used for reading images pasted in via JSON, which name the file explicitly).
// Returns { path: null } rather than 404 when nothing matches - "not found yet" is a normal state
// while the director is still typing/pasting, not an error.
export const resolveImage = async (req, res) => {
    try {
        const kind = req.params.kind === 'reading' ? 'reading' : 'vocab'
        const dir = path.join(PUBLIC_ROOT, kind)
        if (!fs.existsSync(dir)) return res.json({ path: null })

        if (req.query.filename) {
            const filename = path.basename(String(req.query.filename)) // strip any path traversal
            const exists = fs.existsSync(path.join(dir, filename))
            return res.json({ path: exists ? `/static/images/${kind}/${filename}` : null })
        }

        const name = slugify(req.query.name)
        if (!name) return res.json({ path: null })
        const match = fs.readdirSync(dir).find(f => path.parse(f).name.toLowerCase() === name)
        res.json({ path: match ? `/static/images/${kind}/${match}` : null })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const uploadImage = async (req, res) => {
    try {
        const kind = req.params.kind === 'reading' ? 'reading' : 'vocab'
        const name = slugify(req.query.name || req.body?.name)
        if (!name) return res.status(400).json({ error: 'missing_name' })
        if (!req.file) return res.status(400).json({ error: 'no_file' })

        const dir = path.join(PUBLIC_ROOT, kind)
        fs.mkdirSync(dir, { recursive: true })

        const ext = extFor(req.file.mimetype, req.file.originalname)
        const filename = `${name}.${ext}`
        fs.writeFileSync(path.join(dir, filename), req.file.buffer)

        // the path the frontends load directly as <img src> (served by server.js at /static)
        res.json({ path: `/static/images/${kind}/${filename}` })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}
