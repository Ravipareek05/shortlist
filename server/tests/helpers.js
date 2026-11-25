// Test harness: real Express app + real MongoDB (in-memory), with Clerk and Cloudinary stubbed.
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing'
process.env.CLIENT_URLS = 'http://localhost:5173'
process.env.CLERK_WEBHOOK_SECRET = 'whsec_' + Buffer.from('shortlist-test-webhook-secret-key').toString('base64')

import { MongoMemoryServer } from 'mongodb-memory-server-core'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Webhook } from 'svix'
import connectDB, { disconnectDB } from '../config/db.js'
import { createApp } from '../app.js'
import { setUploader } from '../services/storage.js'
import { v2 as cloudinary } from 'cloudinary'
import Company from '../models/Company.js'
import User from '../models/User.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import SavedJob from '../models/SavedJob.js'
import ModerationLog from '../models/ModerationLog.js'
import generateToken from '../utils/generateToken.js'

let mongod

export const uploads = []

export const startDb = async () => {
    cloudinary.config({ cloud_name: 'testcloud', api_key: 'test-key', api_secret: 'test-secret' })
    mongod = await MongoMemoryServer.create()
    process.env.MONGODB_URI = mongod.getUri()
    await connectDB()
    await Promise.all([Company, User, Job, JobApplication, SavedJob, ModerationLog].map((m) => m.syncIndexes()))
    setUploader(async (buffer, options) => {
        uploads.push({ size: buffer.length, options })
        const id = options.public_id ?? `asset-${uploads.length}.png`
        return { secure_url: `https://res.cloudinary.com/testcloud/${options.resource_type}/${options.type ?? 'upload'}/v1/${options.folder}/${id}` }
    })
}

export const stopDb = async () => {
    await disconnectDB()
    await mongod?.stop()
}

export const clearDb = async () => {
    const collections = await mongoose.connection.db.collections()
    await Promise.all(collections.map((c) => c.deleteMany({})))
    uploads.length = 0
}

// Clerk is replaced by an "x-test-user" header carrying the user id
export const makeApp = (options = {}) => createApp({
    useClerk: false,
    getUserId: (req) => req.headers['x-test-user'] ?? null,
    loadClerkUser: async () => null,
    rateLimits: { login: 1000, register: 1000 },
    ...options,
})

let seq = 0
export const createCompany = async (overrides = {}) => {
    seq += 1
    const password = overrides.password ?? 'correct-horse-battery'
    const company = await Company.create({
        name: `Company ${seq}`,
        email: `company${seq}@example.com`,
        image: 'https://res.cloudinary.test/logo.png',
        ...overrides,
        password: await bcrypt.hash(password, 4),
    })
    return { company, token: generateToken(company._id), password }
}

export const createUser = async (overrides = {}) => {
    seq += 1
    return User.create({
        _id: `user_${seq}`,
        name: `Candidate ${seq}`,
        email: `candidate${seq}@example.com`,
        image: 'https://img.clerk.test/u.png',
        resume: 'https://res.cloudinary.test/resume.pdf',
        ...overrides,
    })
}

export const createJob = async (company, overrides = {}) => Job.create({
    title: 'Frontend Engineer',
    description: '<p>Build delightful interfaces with React and TypeScript.</p>',
    location: 'Bangalore',
    category: 'Programming',
    level: 'Intermediate level',
    salary: 120000,
    date: Date.now(),
    companyId: company._id,
    ...overrides,
})

export const expiredToken = (id) => jwt.sign({ id: String(id), exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET)

export const signWebhook = (payload) => {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET)
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const timestamp = new Date()
    const body = JSON.stringify(payload)
    return {
        body,
        headers: {
            'svix-id': id,
            'svix-timestamp': String(Math.floor(timestamp.getTime() / 1000)),
            'svix-signature': wh.sign(id, timestamp, body),
            'content-type': 'application/json',
        },
    }
}

export const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n')
export const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82])
