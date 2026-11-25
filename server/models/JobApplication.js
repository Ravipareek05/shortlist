import mongoose from "mongoose";
import { APPLICATION_STATUSES } from "../utils/constants.js";

const JobApplicationSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'Pending' },
    date: { type: Number, required: true },

    // Set when the job is deleted so candidates keep a readable history
    jobRemoved: { type: Boolean, default: false },
    jobSnapshot: {
        title: String,
        location: String,
    },
})

// One application per candidate per job (also enforced in the controller)
JobApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true })
JobApplicationSchema.index({ companyId: 1, date: -1 })
JobApplicationSchema.index({ jobId: 1 })

const JobApplication = mongoose.model('JobApplication', JobApplicationSchema)

export default JobApplication
