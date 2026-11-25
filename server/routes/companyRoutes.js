import express from 'express'
import { ChangeJobApplicationsStatus, changeVisiblity, getCompanyData, getCompanyJobApplicants, getCompanyPostedJobs, loginCompany, postJob, registerCompany } from '../controllers/companyController.js'
import { logoUpload } from '../config/multer.js'
import { protectCompany } from '../middleware/authMiddleware.js'
import { asyncHandler } from '../utils/httpError.js'

export const createCompanyRouter = ({ loginLimiter, registerLimiter }) => {
    const router = express.Router()
    const h = asyncHandler

    // Register a company
    router.post('/register', registerLimiter, logoUpload.single('image'), h(registerCompany))

    // Company login
    router.post('/login', loginLimiter, h(loginCompany))

    // Get company data
    router.get('/company', protectCompany, h(getCompanyData))

    // Post a job
    router.post('/post-job', protectCompany, h(postJob))

    // Get Applicants Data of Company
    router.get('/applicants', protectCompany, h(getCompanyJobApplicants))

    // Get Company Job List
    router.get('/list-jobs', protectCompany, h(getCompanyPostedJobs))

    // Change Applications Status
    router.post('/change-status', protectCompany, h(ChangeJobApplicationsStatus))

    // Change Job Visibility
    router.post('/change-visiblity', protectCompany, h(changeVisiblity))

    return router
}
