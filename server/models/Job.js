import mongoose from "mongoose";
import { JOB_TYPES, MODERATION_STATUSES } from "../utils/constants.js";

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    level: { type: String, required: true },
    salary: { type: Number, required: true },
    date: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

    // Added fields. Older jobs simply don't have them.
    jobType: { type: String, enum: JOB_TYPES },
    moderationStatus: { type: String, enum: MODERATION_STATUSES, default: 'approved' },
    moderationReason: { type: String },
}, { timestamps: true })

// Public listing: visible + moderation + newest first
jobSchema.index({ visible: 1, moderationStatus: 1, date: -1 })
jobSchema.index({ companyId: 1, date: -1 })
jobSchema.index({ category: 1 })
jobSchema.index({ salary: 1 })

const Job = mongoose.model('Job', jobSchema)

export default Job
