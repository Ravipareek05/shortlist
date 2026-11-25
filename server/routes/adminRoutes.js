import express from 'express'
import { getStats, getUserResumeLink, listActivity, listApplications, listCompanies, listJobs, listUsers, moderateJob, removeJob, setCompanyStatus, setUserStatus } from '../controllers/adminController.js'
import { requireAdmin, requireUser } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/httpError.js'

const router = express.Router()
const h = asyncHandler

// Server-side authorization for every admin endpoint: a Clerk session whose database
// record has role "admin". The frontend route guard is only for UX.
router.use(requireUser, requireAdmin)

router.get('/stats', h(getStats))

router.get('/users', h(listUsers))
router.patch('/users/:id/status', h(setUserStatus))
router.get('/users/:id/resume', h(getUserResumeLink))

router.get('/companies', h(listCompanies))
router.patch('/companies/:id/status', h(setCompanyStatus))

router.get('/jobs', h(listJobs))
router.patch('/jobs/:id/moderation', h(moderateJob))
router.delete('/jobs/:id', h(removeJob))

router.get('/applications', h(listApplications))
router.get('/activity', h(listActivity))

export default router
