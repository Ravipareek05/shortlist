import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Company from '../models/Company.js'
import User from '../models/User.js'
import { asyncHandler, forbidden, HttpError, unauthorized } from '../utils/httpError.js'
import { upsertUserFromClerk } from '../services/userSync.js'

// ---------- Recruiters (custom JWT) ----------

// Protect company routes: verifies signature + expiry, loads the company, blocks suspended accounts.
export const protectCompany = asyncHandler(async (req, res, next) => {
    const token = req.headers.token

    if (!token || typeof token !== 'string') {
        throw unauthorized('Not authorized, please log in again')
    }

    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    } catch (error) {
        throw unauthorized(error.name === 'TokenExpiredError'
            ? 'Your session has expired. Please log in again.'
            : 'Invalid session. Please log in again.')
    }

    if (!decoded?.id || !mongoose.isValidObjectId(decoded.id)) {
        throw unauthorized('Invalid session. Please log in again.')
    }

    const company = await Company.findById(decoded.id)

    if (!company) {
        throw unauthorized('Account not found. Please log in again.')
    }

    if (company.status === 'suspended') {
        throw forbidden('This recruiter account has been suspended. Contact support for help.')
    }

    req.company = company
    next()
})

// ---------- Job seekers & admins (Clerk) ----------

// Loads the signed-in Clerk user's database record. If the Clerk webhook never created it
// (e.g. webhook misconfigured), the record is created on demand from Clerk's API.
export const requireUser = asyncHandler(async (req, res, next) => {
    const userId = req.authUserId

    if (!userId) {
        throw unauthorized('Please sign in to continue')
    }

    let user = await User.findById(userId)

    if (!user) {
        const loadClerkUser = req.app.locals.loadClerkUser
        const clerkUser = loadClerkUser ? await loadClerkUser(userId).catch(() => null) : null
        if (clerkUser) {
            user = await upsertUserFromClerk(clerkUser)
        }
    }

    if (!user) {
        throw new HttpError(404, 'We could not find your profile. Please sign out and sign in again.')
    }

    req.user = user
    next()
})

// Blocks suspended accounts from making changes (they can still read their own profile).
export const requireActiveUser = (req, res, next) => {
    if (req.user?.status === 'suspended') {
        return next(forbidden('Your account has been suspended. Contact support for help.'))
    }
    next()
}

// Server-side admin check. Role comes only from the database and can only be granted by the
// provisioning script (scripts/admin.js); no API endpoint can change it.
export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return next(forbidden('Admin access required'))
    }
    if (req.user.status === 'suspended') {
        return next(forbidden('Your account has been suspended'))
    }
    next()
}
