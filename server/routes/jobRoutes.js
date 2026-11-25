import express from 'express'
import { getJobById, getJobs, getJobsMeta } from '../controllers/jobController.js';
import { asyncHandler } from '../utils/httpError.js';

const router = express.Router()

// Search jobs (filters, sorting, pagination)
router.get('/', asyncHandler(getJobs))

// Platform stats, filter options, featured companies
router.get('/meta', asyncHandler(getJobsMeta))

// Route to get a single job by ID
router.get('/:id', asyncHandler(getJobById))


export default router;
