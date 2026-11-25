import User from '../models/User.js'

// Normalizes both Clerk webhook payloads (snake_case) and Clerk Backend API users (camelCase).
export const normalizeClerkUser = (data) => {
    const emails = data.email_addresses ?? data.emailAddresses ?? []
    const primaryId = data.primary_email_address_id ?? data.primaryEmailAddressId
    const primary = emails.find((e) => e.id === primaryId) ?? emails[0]
    const email = primary?.email_address ?? primary?.emailAddress ?? ''

    const first = data.first_name ?? data.firstName ?? ''
    const last = data.last_name ?? data.lastName ?? ''
    const username = data.username ?? ''
    const name = [first, last].filter(Boolean).join(' ').trim()
        || username
        || (email ? email.split('@')[0] : '')
        || 'Candidate'

    return {
        id: data.id,
        email: email.toLowerCase(),
        name,
        image: data.image_url ?? data.imageUrl ?? '',
    }
}

// Creates or updates the user from Clerk data. Never touches role, status or resume.
export const upsertUserFromClerk = async (data) => {
    const u = normalizeClerkUser(data)
    if (!u.id || !u.email) return null

    return User.findByIdAndUpdate(
        u.id,
        {
            $set: { name: u.name, email: u.email, image: u.image || 'https://img.clerk.com/preview.png' },
            $setOnInsert: { resume: '' },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )
}
