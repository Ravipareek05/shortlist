import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { clearDb, createCompany, createJob, createUser, makeApp, startDb, stopDb } from './helpers.js'
import JobApplication from '../models/JobApplication.js'
import { parseCloudinaryUrl, resumeAccessUrl } from '../services/storage.js'

const app = makeApp()
before(startDb)
after(stopDb)
beforeEach(clearDb)

const PRIVATE_RESUME = 'https://res.cloudinary.com/testcloud/raw/private/v1/shortlist/resumes/resume-abc.pdf'
const LEGACY_RESUME = 'https://res.cloudinary.com/testcloud/image/upload/v1712345/legacycv.pdf'

const isSigned = (url) => {
    const u = new URL(url)
    return u.hostname === 'api.cloudinary.com' && u.searchParams.get('signature') && Number(u.searchParams.get('expires_at')) > Date.now() / 1000
}

describe('Resume link signing', () => {
    it('parses new private raw and legacy image resume URLs', () => {
        assert.deepEqual(parseCloudinaryUrl(PRIVATE_RESUME), { resourceType: 'raw', type: 'private', publicId: 'shortlist/resumes/resume-abc.pdf', format: '' })
        assert.deepEqual(parseCloudinaryUrl(LEGACY_RESUME), { resourceType: 'image', type: 'upload', publicId: 'legacycv', format: 'pdf' })
        assert.equal(parseCloudinaryUrl('https://evil.example/raw/upload/x.pdf'), null)
    })

    it('issues expiring signed links (inline or download)', () => {
        const inline = resumeAccessUrl(PRIVATE_RESUME)
        const download = resumeAccessUrl(LEGACY_RESUME, { download: true })
        assert.ok(isSigned(inline))
        assert.ok(isSigned(download))
        assert.equal(new URL(download).searchParams.get('attachment'), 'true')
        assert.equal(resumeAccessUrl(''), null)
    })
})

describe('Resume access control', () => {
    const setup = async () => {
        const a = await createCompany()
        const b = await createCompany()
        const candidate = await createUser({ resume: PRIVATE_RESUME })
        const noResume = await createUser({ resume: '' })
        const job = await createJob(a.company)
        const application = await JobApplication.create({ userId: candidate._id, companyId: a.company._id, jobId: job._id, date: Date.now() })
        return { a, b, candidate, noResume, job, application }
    }

    it('candidates get a signed link to their own resume only', async () => {
        const { candidate, noResume } = await setup()
        assert.equal((await request(app).get('/api/users/resume')).status, 401)
        const own = await request(app).get('/api/users/resume').set('x-test-user', candidate._id)
        assert.equal(own.status, 200)
        assert.ok(isSigned(own.body.url))
        assert.equal((await request(app).get('/api/users/resume').set('x-test-user', noResume._id)).status, 404)
    })

    it('recruiters get links only for applications to their own company', async () => {
        const { a, b, application } = await setup()
        const ok = await request(app).get(`/api/company/applications/${application._id}/resume?download=1`).set('token', a.token)
        assert.equal(ok.status, 200)
        assert.equal(new URL(ok.body.url).searchParams.get('attachment'), 'true')
        assert.equal((await request(app).get(`/api/company/applications/${application._id}/resume`).set('token', b.token)).status, 404)
        assert.equal((await request(app).get(`/api/company/applications/${application._id}/resume`)).status, 401)
    })

    it('applicant lists no longer expose stored resume URLs', async () => {
        const { a } = await setup()
        const res = await request(app).get('/api/company/applicants').set('token', a.token)
        assert.equal(res.body.applications[0].userId.resume, undefined)
        assert.equal(res.body.applications[0].userId.hasResume, true)
    })

    it('admins can open any resume; others cannot use the admin endpoint', async () => {
        const { candidate } = await setup()
        const admin = await createUser({ role: 'admin' })
        const ok = await request(app).get(`/api/admin/users/${candidate._id}/resume`).set('x-test-user', admin._id)
        assert.equal(ok.status, 200)
        assert.ok(isSigned(ok.body.url))
        assert.equal((await request(app).get(`/api/admin/users/${candidate._id}/resume`).set('x-test-user', candidate._id)).status, 403)
        const list = await request(app).get('/api/admin/users').set('x-test-user', admin._id)
        assert.ok(list.body.users.every((u) => u.resume === undefined))
    })
})
