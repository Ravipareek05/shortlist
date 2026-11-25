import mongoose from "mongoose";
import { ACCOUNT_STATUSES, USER_ROLES } from "../utils/constants.js";

// Job seekers (and admins) authenticated by Clerk. _id is the Clerk user id.
// role/status are server-managed only: no API accepts them from a request body,
// and Clerk webhooks never modify them.
const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    resume: { type: String },
    image: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: 'candidate', index: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'active', index: true },
    statusReason: { type: String },
}, { timestamps: true })

const User = mongoose.model('User', userSchema)

export default User;
