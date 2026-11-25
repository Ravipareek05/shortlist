import axios from 'axios'

// Single API client. UI components call the functions below instead of using axios directly.
export const http = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    timeout: 30000,
})

// Auth is attached per request:
//  - job seekers/admins: a fresh Clerk session token (they are short-lived)
//  - recruiters: the JWT issued by /api/company/login
let getClerkToken = async () => null
let companyToken = null
let onRecruiterSessionEnded = () => {}

export const configureAuth = ({ clerkTokenGetter, recruiterToken, onRecruiterLogout } = {}) => {
    if (clerkTokenGetter) getClerkToken = clerkTokenGetter
    if (recruiterToken !== undefined) companyToken = recruiterToken
    if (onRecruiterLogout) onRecruiterSessionEnded = onRecruiterLogout
}

http.interceptors.request.use(async (config) => {
    const url = config.url ?? ''
    if (url.startsWith('/api/users') || url.startsWith('/api/admin')) {
        const token = await getClerkToken()
        if (token) config.headers.Authorization = `Bearer ${token}`
    }
    if (url.startsWith('/api/company') && companyToken) {
        config.headers.token = companyToken
    }
    return config
})

// Normalize errors: always expose the server's safe message and the status code.
http.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status ?? 0
        const message = error?.response?.data?.message
            ?? (error.code === 'ECONNABORTED' ? 'The server took too long to respond.' : null)
            ?? (status === 0 ? 'Cannot reach the server. Check your connection and try again.' : 'Something went wrong. Please try again.')

        const url = error?.config?.url ?? ''
        const isRecruiterSessionCall = url.startsWith('/api/company') && !url.endsWith('/login') && !url.endsWith('/register')
        if (isRecruiterSessionCall && (status === 401 || status === 403)) {
            onRecruiterSessionEnded(message)
        }

        const normalized = new Error(message)
        normalized.status = status
        return Promise.reject(normalized)
    }
)

const data = (p) => p.then((r) => r.data)

const toQuery = (params = {}) => {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue
        if (Array.isArray(value)) {
            if (value.length) qs.set(key, value.join(','))
        } else {
            qs.set(key, String(value))
        }
    }
    const s = qs.toString()
    return s ? `?${s}` : ''
}

export const jobsApi = {
    search: (params) => data(http.get(`/api/jobs${toQuery(params)}`)),
    meta: () => data(http.get('/api/jobs/meta')),
    get: (id) => data(http.get(`/api/jobs/${id}`)),
}

export const userApi = {
    me: () => data(http.get('/api/users/user')),
    applications: () => data(http.get('/api/users/applications')),
    apply: (jobId) => data(http.post('/api/users/apply', { jobId })),
    uploadResume: (file) => {
        const form = new FormData()
        form.append('resume', file)
        return data(http.post('/api/users/update-resume', form))
    },
    resumeLink: (download = false) => data(http.get(`/api/users/resume${download ? '?download=1' : ''}`)),
    savedJobs: () => data(http.get('/api/users/saved-jobs')),
    saveJob: (jobId) => data(http.post('/api/users/saved-jobs', { jobId })),
    unsaveJob: (jobId) => data(http.delete(`/api/users/saved-jobs/${jobId}`)),
}

export const companyApi = {
    login: (email, password) => data(http.post('/api/company/login', { email, password })),
    register: ({ name, email, password, image }) => {
        const form = new FormData()
        form.append('name', name)
        form.append('email', email)
        form.append('password', password)
        form.append('image', image)
        return data(http.post('/api/company/register', form))
    },
    me: () => data(http.get('/api/company/company')),
    updateProfile: (fields, logo) => {
        const form = new FormData()
        for (const [k, v] of Object.entries(fields)) form.append(k, v ?? '')
        if (logo) form.append('image', logo)
        return data(http.patch('/api/company/profile', form))
    },
    jobs: () => data(http.get('/api/company/list-jobs')),
    job: (id) => data(http.get(`/api/company/jobs/${id}`)),
    postJob: (job) => data(http.post('/api/company/post-job', job)),
    updateJob: (id, job) => data(http.patch(`/api/company/jobs/${id}`, job)),
    deleteJob: (id) => data(http.delete(`/api/company/jobs/${id}`)),
    toggleVisibility: (id) => data(http.post('/api/company/change-visiblity', { id })),
    applicants: (params) => data(http.get(`/api/company/applicants${toQuery(params)}`)),
    applicationResumeLink: (applicationId, download = false) => data(http.get(`/api/company/applications/${applicationId}/resume${download ? '?download=1' : ''}`)),
    setApplicationStatus: (id, status) => data(http.post('/api/company/change-status', { id, status })),
}

export const adminApi = {
    stats: () => data(http.get('/api/admin/stats')),
    users: (params) => data(http.get(`/api/admin/users${toQuery(params)}`)),
    setUserStatus: (id, status, reason) => data(http.patch(`/api/admin/users/${encodeURIComponent(id)}/status`, { status, reason })),
    userResumeLink: (id, download = false) => data(http.get(`/api/admin/users/${encodeURIComponent(id)}/resume${download ? '?download=1' : ''}`)),
    companies: (params) => data(http.get(`/api/admin/companies${toQuery(params)}`)),
    setCompanyStatus: (id, status, reason) => data(http.patch(`/api/admin/companies/${id}/status`, { status, reason })),
    jobs: (params) => data(http.get(`/api/admin/jobs${toQuery(params)}`)),
    moderateJob: (id, action, reason) => data(http.patch(`/api/admin/jobs/${id}/moderation`, { action, reason })),
    removeJob: (id, reason) => data(http.delete(`/api/admin/jobs/${id}`, { data: { reason } })),
    applications: (params) => data(http.get(`/api/admin/applications${toQuery(params)}`)),
    activity: (params) => data(http.get(`/api/admin/activity${toQuery(params)}`)),
}
