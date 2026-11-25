import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import * as Sentry from '@sentry/node'
import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express'
import connectDB from './config/db.js'
import { sentryEnabled } from './config/instrument.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import { createCompanyRouter } from './routes/companyRoutes.js'
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { asyncHandler } from './utils/httpError.js'

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173']

// CLIENT_URLS: comma-separated origins. A "*" inside an entry matches one subdomain label,
// e.g. https://shortlist-*-myteam.vercel.app for preview deployments.
export const buildOriginMatcher = (value = process.env.CLIENT_URLS, env = process.env.NODE_ENV) => {
    const entries = (value || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean)
    if (entries.length === 0 && env !== 'production') entries.push(...DEV_ORIGINS)

    const matchers = entries.map((entry) => {
        if (!entry.includes('*')) return (origin) => origin === entry
        const pattern = '^' + entry.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]+') + '$'
        const re = new RegExp(pattern, 'i')
        return (origin) => re.test(origin)
    })

    return (origin) => matchers.some((m) => m(origin))
}

const limiter = (limit, windowMs, message) => rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ success: false, message }),
})

const defaultGetUserId = (req) => {
    try {
        return getAuth(req)?.userId ?? null
    } catch {
        return null
    }
}

/**
 * Builds the Express app. Options exist so tests can replace external services:
 *  - getUserId(req): resolves the signed-in Clerk user id
 *  - useClerk: mount Clerk's middleware (default true)
 *  - loadClerkUser(id): fetches a Clerk user when the DB record is missing
 *  - verifyWebhook(payload, headers): verifies Clerk webhooks
 *  - ensureDb(): connects to MongoDB
 *  - rateLimits: { login, register } max requests per window
 */
export const createApp = (options = {}) => {
    const {
        getUserId = defaultGetUserId,
        useClerk = true,
        loadClerkUser = (id) => clerkClient.users.getUser(id),
        verifyWebhook,
        ensureDb = () => connectDB(),
        rateLimits = {},
    } = options

    const app = express()

    app.locals.loadClerkUser = loadClerkUser
    if (verifyWebhook) app.locals.verifyWebhook = verifyWebhook

    app.disable('x-powered-by')
    app.set('trust proxy', 1)

    // Secure headers (JSON API: allow cross-origin reads, no framing)
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

    const isAllowedOrigin = buildOriginMatcher()
    app.use(cors({
        origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'token'],
        maxAge: 600,
    }))

    const dbReady = asyncHandler(async (req, res, next) => {
        await ensureDb()
        next()
    })

    // Health check
    app.get('/', (req, res) => res.send('Shortlist API is running'))
    app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }))

    // Clerk webhook needs the raw body for signature verification, so it is
    // registered before the JSON parser.
    app.post('/webhooks', express.raw({ type: '*/*', limit: '1mb' }), dbReady, asyncHandler(clerkWebhooks))

    app.use(express.json({ limit: '200kb' }))
    app.use(express.urlencoded({ extended: false, limit: '200kb' }))

    // Clerk session parsing only where a job-seeker/admin session is needed, so public
    // endpoints keep working (and stay fast) independently of Clerk.
    const clerkAuth = [
        ...(useClerk ? [clerkMiddleware()] : []),
        (req, res, next) => {
            req.authUserId = getUserId(req)
            next()
        },
    ]

    app.use('/api', dbReady)
    app.use('/api/users', clerkAuth)
    app.use('/api/admin', clerkAuth)

    const loginLimiter = limiter(rateLimits.login ?? 10, 15 * 60 * 1000, 'Too many login attempts. Please wait 15 minutes and try again.')
    const registerLimiter = limiter(rateLimits.register ?? 5, 60 * 60 * 1000, 'Too many sign-up attempts. Please try again later.')

    app.use('/api/company', createCompanyRouter({ loginLimiter, registerLimiter }))
    app.use('/api/jobs', jobRoutes)
    app.use('/api/users', userRoutes)
    app.use('/api/admin', adminRoutes)

    if (sentryEnabled) Sentry.setupExpressErrorHandler(app)

    app.use(notFoundHandler)
    app.use(errorHandler)

    return app
}

export default createApp
