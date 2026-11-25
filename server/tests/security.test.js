import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { clearDb, createCompany, createJob, createUser, expiredToken, makeApp, PDF_BYTES, PNG_BYTES, signWebhook, startDb, stopDb, uploads } from './helpers.js'
import { setUploader } from '../services/storage.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import User from '../models/User.js'
import Company from '../models/Company.js'

const app = makeApp()

before(startDb)
after(stopDb)
beforeEach(clearDb)

describe('Recruiter authorization (company ownership)', () => {
    it('cannot change the status of another company\'s application', async () => {
        const a = await createCompany()
        const b = await createCompany()
        const jobB = await createJob(b.company)
        const user = await createUser()
        const appB = await JobApplication.create({ userId: user._id, companyId: b.company._id, jobId: jobB._id, date: Date.now() })

        const res = await request(app).post('/api/company/change-status').set('token', a.token).send({ id: String(appB._id), status: 'Accepted' })

        assert.equal(res.status, 404)
        assert.equal((await JobApplication.findById(appB._id)).status, 'Pending')
    })

    it('can change the status of its own application, and rejects invalid statuses', async () => {
        const a = await createCompany()
        const job = await createJob(a.company)
        const user = await createUser()
        const application = await JobApplication.create({ userId: user._id, companyId: a.company._id, jobId: job._id, date: Date.now() })

        const ok = await request(app).post('/api/company/change-status').set('token', a.token).send({ id: String(application._id), status: 'Accepted' })
        assert.equal(ok.status, 200)
        assert.equal((await JobApplication.findById(application._id)).status, 'Accepted')

        const bad = await request(app).post('/api/company/change-status').set('token', a.token).send({ id: String(application._id), status: 'Hired!!' })
        assert.equal(bad.status, 400)
    })

    it('cannot toggle visibility of another company\'s job', async () => {
        const a = await createCompany()
        const b = await createCompany()
        const jobB = await createJob(b.company)

        const res = await request(app).post('/api/company/change-visiblity').set('token', a.token).send({ id: String(jobB._id) })

        assert.equal(res.status, 404)
        assert.equal((await Job.findById(jobB._id)).visible, true)
    })

    it('only lists its own applicants', async () => {
        const a = await createCompany()
        const b = await createCompany()
        const user = await createUser()
        const jobA = await createJob(a.company)
        const jobB = await createJob(b.company)
        await JobApplication.create({ userId: user._id, companyId: a.company._id, jobId: jobA._id, date: Date.now() })
        await JobApplication.create({ userId: user._id, companyId: b.company._id, jobId: jobB._id, date: Date.now() })

        const res = await request(app).get('/api/company/applicants').set('token', a.token)

        assert.equal(res.status, 200)
        assert.equal(res.body.applications.length, 1)
        assert.equal(String(res.body.applications[0].companyId), String(a.company._id))
    })
})

describe('Recruiter JWT sessions', () => {
    it('rejects missing, forged and expired tokens with 401', async () => {
        const { company } = await createCompany()

        assert.equal((await request(app).get('/api/company/company')).status, 401)
        assert.equal((await request(app).get('/api/company/company').set('token', 'not-a-jwt')).status, 401)

        const forged = (await import('jsonwebtoken')).default.sign({ id: String(company._id) }, 'some-other-secret')
        assert.equal((await request(app).get('/api/company/company').set('token', forged)).status, 401)

        const expired = await request(app).get('/api/company/company').set('token', expiredToken(company._id))
        assert.equal(expired.status, 401)
        assert.match(expired.body.message, /expired/i)
    })

    it('blocks suspended companies with 403', async () => {
        const { token } = await createCompany({ status: 'suspended' })
        const res = await request(app).get('/api/company/company').set('token', token)
        assert.equal(res.status, 403)
    })

    it('never returns the password hash', async () => {
        const { token } = await createCompany()
        const res = await request(app).get('/api/company/company').set('token', token)
        assert.equal(res.status, 200)
        assert.equal(res.body.company.password, undefined)
    })

    it('job seekers (Clerk session, no recruiter token) cannot use recruiter APIs', async () => {
        const user = await createUser()
        const res = await request(app).get('/api/company/applicants').set('x-test-user', user._id)
        assert.equal(res.status, 401)
    })
})

describe('Recruiter login', () => {
    it('gives the same response for unknown email and wrong password', async () => {
        await createCompany({ email: 'real@example.com', password: 'right-password-1' })

        const unknown = await request(app).post('/api/company/login').send({ email: 'nobody@example.com', password: 'whatever-123' })
        const wrong = await request(app).post('/api/company/login').send({ email: 'real@example.com', password: 'wrong-password-1' })

        assert.equal(unknown.status, 401)
        assert.equal(wrong.status, 401)
        assert.equal(unknown.body.message, wrong.body.message)
    })

    it('logs in with the right password (case-insensitive email)', async () => {
        await createCompany({ email: 'real@example.com', password: 'right-password-1' })
        const res = await request(app).post('/api/company/login').send({ email: 'REAL@example.com', password: 'right-password-1' })
        assert.equal(res.status, 200)
        assert.ok(res.body.token)
    })

    it('rejects NoSQL operator injection in credentials', async () => {
        await createCompany()
        const res = await request(app).post('/api/company/login').send({ email: { $gt: '' }, password: { $gt: '' } })
        assert.equal(res.status, 400)
    })

    it('rate limits repeated login attempts', async () => {
        const limited = makeApp({ rateLimits: { login: 3, register: 3 } })
        const attempt = () => request(limited).post('/api/company/login').send({ email: 'x@example.com', password: 'nope-nope-1' })
        for (let i = 0; i < 3; i++) assert.equal((await attempt()).status, 401)
        const blocked = await attempt()
        assert.equal(blocked.status, 429)
        assert.equal(blocked.body.success, false)
    })

    it('validates registration input', async () => {
        const weak = await request(app).post('/api/company/register')
            .field('name', 'Acme').field('email', 'acme@example.com').field('password', 'short')
            .attach('image', PNG_BYTES, { filename: 'logo.png', contentType: 'image/png' })
        assert.equal(weak.status, 400)

        const ok = await request(app).post('/api/company/register')
            .field('name', 'Acme').field('email', 'acme@example.com').field('password', 'long-enough-password')
            .attach('image', PNG_BYTES, { filename: 'logo.png', contentType: 'image/png' })
        assert.equal(ok.status, 201)
        assert.ok(ok.body.token)

        const dup = await request(app).post('/api/company/register')
            .field('name', 'Acme 2').field('email', 'ACME@example.com').field('password', 'long-enough-password')
            .attach('image', PNG_BYTES, { filename: 'logo.png', contentType: 'image/png' })
        assert.equal(dup.status, 409)
    })
})

describe('Stored XSS', () => {
    it('sanitizes job descriptions on create', async () => {
        const { token } = await createCompany()
        const res = await request(app).post('/api/company/post-job').set('token', token).send({
            title: 'Backend Engineer',
            description: '<p onclick="steal()">Great role building APIs</p><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">click</a><a href="https://example.com">site</a><iframe src="https://evil.test"></iframe>',
            location: 'Mumbai', category: 'Programming', level: 'Senior level', salary: '150000',
        })
        assert.equal(res.status, 201)
        const html = (await Job.findById(res.body.newJob._id)).description
        assert.doesNotMatch(html, /<script|onerror|onclick|javascript:|<iframe|<img/i)
        assert.match(html, /Great role building APIs/)
        assert.match(html, /href="https:\/\/example.com"/)
        assert.match(html, /rel="noopener noreferrer nofollow"/)
    })

    it('rejects descriptions that are empty once sanitized', async () => {
        const { token } = await createCompany()
        const res = await request(app).post('/api/company/post-job').set('token', token).send({
            title: 'Backend Engineer', description: '<script>alert(1)</script><p><br></p>',
            location: 'Mumbai', category: 'Programming', level: 'Senior level', salary: 1000,
        })
        assert.equal(res.status, 400)
    })
})

describe('Job seeker authentication', () => {
    it('returns 401 on every job-seeker endpoint without a session', async () => {
        const job = await createJob((await createCompany()).company)
        const checks = [
            request(app).get('/api/users/user'),
            request(app).get('/api/users/applications'),
            request(app).post('/api/users/apply').send({ jobId: String(job._id) }),
            request(app).post('/api/users/update-resume').attach('resume', PDF_BYTES, { filename: 'cv.pdf', contentType: 'application/pdf' }),
        ]
        for (const res of await Promise.all(checks)) assert.equal(res.status, 401)
    })

    it('returns 404 (not a crash) when the session user has no database record', async () => {
        const res = await request(app).get('/api/users/user').set('x-test-user', 'user_missing')
        assert.equal(res.status, 404)
        assert.equal(res.body.success, false)
    })

    it('creates the missing record from Clerk when available', async () => {
        const withClerk = makeApp({
            loadClerkUser: async (id) => ({ id, firstName: 'Ada', lastName: null, imageUrl: 'https://img.clerk.test/a.png', primaryEmailAddressId: 'e1', emailAddresses: [{ id: 'e1', emailAddress: 'Ada@Example.com' }] }),
        })
        const res = await request(withClerk).get('/api/users/user').set('x-test-user', 'user_lazy')
        assert.equal(res.status, 200)
        assert.equal(res.body.user.name, 'Ada')
        assert.equal(res.body.user.email, 'ada@example.com')
        assert.equal(res.body.user.role, 'candidate')
    })

    it('blocks suspended job seekers from applying', async () => {
        const job = await createJob((await createCompany()).company)
        const user = await createUser({ status: 'suspended' })
        const res = await request(app).post('/api/users/apply').set('x-test-user', user._id).send({ jobId: String(job._id) })
        assert.equal(res.status, 403)
    })
})

describe('Applications', () => {
    it('requires a resume, blocks duplicates, and hides non-public jobs', async () => {
        const { company } = await createCompany()
        const job = await createJob(company)
        const hidden = await createJob(company, { visible: false })
        const noResume = await createUser({ resume: '' })
        const user = await createUser()

        assert.equal((await request(app).post('/api/users/apply').set('x-test-user', noResume._id).send({ jobId: String(job._id) })).status, 400)
        assert.equal((await request(app).post('/api/users/apply').set('x-test-user', user._id).send({ jobId: String(job._id) })).status, 201)
        assert.equal((await request(app).post('/api/users/apply').set('x-test-user', user._id).send({ jobId: String(job._id) })).status, 409)
        assert.equal((await request(app).post('/api/users/apply').set('x-test-user', user._id).send({ jobId: String(hidden._id) })).status, 404)
        assert.equal((await request(app).post('/api/users/apply').set('x-test-user', user._id).send({ jobId: 'not-an-id' })).status, 400)
    })

    it('keeps application history readable after a job is deleted', async () => {
        const { company } = await createCompany()
        const job = await createJob(company)
        const user = await createUser()
        await JobApplication.create({ userId: user._id, companyId: company._id, jobId: job._id, date: Date.now() })
        await Job.deleteOne({ _id: job._id })

        const res = await request(app).get('/api/users/applications').set('x-test-user', user._id)
        assert.equal(res.status, 200)
        assert.equal(res.body.applications.length, 1)
        assert.equal(res.body.applications[0].jobId, null)
    })
})

describe('File uploads', () => {
    it('accepts a real PDF resume', async () => {
        const user = await createUser({ resume: '' })
        const res = await request(app).post('/api/users/update-resume').set('x-test-user', user._id)
            .attach('resume', PDF_BYTES, { filename: 'cv.pdf', contentType: 'application/pdf' })
        assert.equal(res.status, 200)
        assert.match((await User.findById(user._id)).resume, /shortlist\/resumes/)
        assert.equal(uploads.at(-1).options.resource_type, 'raw')
    })

    it('rejects missing files, non-PDF types, disguised files and oversized files', async () => {
        const user = await createUser()
        const send = (buf, opts) => request(app).post('/api/users/update-resume').set('x-test-user', user._id).attach('resume', buf, opts)

        assert.equal((await request(app).post('/api/users/update-resume').set('x-test-user', user._id)).status, 400)
        assert.equal((await send(Buffer.from('MZ executable'), { filename: 'cv.exe', contentType: 'application/octet-stream' })).status, 400)
        assert.equal((await send(Buffer.from('<html><script>alert(1)</script>'), { filename: 'cv.pdf', contentType: 'application/pdf' })).status, 400)
        const big = Buffer.concat([PDF_BYTES, Buffer.alloc(4 * 1024 * 1024 + 10)])
        assert.equal((await send(big, { filename: 'cv.pdf', contentType: 'application/pdf' })).status, 413)
        assert.equal(uploads.length, 0)
    })

    it('rejects SVG and disguised logos', async () => {
        const svg = await request(app).post('/api/company/register')
            .field('name', 'Acme').field('email', 'svg@example.com').field('password', 'long-enough-password')
            .attach('image', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'logo.svg', contentType: 'image/svg+xml' })
        assert.equal(svg.status, 400)

        const fake = await request(app).post('/api/company/register')
            .field('name', 'Acme').field('email', 'fake@example.com').field('password', 'long-enough-password')
            .attach('image', Buffer.from('not really a png at all'), { filename: 'logo.png', contentType: 'image/png' })
        assert.equal(fake.status, 400)
    })

    it('returns 502 when Cloudinary fails', async () => {
        const user = await createUser()
        setUploader(async () => { throw new Error('cloudinary down') })
        try {
            const res = await request(app).post('/api/users/update-resume').set('x-test-user', user._id)
                .attach('resume', PDF_BYTES, { filename: 'cv.pdf', contentType: 'application/pdf' })
            assert.equal(res.status, 502)
            assert.doesNotMatch(res.body.message, /cloudinary down/)
        } finally {
            setUploader(async (buffer, options) => ({ secure_url: `https://res.cloudinary.test/${options.folder}/x` }))
        }
    })
})

describe('Clerk webhooks', () => {
    it('rejects bad signatures', async () => {
        const res = await request(app).post('/webhooks').set({ 'svix-id': 'x', 'svix-timestamp': '1', 'svix-signature': 'v1,bad', 'content-type': 'application/json' }).send('{}')
        assert.equal(res.status, 400)
    })

    it('creates users (null last name handled) and never changes role on update', async () => {
        const created = signWebhook({ type: 'user.created', data: { id: 'user_wh', first_name: 'Grace', last_name: null, image_url: 'https://img/x.png', primary_email_address_id: 'e1', email_addresses: [{ id: 'e1', email_address: 'grace@example.com' }] } })
        assert.equal((await request(app).post('/webhooks').set(created.headers).send(created.body)).status, 200)
        assert.equal((await User.findById('user_wh')).name, 'Grace')

        await User.updateOne({ _id: 'user_wh' }, { role: 'admin' })
        const updated = signWebhook({ type: 'user.updated', data: { id: 'user_wh', first_name: 'Grace', last_name: 'Hopper', role: 'candidate', image_url: 'https://img/x.png', email_addresses: [{ id: 'e1', email_address: 'grace@example.com' }] } })
        assert.equal((await request(app).post('/webhooks').set(updated.headers).send(updated.body)).status, 200)
        const u = await User.findById('user_wh')
        assert.equal(u.name, 'Grace Hopper')
        assert.equal(u.role, 'admin')
    })

    it('acknowledges unsupported event types instead of hanging', async () => {
        const evt = signWebhook({ type: 'session.created', data: { id: 'sess_1' } })
        const res = await request(app).post('/webhooks').set(evt.headers).send(evt.body)
        assert.equal(res.status, 200)
    })
})

describe('API hardening', () => {
    it('removed the debug route and returns JSON 404s', async () => {
        const res = await request(app).get('/debug-sentry')
        assert.equal(res.status, 404)
        assert.equal(res.body.success, false)
    })

    it('returns 400 for malformed JSON without leaking internals', async () => {
        const res = await request(app).post('/api/company/login').set('content-type', 'application/json').send('{"email":')
        assert.equal(res.status, 400)
        assert.equal(res.body.message, 'Malformed request body')
    })

    it('sets secure headers and hides the framework', async () => {
        const res = await request(app).get('/api/health')
        assert.equal(res.headers['x-powered-by'], undefined)
        assert.equal(res.headers['x-content-type-options'], 'nosniff')
        assert.ok(res.headers['strict-transport-security'])
    })

    it('only allows configured CORS origins', async () => {
        const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173')
        assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173')
        const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example')
        assert.equal(denied.headers['access-control-allow-origin'], undefined)
    })

    it('hides jobs that are not public', async () => {
        const { company } = await createCompany()
        const suspended = (await createCompany({ status: 'suspended' })).company
        const visible = await createJob(company)
        const hidden = await createJob(company, { visible: false })
        const rejected = await createJob(company, { moderationStatus: 'rejected' })
        const fromSuspended = await createJob(suspended)

        const list = await request(app).get('/api/jobs')
        assert.deepEqual(list.body.jobs.map((j) => j._id), [String(visible._id)])
        assert.equal(list.body.jobs[0].companyId.password, undefined)

        for (const j of [hidden, rejected, fromSuspended]) {
            assert.equal((await request(app).get(`/api/jobs/${j._id}`)).status, 404)
        }
        assert.equal((await request(app).get('/api/jobs/not-an-id')).status, 404)
    })

    it('treats jobs created before moderation existed as public', async () => {
        const { company } = await createCompany()
        const legacy = await createJob(company)
        await Job.collection.updateOne({ _id: legacy._id }, { $unset: { moderationStatus: '' } })
        const res = await request(app).get(`/api/jobs/${legacy._id}`)
        assert.equal(res.status, 200)
    })

    it('reads existing company passwords only for login', async () => {
        const { company } = await createCompany()
        const fresh = await Company.findById(company._id)
        assert.equal(fresh.password, undefined)
    })
})
