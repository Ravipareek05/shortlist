import multer from "multer";
import { UPLOAD_LIMITS } from "../utils/constants.js";
import { badRequest } from "../utils/httpError.js";

// Files are kept in memory and streamed to Cloudinary: nothing is written to disk,
// which also suits Vercel's read-only serverless filesystem.
const storage = multer.memoryStorage()

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp']

export const resumeUpload = multer({
    storage,
    limits: { fileSize: UPLOAD_LIMITS.resumeBytes, files: 1, fields: 10 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') return cb(badRequest('Resume must be a PDF file'))
        cb(null, true)
    },
})

export const logoUpload = multer({
    storage,
    limits: { fileSize: UPLOAD_LIMITS.logoBytes, files: 1, fields: 10 },
    fileFilter: (req, file, cb) => {
        if (!IMAGE_MIME.includes(file.mimetype)) return cb(badRequest('Logo must be a PNG, JPG or WebP image'))
        cb(null, true)
    },
})

// The browser-supplied MIME type can be spoofed, so also check the file signature.
const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b)

export const isPdfBuffer = (buf) => Buffer.isBuffer(buf) && buf.length > 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-'

export const isImageBuffer = (buf) => {
    if (!Buffer.isBuffer(buf) || buf.length < 12) return false
    const png = startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const jpeg = startsWith(buf, [0xff, 0xd8, 0xff])
    const webp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP'
    return png || jpeg || webp
}

export default resumeUpload
