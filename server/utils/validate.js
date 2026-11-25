import mongoose from 'mongoose'
import { badRequest } from './httpError.js'

// Small, dependency-free validators. Each returns the cleaned value or throws a 400.
// Every field is type-checked so objects like { "$gt": "" } can never reach a Mongo query.

export const isObjectId = (value) => typeof value === 'string' && mongoose.isValidObjectId(value) && /^[a-f0-9]{24}$/i.test(value)

export const objectId = (value, field = 'id') => {
    if (!isObjectId(value)) throw badRequest(`Invalid ${field}`)
    return value
}

export const text = (value, { field, min = 0, max = 200, required = true } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (required) throw badRequest(`${field} is required`)
        return undefined
    }
    if (typeof value !== 'string') throw badRequest(`${field} must be text`)
    const trimmed = value.trim()
    if (required && trimmed.length === 0) throw badRequest(`${field} is required`)
    if (trimmed.length < min) throw badRequest(`${field} must be at least ${min} characters`)
    if (trimmed.length > max) throw badRequest(`${field} must be at most ${max} characters`)
    return trimmed
}

export const oneOf = (value, allowed, { field, required = true } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (required) throw badRequest(`${field} is required`)
        return undefined
    }
    if (typeof value !== 'string' || !allowed.includes(value)) {
        throw badRequest(`${field} must be one of: ${allowed.join(', ')}`)
    }
    return value
}

export const number = (value, { field, min = 0, max = Number.MAX_SAFE_INTEGER, required = true, integer = false } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (required) throw badRequest(`${field} is required`)
        return undefined
    }
    if (typeof value !== 'number' && typeof value !== 'string') throw badRequest(`${field} must be a number`)
    const n = Number(value)
    if (!Number.isFinite(n)) throw badRequest(`${field} must be a number`)
    if (integer && !Number.isInteger(n)) throw badRequest(`${field} must be a whole number`)
    if (n < min || n > max) throw badRequest(`${field} must be between ${min} and ${max}`)
    return n
}

export const boolean = (value, { field, required = false } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (required) throw badRequest(`${field} is required`)
        return undefined
    }
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    throw badRequest(`${field} must be true or false`)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const email = (value, { field = 'Email' } = {}) => {
    const v = text(value, { field, max: 254 })
    if (!EMAIL_RE.test(v)) throw badRequest('Enter a valid email address')
    return v.toLowerCase()
}

export const password = (value, { field = 'Password', min = 8 } = {}) => {
    if (typeof value !== 'string' || value.length === 0) throw badRequest(`${field} is required`)
    if (value.length < min) throw badRequest(`${field} must be at least ${min} characters`)
    // bcrypt only uses the first 72 bytes
    if (Buffer.byteLength(value, 'utf8') > 72) throw badRequest(`${field} is too long`)
    return value
}

export const url = (value, { field = 'Website', required = false } = {}) => {
    const v = text(value, { field, max: 300, required })
    if (v === undefined) return undefined
    let parsed
    try {
        parsed = new URL(v)
    } catch {
        throw badRequest(`${field} must be a valid URL starting with https://`)
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw badRequest(`${field} must start with http:// or https://`)
    return parsed.toString()
}

// Comma-separated or repeated query params -> array of allowed strings
export const listParam = (value, allowed) => {
    if (value === undefined || value === null || value === '') return []
    const raw = Array.isArray(value) ? value : String(value).split(',')
    const cleaned = raw.map((v) => String(v).trim()).filter(Boolean)
    return allowed ? cleaned.filter((v) => allowed.includes(v)) : cleaned.slice(0, 20)
}

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const pagination = (query, { defaultLimit = 12, maxLimit = 50 } = {}) => {
    const page = Math.max(1, Math.min(10000, parseInt(query.page, 10) || 1))
    const limit = Math.max(1, Math.min(maxLimit, parseInt(query.limit, 10) || defaultLimit))
    return { page, limit, skip: (page - 1) * limit }
}

export const paginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
})
