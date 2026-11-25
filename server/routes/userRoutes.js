import express from 'express'
import { applyForJob, getUserData, getUserJobApplications, updateUserResume } from '../controllers/userController.js'
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

export default router;
