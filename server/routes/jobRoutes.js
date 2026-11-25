import express from 'express'
import { getJobById, getJobs } from '../controllers/jobController.js';
import { asyncHandler } from '../utils/httpError.js';

const router = express.Router()

// Route to get all jobs data
router.get('/', asyncHandler(getJobs))

// Route to get a single job by ID
router.get('/:id', asyncHandler(getJobById))


export default router;
