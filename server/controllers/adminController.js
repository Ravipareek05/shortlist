import User from "../models/User.js"
import Company from "../models/Company.js"
import Job from "../models/Job.js"
import JobApplication from "../models/JobApplication.js"
import ModerationLog from "../models/ModerationLog.js"
import { ACCOUNT_STATUSES, APPLICATION_STATUSES, MODERATION_STATUSES } from "../utils/constants.js"
import { badRequest, forbidden, notFound } from "../utils/httpError.js"
import * as v from "../utils/validate.js"
import { deleteJobAndCleanup } from "../services/jobs.js"

// Every handler here runs behind requireUser + requireAdmin (see routes/adminRoutes.js).

const log = (req, { action, targetType, targetId, targetLabel, reason }) => ModerationLog.create({
    actorId: req.user._id,
    actorName: req.user.name,
    action,
    targetType,
    targetId: String(targetId),
    targetLabel,
    reason,
})

const searchRegex = (q) => {
    const s = typeof q === 'string' ? q.trim().slice(0, 100) : ''
    return s ? new RegExp(v.escapeRegex(s), 'i') : null
}

const countBy = async (Model, field, match = {}) => {
    const rows = await Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }])
    return Object.fromEntries(rows.map((r) => [r._id ?? 'unset', r.count]))
}

// ---------- Overview ----------

export const getStats = async (req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [users, companies, jobsByModeration, visibleJobs, totalJobs, applications, newUsers, newCompanies, newApplications, recentActivity] = await Promise.all([
        countBy(User, 'status'),
        countBy(Company, 'status'),
        countBy(Job, 'moderationStatus'),
        Job.countDocuments({ visible: true }),
        Job.countDocuments(),
        countBy(JobApplication, 'status'),
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        Company.countDocuments({ createdAt: { $gte: weekAgo } }),
        JobApplication.countDocuments({ date: { $gte: weekAgo.getTime() } }),
        ModerationLog.find().sort({ createdAt: -1 }).limit(8).lean(),
    ])

    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0)

    res.json({
        success: true,
        stats: {
            users: { total: sum(users), active: sum(users) - (users.suspended ?? 0), suspended: users.suspended ?? 0, newThisWeek: newUsers },
            companies: { total: sum(companies), active: sum(companies) - (companies.suspended ?? 0), suspended: companies.suspended ?? 0, newThisWeek: newCompanies },
            jobs: {
                total: totalJobs,
                visible: visibleJobs,
                approved: (jobsByModeration.approved ?? 0) + (jobsByModeration.unset ?? 0),
                pending: jobsByModeration.pending ?? 0,
                rejected: jobsByModeration.rejected ?? 0,
                hidden: jobsByModeration.hidden ?? 0,
            },
            applications: {
                total: sum(applications),
                pending: applications.Pending ?? 0,
                accepted: applications.Accepted ?? 0,
                rejected: applications.Rejected ?? 0,
                newThisWeek: newApplications,
            },
        },
        recentActivity,
    })
}

// ---------- Job seekers ----------

export const listUsers = async (req, res) => {
    const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 20 })
    const filter = {}
    const rx = searchRegex(req.query.q)
    if (rx) filter.$or = [{ name: rx }, { email: rx }]
    if (ACCOUNT_STATUSES.includes(req.query.status)) filter.status = req.query.status

    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1, _id: 1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter),
    ])

    const counts = await JobApplication.aggregate([
        { $match: { userId: { $in: users.map((u) => u._id) } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
    ])
    const byUser = new Map(counts.map((c) => [c._id, c.count]))

    res.json({
        success: true,
        users: users.map((u) => ({ ...u, role: u.role ?? 'candidate', status: u.status ?? 'active', applications: byUser.get(u._id) ?? 0 })),
        pagination: v.paginationMeta(page, limit, total),
    })
}

const parseStatusChange = (body) => ({
    status: v.oneOf(body.status, ACCOUNT_STATUSES, { field: 'Status' }),
    reason: v.text(body.reason, { field: 'Reason', max: 500, required: body.status === 'suspended' }),
})

export const setUserStatus = async (req, res) => {
    const { status, reason } = parseStatusChange(req.body)
    const user = await User.findById(v.text(req.params.id, { field: 'User id', max: 100 }))
    if (!user) throw notFound('User not found')
    if (user._id === req.user._id) throw badRequest('You cannot change your own account status')
    if (user.role === 'admin') throw forbidden('Admin accounts cannot be suspended here. Demote them with the admin script first.')

    // Only status fields are written; role and other fields in the body are ignored.
    user.status = status
    user.statusReason = status === 'suspended' ? reason : undefined
    await user.save()

    await log(req, { action: status === 'suspended' ? 'user.suspend' : 'user.reactivate', targetType: 'user', targetId: user._id, targetLabel: `${user.name} <${user.email}>`, reason })
    res.json({ success: true, message: status === 'suspended' ? 'User suspended' : 'User reactivated', user })
}

// ---------- Recruiters / companies ----------

export const listCompanies = async (req, res) => {
    const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 20 })
    const filter = {}
    const rx = searchRegex(req.query.q)
    if (rx) filter.$or = [{ name: rx }, { email: rx }]
    if (ACCOUNT_STATUSES.includes(req.query.status)) filter.status = req.query.status

    const [companies, total] = await Promise.all([
        Company.find(filter).sort({ createdAt: -1, _id: 1 }).skip(skip).limit(limit).lean(),
        Company.countDocuments(filter),
    ])

    const ids = companies.map((c) => c._id)
    const [jobCounts, appCounts] = await Promise.all([
        Job.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
        JobApplication.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
    ])
    const jobsBy = new Map(jobCounts.map((c) => [String(c._id), c.count]))
    const appsBy = new Map(appCounts.map((c) => [String(c._id), c.count]))

    res.json({
        success: true,
        companies: companies.map((c) => ({ ...c, status: c.status ?? 'active', jobs: jobsBy.get(String(c._id)) ?? 0, applications: appsBy.get(String(c._id)) ?? 0 })),
        pagination: v.paginationMeta(page, limit, total),
    })
}

export const setCompanyStatus = async (req, res) => {
    const { status, reason } = parseStatusChange(req.body)
    const company = await Company.findById(v.objectId(req.params.id, 'company id'))
    if (!company) throw notFound('Company not found')

    company.status = status
    company.statusReason = status === 'suspended' ? reason : undefined
    await company.save()

    await log(req, { action: status === 'suspended' ? 'company.suspend' : 'company.reactivate', targetType: 'company', targetId: company._id, targetLabel: `${company.name} <${company.email}>`, reason })
    res.json({ success: true, message: status === 'suspended' ? 'Company suspended; its jobs are hidden' : 'Company reactivated', company })
}

// ---------- Job moderation ----------

export const listJobs = async (req, res) => {
    const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 20 })
    const filter = {}
    const rx = searchRegex(req.query.q)
    if (rx) filter.title = rx
    if (MODERATION_STATUSES.includes(req.query.moderation)) {
        filter.moderationStatus = req.query.moderation === 'approved' ? { $nin: ['pending', 'rejected', 'hidden'] } : req.query.moderation
    }
    if (v.isObjectId(req.query.company)) filter.companyId = req.query.company

    const [jobs, total] = await Promise.all([
        Job.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate('companyId', 'name image email status').lean(),
        Job.countDocuments(filter),
    ])

    const counts = await JobApplication.aggregate([
        { $match: { jobId: { $in: jobs.map((j) => j._id) } } },
        { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ])
    const byJob = new Map(counts.map((c) => [String(c._id), c.count]))

    res.json({
        success: true,
        jobs: jobs.map((j) => ({ ...j, moderationStatus: j.moderationStatus ?? 'approved', applicants: byJob.get(String(j._id)) ?? 0 })),
        pagination: v.paginationMeta(page, limit, total),
    })
}

const MODERATION_ACTIONS = {
    approve: 'approved',
    reject: 'rejected',
    hide: 'hidden',
}

export const moderateJob = async (req, res) => {
    const action = v.oneOf(req.body.action, Object.keys(MODERATION_ACTIONS), { field: 'Action' })
    const reason = v.text(req.body.reason, { field: 'Reason', max: 500, required: action !== 'approve' })
    const job = await Job.findById(v.objectId(req.params.id, 'job id')).populate('companyId', 'name')
    if (!job) throw notFound('Job not found')

    job.moderationStatus = MODERATION_ACTIONS[action]
    job.moderationReason = action === 'approve' ? undefined : reason
    await job.save()

    await log(req, { action: `job.${action}`, targetType: 'job', targetId: job._id, targetLabel: `${job.title} (${job.companyId?.name ?? 'unknown company'})`, reason })
    res.json({ success: true, message: `Job ${MODERATION_ACTIONS[action]}`, job })
}

export const removeJob = async (req, res) => {
    const reason = v.text(req.body?.reason, { field: 'Reason', max: 500 })
    const job = await Job.findById(v.objectId(req.params.id, 'job id')).populate('companyId', 'name')
    if (!job) throw notFound('Job not found')

    const label = `${job.title} (${job.companyId?.name ?? 'unknown company'})`
    const result = await deleteJobAndCleanup(job)

    await log(req, { action: 'job.delete', targetType: 'job', targetId: job._id, targetLabel: label, reason })
    res.json({ success: true, message: 'Job removed', ...result })
}

// ---------- Applications & activity ----------

export const listApplications = async (req, res) => {
    const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 20 })
    const filter = {}
    if (APPLICATION_STATUSES.includes(req.query.status)) filter.status = req.query.status
    if (v.isObjectId(req.query.company)) filter.companyId = req.query.company

    const [applications, total] = await Promise.all([
        JobApplication.find(filter).sort({ date: -1 }).skip(skip).limit(limit)
            .populate('userId', 'name email image')
            .populate('companyId', 'name image')
            .populate('jobId', 'title location')
            .lean(),
        JobApplication.countDocuments(filter),
    ])

    res.json({ success: true, applications, pagination: v.paginationMeta(page, limit, total) })
}

export const listActivity = async (req, res) => {
    const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 30 })
    const filter = {}
    if (['job', 'user', 'company'].includes(req.query.type)) filter.targetType = req.query.type

    const [activity, total] = await Promise.all([
        ModerationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ModerationLog.countDocuments(filter),
    ])

    res.json({ success: true, activity, pagination: v.paginationMeta(page, limit, total) })
}
