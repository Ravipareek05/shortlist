import { v2 as cloudinary } from 'cloudinary'
import crypto from 'crypto'
import { HttpError } from '../utils/httpError.js'

const cloudinaryUpload = (buffer, options) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) reject(error)
        else resolve(result)
    })
    stream.end(buffer)
})

let uploader = cloudinaryUpload

// Test hook: lets the test suite replace Cloudinary with an in-memory stub.
export const setUploader = (fn) => { uploader = fn ?? cloudinaryUpload }

const upload = async (buffer, options) => {
    try {
        const result = await uploader(buffer, options)
        if (!result?.secure_url) throw new Error('Upload returned no URL')
        return result.secure_url
    } catch (error) {
        console.error('Cloudinary upload failed:', error?.message ?? error)
        throw new HttpError(502, 'We could not upload your file right now. Please try again.')
    }
}

// Resumes are stored as *private* raw files: they are never publicly deliverable.
// Access goes through resumeAccessUrl(), which issues short-lived signed links only
// after the API has checked who is asking.
export const uploadResume = (buffer) => upload(buffer, {
    resource_type: 'raw',
    type: 'private',
    folder: 'shortlist/resumes',
    public_id: `resume-${crypto.randomUUID()}.pdf`,
})

const RESUME_LINK_TTL_SECONDS = 10 * 60

// Parses a stored Cloudinary delivery URL, e.g.
//   https://res.cloudinary.com/<cloud>/raw/private/v123/shortlist/resumes/resume-x.pdf
//   https://res.cloudinary.com/<cloud>/image/upload/v123/abc.pdf   (resumes from the original app)
export const parseCloudinaryUrl = (url) => {
    let u
    try { u = new URL(url) } catch { return null }
    if (u.hostname !== 'res.cloudinary.com') return null
    const m = u.pathname.match(/^\/[^/]+\/(image|raw|video)\/(upload|private|authenticated)\/(?:v\d+\/)?(.+)$/)
    if (!m) return null
    const [, resourceType, type, rest] = m
    const path = decodeURIComponent(rest)
    // Raw public IDs include the extension; image/video IDs don't (the extension is the format)
    if (resourceType === 'raw') return { resourceType, type, publicId: path, format: '' }
    const dot = path.lastIndexOf('.')
    return { resourceType, type, publicId: dot > 0 ? path.slice(0, dot) : path, format: dot > 0 ? path.slice(dot + 1) : '' }
}

// Returns a short-lived signed link to a stored resume (or null if none).
// Non-Cloudinary values (e.g. local sandbox data URLs) are returned unchanged.
export const resumeAccessUrl = (storedUrl, { download = false } = {}) => {
    if (!storedUrl) return null
    const parsed = parseCloudinaryUrl(storedUrl)
    if (!parsed) return storedUrl
    return cloudinary.utils.private_download_url(parsed.publicId, parsed.format, {
        resource_type: parsed.resourceType,
        type: parsed.type,
        expires_at: Math.floor(Date.now() / 1000) + RESUME_LINK_TTL_SECONDS,
        attachment: download,
    })
}

export const uploadLogo = (buffer) => upload(buffer, {
    resource_type: 'image',
    folder: 'shortlist/logos',
    allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
})
