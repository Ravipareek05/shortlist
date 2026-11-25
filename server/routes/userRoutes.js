import express from 'express'
import { applyForJob, getMyResumeLink, getSavedJobs, getUserData, getUserJobApplications, saveJob, unsaveJob, updateUserResume } from '../controllers/userController.js'
import { resumeUpload } from '../config/multer.js'
import { requireActiveUser, requireUser } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/httpError.js'

const router = express.Router()
const h = asyncHandler

// Every job-seeker route requires a signed-in Clerk user with a database record
router.use(requireUser)

// Get user Data
router.get('/user', h(getUserData))

// Apply for a job
router.post('/apply', requireActiveUser, h(applyForJob))

// Get applied jobs data
router.get('/applications', h(getUserJobApplications))

// Update user profile (resume)
router.post('/update-resume', requireActiveUser, resumeUpload.single('resume'), h(updateUserResume))

// Signed link to own resume
router.get('/resume', h(getMyResumeLink))

// Saved jobs
router.get('/saved-jobs', h(getSavedJobs))
router.post('/saved-jobs', requireActiveUser, h(saveJob))
router.delete('/saved-jobs/:jobId', requireActiveUser, h(unsaveJob))

export default router;
