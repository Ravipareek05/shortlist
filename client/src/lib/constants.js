// Mirrors server/utils/constants.js
export const JOB_CATEGORIES = ['Programming', 'Data Science', 'Designing', 'Networking', 'Management', 'Marketing', 'Cybersecurity']

export const JOB_LOCATIONS = ['Bangalore', 'Washington', 'Hyderabad', 'Mumbai', 'California', 'Chennai', 'New York']

export const JOB_LEVELS = ['Beginner level', 'Intermediate level', 'Senior level']

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary']

export const APPLICATION_STATUSES = ['Pending', 'Accepted', 'Rejected']

export const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'salary_desc', label: 'Highest salary' },
    { value: 'salary_asc', label: 'Lowest salary' },
]

export const LEVEL_LABELS = {
    'Beginner level': 'Entry level',
    'Intermediate level': 'Mid level',
    'Senior level': 'Senior',
}

export const UPLOAD_LIMITS = {
    resumeMB: 4,
    logoMB: 2,
}
