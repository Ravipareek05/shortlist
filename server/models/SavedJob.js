import mongoose from "mongoose";

// A job bookmarked by a job seeker. Separate collection so the unique index
// guarantees no duplicates and deleting a job can clean up references.
const savedJobSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
}, { timestamps: true })

savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true })
savedJobSchema.index({ jobId: 1 })

const SavedJob = mongoose.model('SavedJob', savedJobSchema)

export default SavedJob
