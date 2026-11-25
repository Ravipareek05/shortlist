import { Webhook } from "svix";
import User from "../models/User.js";
import SavedJob from "../models/SavedJob.js";
import { upsertUserFromClerk } from "../services/userSync.js";

// Verifies against the exact bytes Clerk signed. express.raw() gives us a Buffer;
// the fallbacks keep it working if a platform pre-parses the body.
const rawPayload = (body) => {
    if (Buffer.isBuffer(body)) return body.toString('utf8')
    if (typeof body === 'string') return body
    return JSON.stringify(body ?? {})
}

export const verifyClerkWebhook = (payload, headers) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) throw new Error('CLERK_WEBHOOK_SECRET is not configured')
    return new Webhook(secret).verify(payload, headers)
}

// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
    const verify = req.app.locals.verifyWebhook ?? verifyClerkWebhook

    let event
    try {
        event = verify(rawPayload(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' })
    }

    const { data, type } = event ?? {}

    try {
        switch (type) {
            case 'user.created':
            case 'user.updated': {
                await upsertUserFromClerk(data)
                return res.json({ success: true })
            }

            case 'user.deleted': {
                if (data?.id) {
                    await User.findByIdAndDelete(data.id)
                    await SavedJob.deleteMany({ userId: data.id })
                }
                return res.json({ success: true })
            }

            default:
                // Acknowledge events we don't handle so Clerk doesn't keep retrying
                return res.json({ success: true, ignored: type ?? 'unknown' })
        }
    } catch (error) {
        console.error('Webhook processing failed:', error)
        return res.status(500).json({ success: false, message: 'Webhook processing failed' })
    }
}
