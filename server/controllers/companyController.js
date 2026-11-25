import Company from "../models/Company.js";
import bcrypt from 'bcrypt'
import generateToken from "../utils/generateToken.js";
import Job from "../models/Job.js";
import JobApplication from "../models/JobApplication.js";
import { APPLICATION_STATUSES, JOB_CATEGORIES, JOB_LEVELS, JOB_LOCATIONS, JOB_TYPES } from "../utils/constants.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/httpError.js";
import * as v from "../utils/validate.js";
import { sanitizeDescription, htmlToText } from "../utils/sanitize.js";
import { isImageBuffer } from "../config/multer.js";
import { uploadLogo } from "../services/storage.js";

// Used to keep login timing the same whether or not the email exists
let dummyHash
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('shortlist-timing-guard', 10))

const publicCompany = (company) => ({
    _id: company._id,
    name: company.name,
    email: company.email,
    image: company.image,
    about: company.about ?? '',
    website: company.website ?? '',
    location: company.location ?? '',
    industry: company.industry ?? '',
    status: company.status ?? 'active',
})

// Validates job fields. With partial=true only provided fields are validated (for edits).
export const parseJobInput = (body, { partial = false } = {}) => {
    const required = !partial
    const out = {}

    const title = v.text(body.title, { field: 'Job title', min: 3, max: 120, required })
    if (title !== undefined) out.title = title

    if (body.description !== undefined || required) {
        if (typeof body.description !== 'string') throw badRequest('Job description is required')
        if (body.description.length > 50000) throw badRequest('Job description is too long')
        const clean = sanitizeDescription(body.description)
        const plain = htmlToText(clean)
        if (plain.length < 20) throw badRequest('Job description must be at least 20 characters')
        out.description = clean
    }

    const location = v.oneOf(body.location, JOB_LOCATIONS, { field: 'Location', required })
    if (location !== undefined) out.location = location

    const category = v.oneOf(body.category, JOB_CATEGORIES, { field: 'Category', required })
    if (category !== undefined) out.category = category

    const level = v.oneOf(body.level, JOB_LEVELS, { field: 'Experience level', required })
    if (level !== undefined) out.level = level

    const salary = v.number(body.salary, { field: 'Salary', min: 0, max: 100000000, required })
    if (salary !== undefined) out.salary = Math.round(salary)

    const jobType = v.oneOf(body.jobType, JOB_TYPES, { field: 'Job type', required: false })
    if (jobType !== undefined) out.jobType = jobType

    const visible = v.boolean(body.visible, { field: 'Visibility' })
    if (visible !== undefined) out.visible = visible

    return out
}

// Register a new company
export const registerCompany = async (req, res) => {
    const name = v.text(req.body.name, { field: 'Company name', min: 2, max: 100 })
    const email = v.email(req.body.email)
    const password = v.password(req.body.password)

    const imageFile = req.file
    if (!imageFile) throw badRequest('Company logo is required')
    if (!isImageBuffer(imageFile.buffer)) throw badRequest('Logo must be a PNG, JPG or WebP image')

    const companyExists = await Company.exists({ email })
    if (companyExists) {
        throw conflict('An account with this email already exists. Try logging in.')
    }

    const hashPassword = await bcrypt.hash(password, 10)
    const image = await uploadLogo(imageFile.buffer)

    const company = await Company.create({ name, email, password: hashPassword, image })

    res.status(201).json({
        success: true,
        message: 'Account created',
        company: publicCompany(company),
        token: generateToken(company._id)
    })
}

// Login Company
export const loginCompany = async (req, res) => {
    const email = v.email(req.body.email)
    if (typeof req.body.password !== 'string' || !req.body.password) throw badRequest('Password is required')

    // Older accounts may have been stored with mixed-case emails
    const rawEmail = req.body.email.trim()
    const company = await Company.findOne({ email: { $in: [email, rawEmail] } }).select('+password')

    const passwordOk = await bcrypt.compare(req.body.password, company?.password ?? await getDummyHash())

    // Same response whether the email is unknown or the password is wrong
    if (!company || !passwordOk) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    if (company.status === 'suspended') {
        throw forbidden('This recruiter account has been suspended. Contact support for help.')
    }

    res.json({
        success: true,
        company: publicCompany(company),
        token: generateToken(company._id)
    })
}

// Get Company Data
export const getCompanyData = async (req, res) => {
    res.json({ success: true, company: publicCompany(req.company) })
}

// Post New Job
export const postJob = async (req, res) => {
    const fields = parseJobInput(req.body)

    const newJob = await Job.create({
        ...fields,
        companyId: req.company._id,
        date: Date.now(),
        moderationStatus: 'approved',
    })

    res.status(201).json({ success: true, message: 'Job posted', newJob })
}

// Get Company Job Applicants (only this company's applications)
export const getCompanyJobApplicants = async (req, res) => {
    const filter = { companyId: req.company._id, jobRemoved: { $ne: true } }
    if (req.query.jobId) filter.jobId = v.objectId(req.query.jobId, 'job id')

    const applications = await JobApplication.find(filter)
        .sort({ date: -1 })
        .populate('userId', 'name image resume email')
        .populate('jobId', 'title location category level salary jobType')
        .lean()

    res.json({ success: true, applications })
}

// Get Company Posted Jobs, with applicant counts from a single aggregation
export const getCompanyPostedJobs = async (req, res) => {
    const companyId = req.company._id

    const [jobs, counts] = await Promise.all([
        Job.find({ companyId }).sort({ date: -1 }).lean(),
        JobApplication.aggregate([
            { $match: { companyId, jobRemoved: { $ne: true } } },
            {
                $group: {
                    _id: '$jobId',
                    total: { $sum: 1 },
                    pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
                    accepted: { $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
                }
            }
        ])
    ])

    const byJob = new Map(counts.map((c) => [String(c._id), c]))

    const jobsData = jobs.map((job) => {
        const c = byJob.get(String(job._id))
        return {
            ...job,
            moderationStatus: job.moderationStatus ?? 'approved',
            applicants: c?.total ?? 0,
            applicantStats: { pending: c?.pending ?? 0, accepted: c?.accepted ?? 0, rejected: c?.rejected ?? 0 },
        }
    })

    res.json({ success: true, jobsData })
}

// Change Job Application Status (only for applications to this company's jobs)
export const ChangeJobApplicationsStatus = async (req, res) => {
    const id = v.objectId(req.body.id, 'application id')
    const status = v.oneOf(req.body.status, APPLICATION_STATUSES, { field: 'Status' })

    const application = await JobApplication.findOneAndUpdate(
        { _id: id, companyId: req.company._id },
        { status },
        { new: true }
    )

    if (!application) {
        throw notFound('Application not found')
    }

    res.json({ success: true, message: `Application marked as ${status.toLowerCase()}`, application })
}

// Change Job Visiblity (only this company's jobs)
export const changeVisiblity = async (req, res) => {
    const id = v.objectId(req.body.id, 'job id')

    const job = await Job.findOne({ _id: id, companyId: req.company._id })

    if (!job) {
        throw notFound('Job not found')
    }

    job.visible = !job.visible
    await job.save()

    res.json({ success: true, message: job.visible ? 'Job is now visible to candidates' : 'Job hidden from candidates', job })
}
