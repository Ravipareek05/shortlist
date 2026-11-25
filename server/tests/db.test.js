import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server-core'
import connectDB, { disconnectDB } from '../config/db.js'
import { buildOriginMatcher } from '../app.js'

let mongod
before(async () => { mongod = await MongoMemoryServer.create() })
after(async () => { await disconnectDB(); await mongod.stop() })

describe('MongoDB connection', () => {
    it('handles URIs with query strings and uses the job-portal database by default', async () => {
        delete process.env.MONGODB_DB
        await connectDB(`${mongod.getUri()}?retryWrites=true&w=majority&appName=Test`)
        assert.equal(mongoose.connection.readyState, 1)
        assert.equal(mongoose.connection.db.databaseName, 'job-portal')
    })

    it('reuses the cached connection', async () => {
        const a = await connectDB(mongod.getUri())
        const b = await connectDB(mongod.getUri())
        assert.equal(a, b)
    })
})

describe('CORS origin matching', () => {
    it('matches exact origins and single-label wildcards only', () => {
        const match = buildOriginMatcher('https://shortlist.app, https://shortlist-*-team.vercel.app/', 'production')
        assert.equal(match('https://shortlist.app'), true)
        assert.equal(match('https://shortlist-git-main-team.vercel.app'), true)
        assert.equal(match('https://shortlist-x.evil.com-team.vercel.app'), false)
        assert.equal(match('https://evil.app'), false)
    })

    it('allows only localhost in development when unset, nothing in production', () => {
        assert.equal(buildOriginMatcher('', 'development')('http://localhost:5173'), true)
        assert.equal(buildOriginMatcher('', 'production')('http://localhost:5173'), false)
    })
})
