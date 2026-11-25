import Company from '../models/Company.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import SavedJob from '../models/SavedJob.js'
import { NON_PUBLIC_MODERATION } from '../utils/constants.js'

// Base filter for anything shown publicly: visible to candidates, not blocked by moderation,
// and not owned by a suspended company. Jobs created before moderation existed have no
// moderationStatus field, and $nin matches those too.
export const publicJobFilter = async () => {
    const suspended = await Company.find({ status: 'suspended' }).distinct('_id')
    const filter = {
        visible: true,
        moderationStatus: { $nin: NON_PUBLIC_MODERATION },
    }
    if (suspended.length) filter.companyId = { $nin: suspended }
    return filter
}

export const isJobPublic = async (job) => {
    if (!job || !job.visible) return false
    if (NON_PUBLIC_MODERATION.includes(job.moderationStatus)) return false
    const company = job.companyId?.status !== undefined
        ? job.companyId
        : await Company.findById(job.companyId).select('status').lean()
    return !!company && company.status !== 'suspended'
}

export const COMPANY_PUBLIC_FIELDS = 'name image about website location industry'

// Deletes a job while keeping candidates' application history readable.
export const deleteJobAndCleanup = async (job) => {
    const applications = await JobApplication.updateMany(
        { jobId: job._id },
        { $set: { jobRemoved: true, jobSnapshot: { title: job.title, location: job.location } } }
    )
    const saved = await SavedJob.deleteMany({ jobId: job._id })
    await Job.deleteOne({ _id: job._id })
    return { applicationsArchived: applications.modifiedCount, savedRemoved: saved.deletedCount }
}
