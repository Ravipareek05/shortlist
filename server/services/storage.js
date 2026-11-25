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

// PDFs are stored as "raw" files: Cloudinary blocks delivery of PDFs uploaded as images on
// many accounts, which made resume links fail.
export const uploadResume = (buffer) => upload(buffer, {
    resource_type: 'raw',
    folder: 'shortlist/resumes',
    public_id: `resume-${crypto.randomUUID()}.pdf`,
})

export const uploadLogo = (buffer) => upload(buffer, {
    resource_type: 'image',
    folder: 'shortlist/logos',
    allowed_formats: ['png', 'jpg', 'jpeg', 'webp'],
})
