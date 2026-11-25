import Job from "../models/Job.js"
import { COMPANY_PUBLIC_FIELDS, isJobPublic, publicJobFilter } from "../services/jobs.js"
import { notFound } from "../utils/httpError.js"
import { isObjectId } from "../utils/validate.js"

// Get All Jobs (public: visible, approved, from active companies)
export const getJobs = async (req, res) => {
    const filter = await publicJobFilter()

    const jobs = await Job.find(filter)
        .sort({ date: -1 })
        .populate({ path: 'companyId', select: COMPANY_PUBLIC_FIELDS })
        .lean()

    res.json({ success: true, jobs })
}

// Get Single Job Using JobID (404 for hidden, moderated or unknown jobs)
export const getJobById = async (req, res) => {
    const { id } = req.params

    if (!isObjectId(id)) throw notFound('Job not found')

    const job = await Job.findById(id)
        .populate({ path: 'companyId', select: `${COMPANY_PUBLIC_FIELDS} status` })
        .lean()

    if (!job || !(await isJobPublic(job))) {
        throw notFound('This job is no longer available')
    }

    delete job.companyId.status
    res.json({ success: true, job })
}
