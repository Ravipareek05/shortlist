import { UPLOAD_LIMITS } from './constants'

// Client-side checks for fast feedback. The API repeats all of them (including file signatures).

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export const validateLogo = (file, { required = true } = {}) => {
    if (!file) return required ? 'Upload your company logo' : null
    if (!IMAGE_TYPES.includes(file.type)) return 'Logo must be a PNG, JPG or WebP image'
    if (file.size > UPLOAD_LIMITS.logoMB * 1024 * 1024) return `Logo must be smaller than ${UPLOAD_LIMITS.logoMB} MB`
    return null
}

export const validateResume = (file) => {
    if (!file) return 'Choose a PDF file'
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return 'Resume must be a PDF file'
    if (file.size > UPLOAD_LIMITS.resumeMB * 1024 * 1024) return `Resume must be smaller than ${UPLOAD_LIMITS.resumeMB} MB`
    return null
}

export const validateUrl = (value) => {
    if (!value) return null
    try {
        const u = new URL(value)
        return ['http:', 'https:'].includes(u.protocol) ? null : 'Use a link starting with https://'
    } catch {
        return 'Enter a full URL, e.g. https://example.com'
    }
}
