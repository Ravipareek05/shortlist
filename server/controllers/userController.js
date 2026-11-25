import Job from "../models/Job.js"
import JobApplication from "../models/JobApplication.js"
import { badRequest, conflict, notFound } from "../utils/httpError.js"
import * as v from "../utils/validate.js"
import { isJobPublic } from "../services/jobs.js"
import { isPdfBuffer } from "../config/multer.js"
import { uploadResume } from "../services/storage.js"

const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    image: user.image,
    resume: user.resume ?? '',
    role: user.role ?? 'candidate',
    status: user.status ?? 'active',
    createdAt: user.createdAt,
})

// Get User Data
export const getUserData = async (req, res) => {
    res.json({ success: true, user: publicUser(req.user) })
}

// Apply For Job
export const applyForJob = async (req, res) => {
    const jobId = v.objectId(req.body.jobId, 'job id')
    const user = req.user

    if (!user.resume) {
        throw badRequest('Upload your resume before applying')
    }

    const jobData = await Job.findById(jobId)

    if (!jobData || !(await isJobPublic(jobData))) {
        throw notFound('This job is no longer accepting applications')
    }

    const isAlreadyApplied = await JobApplication.exists({ jobId, userId: user._id })

    if (isAlreadyApplied) {
        throw conflict('You have already applied to this job')
    }

    try {
        await JobApplication.create({
            companyId: jobData.companyId,
            userId: user._id,
            jobId,
            date: Date.now()
        })
    } catch (error) {
        // Unique index catches double-clicks that slip past the check above
        if (error?.code === 11000) throw conflict('You have already applied to this job')
        throw error
    }

    res.status(201).json({ success: true, message: 'Application submitted' })
}

// Get User Applied Applications Data
export const getUserJobApplications = async (req, res) => {
    const applications = await JobApplication.find({ userId: req.user._id })
        .sort({ date: -1 })
        .populate('companyId', 'name email image')
        .populate('jobId', 'title location category level salary jobType visible moderationStatus')
        .lean()

    res.json({ success: true, applications })
}

// Update User Resume
export const updateUserResume = async (req, res) => {
    const resumeFile = req.file

    if (!resumeFile) {
        throw badRequest('Choose a PDF file to upload')
    }

    if (!isPdfBuffer(resumeFile.buffer)) {
        throw badRequest('That file is not a valid PDF')
    }

    const url = await uploadResume(resumeFile.buffer)

    req.user.resume = url
    await req.user.save()

    res.json({ success: true, message: 'Resume updated', resume: url })
}
