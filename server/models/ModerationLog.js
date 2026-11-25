import mongoose from "mongoose";

// Append-only audit trail of admin actions.
const moderationLogSchema = new mongoose.Schema({
    actorId: { type: String, required: true },
    actorName: { type: String },
    action: { type: String, required: true },
    targetType: { type: String, enum: ['job', 'user', 'company'], required: true },
    targetId: { type: String, required: true },
    targetLabel: { type: String },
    reason: { type: String },
}, { timestamps: true })

moderationLogSchema.index({ createdAt: -1 })

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema)

export default ModerationLog
