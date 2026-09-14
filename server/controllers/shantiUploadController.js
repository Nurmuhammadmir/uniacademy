// Product photos for LasummaShanti's sales catalog - deliberately separate from
// uploadController.js's word-keyed vocab/reading uploader (that one looks up images BY NAME for the
// homework builder; a product photo is keyed by its own _id and just needs to survive a rename).
// Stored ON DISK under server/public/images/shanti-products, served by the same /static route
// server.js already exposes - no Mongo blob, no third-party image host.
//
// Every upload is resized down before it ever touches disk - confirmed real constraint: this VPS has
// ~1GB RAM and a mostly-full disk, so saving raw phone-camera photos (routinely 3-10MB each) was
// never an option. Uses jimp (pure JS, no native binary) rather than sharp - sharp's prebuilt binary
// needs x86-64-v2 CPU features this VPS's virtualized CPU doesn't have, which crash-looped the whole
// shared backend the one time it got installed on production (see git history). jimp is slower per
// image (no native SIMD), but resizing a single product photo is cheap regardless, and "works on any
// CPU" matters more than raw speed here. Known gap vs. the old sharp version: no EXIF-orientation
// auto-rotate, so a phone photo taken in certain portrait orientations can save sideways - jimp has
// no built-in equivalent to sharp's .rotate().
import multer from "multer"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import ShantiProduct from "../models/ShantiProduct.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PRODUCTS_DIR = path.join(__dirname, "..", "public", "images", "shanti-products")

// same reasoning as uploadController.js's own diskStorage: stream straight to a temp file on disk
// instead of multer.memoryStorage(), which would hold every concurrent upload's full original bytes
// in the Node heap until this handler finishes - diskStorage lets the OS do that copy instead.
const storage = multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(PRODUCTS_DIR, { recursive: true }); cb(null, PRODUCTS_DIR) },
    filename: (req, file, cb) => cb(null, `__tmp-${Date.now()}-${Math.round(Math.random() * 1e9)}`),
})

export const uploadProductPhotoMiddleware = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // the ORIGINAL upload can be up to 8MB - it's resized down to a few KB below, never stored at this size
    fileFilter: (req, file, cb) => {
        if (/^image\//.test(file.mimetype)) cb(null, true)
        else cb(new Error('not_an_image'))
    },
}).single('image')

export const uploadProductPhoto = async (req, res) => {
    let tempPath = req.file?.path
    try {
        const product = await ShantiProduct.findById(req.params.id)
        if (!product) return res.status(404).json({ error: 'not_found' })
        if (!req.file) return res.status(400).json({ error: 'no_file' })

        // fixed .jpg output regardless of the source format (png/webp/heic phone photos, whatever) -
        // one predictable filename per product means a re-upload just overwrites it, no old-extension
        // cleanup needed the way uploadController.js's name-keyed files require. mkdirSync here too
        // (not just in multer's own storage.destination) so this function doesn't depend on having
        // been reached via that exact middleware to work correctly.
        // loaded lazily, not as a top-level import - even a pure-JS image library is still a sizeable
        // dependency, and a future problem with it (like sharp's) must only ever fail THIS request,
        // never crash the entire shared backend process at boot for every app sharing it.
        const { Jimp } = await import("jimp")

        fs.mkdirSync(PRODUCTS_DIR, { recursive: true })
        const filename = `${product._id}.jpg`
        const finalPath = path.join(PRODUCTS_DIR, filename)
        const image = await Jimp.read(tempPath)
        if (image.width > 480) image.resize({ w: 480 }) // withoutEnlargement equivalent - never upscale a small source photo
        // getBuffer (not .write()) so the JPEG mime type is explicit rather than inferred from the
        // destination filename - the atomic-swap temp path below doesn't end in .jpg, which jimp's
        // extension-sniffing write() would otherwise choke on.
        const jpegBuffer = await image.getBuffer('image/jpeg', { quality: 72 })
        fs.writeFileSync(finalPath + '.new', jpegBuffer)
        fs.renameSync(finalPath + '.new', finalPath) // atomic swap - a request for the photo mid-write never sees a half-written file
        fs.unlink(tempPath, () => {})
        tempPath = null

        // cache-busting query string - static assets are served with a long cache header
        // (server.js), so overwriting the same filename would otherwise keep showing the old
        // cached bytes in a browser that already loaded this product's photo once
        product.imageUrl = `/static/images/shanti-products/${filename}?v=${Date.now()}`
        await product.save()
        res.json({ product })
    } catch (error) {
        if (tempPath) fs.unlink(tempPath, () => {})
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

export const deleteProductPhoto = async (req, res) => {
    try {
        const product = await ShantiProduct.findById(req.params.id)
        if (!product) return res.status(404).json({ error: 'not_found' })
        deleteProductPhotoFile(product._id)
        product.imageUrl = null
        await product.save()
        res.json({ product })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'server_error' })
    }
}

// shared with shantiSalesController.deleteProduct, so a permanently-removed product never leaves
// its photo orphaned on disk forever
export const deleteProductPhotoFile = (productId) => {
    const filePath = path.join(PRODUCTS_DIR, `${productId}.jpg`)
    fs.unlink(filePath, () => {}) // silently no-ops if this product never had a photo
}
