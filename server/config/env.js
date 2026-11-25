// Startup checks: fail loudly on missing configuration instead of failing per request.
const REQUIRED = [
    'MONGODB_URI',
    'JWT_SECRET',
    'CLOUDINARY_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET',
]

const looksLikePlaceholder = (value) => /^--.*--$/.test(value.trim()) || /^(your|replace|xxx)/i.test(value.trim())

export const checkEnv = () => {
    const problems = []

    for (const key of REQUIRED) {
        const value = process.env[key]
        if (!value) problems.push(`${key} is missing`)
        else if (looksLikePlaceholder(value)) problems.push(`${key} still contains a placeholder value`)
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        problems.push('JWT_SECRET is shorter than 32 characters; use a long random secret')
    }

    if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URLS) {
        problems.push('CLIENT_URLS is not set; browsers will be blocked by CORS')
    }

    for (const p of problems) console.warn(`[config] ${p}`)
    return problems
}
