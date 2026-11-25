import mongoose from "mongoose";
import { ACCOUNT_STATUSES } from "../utils/constants.js";

const companySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    // Never returned unless explicitly requested with .select('+password')
    password: { type: String, required: true, select: false },

    // Profile fields (optional; added for company profile editing)
    about: { type: String, default: '' },
    website: { type: String, default: '' },
    location: { type: String, default: '' },
    industry: { type: String, default: '' },

    // Admin-managed
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'active', index: true },
    statusReason: { type: String },
}, { timestamps: true })

const Company = mongoose.model('Company', companySchema)

export default Company
