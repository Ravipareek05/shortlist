// Shared enums. Values match what the original app already stored, so existing records stay valid.

export const JOB_CATEGORIES = [
    'Programming',
    'Data Science',
    'Designing',
    'Networking',
    'Management',
    'Marketing',
    'Cybersecurity',
]

export const JOB_LOCATIONS = [
    'Bangalore',
    'Washington',
    'Hyderabad',
    'Mumbai',
    'California',
    'Chennai',
    'New York',
]

export const JOB_LEVELS = ['Beginner level', 'Intermediate level', 'Senior level']

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary']

export const APPLICATION_STATUSES = ['Pending', 'Accepted', 'Rejected']

// Moderation states. Jobs without the field (pre-existing records) count as approved.
export const MODERATION_STATUSES = ['approved', 'pending', 'rejected', 'hidden']
export const NON_PUBLIC_MODERATION = ['pending', 'rejected', 'hidden']

export const ACCOUNT_STATUSES = ['active', 'suspended']

export const USER_ROLES = ['candidate', 'admin']

export const UPLOAD_LIMITS = {
    resumeBytes: 4 * 1024 * 1024, // stays under Vercel's 4.5 MB request body limit
    logoBytes: 2 * 1024 * 1024,
}
