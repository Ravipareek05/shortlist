import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { clearDb, createCompany, createJob, createUser, makeApp, PNG_BYTES, startDb, stopDb } from './helpers.js'
import Job from '../models/Job.js'
import JobApplication from '../models/JobApplication.js'
import SavedJob from '../models/SavedJob.js'
import User from '../models/User.js'
import Company from '../models/Company.js'
import ModerationLog from '../models/ModerationLog.js'

const app = makeApp()

before(startDb)
after(stopDb)
beforeEach(clearDb)

const DAY = 24 * 60 * 60 * 1000

describe('Feature 1: advanced job search', () => {
    const seed = async () => {
        const acme = (await createCompany({ name: 'Acme Robotics' })).company
        const globex = (await createCompany({ name: 'Globex' })).company
        const now = Date.now()
        const jobs = {
            react: await createJob(acme, { title: 'React Developer', location: 'Bangalore', category: 'Programming', level: 'Beginner level', salary: 50000, jobType: 'Full-time', date: now - 1 * DAY }),
            data: await createJob(acme, { title: 'Data Scientist', location: 'Mumbai', category: 'Data Science', level: 'Senior level', salary: 200000, jobType: 'Contract', date: now - 2 * DAY }),
            design: await createJob(globex, { title: 'Product Designer', location: 'New York', category: 'Designing', level: 'Intermediate level', salary: 120000, jobType: 'Full-time', date: now - 3 * DAY }),
            backend: await createJob(globex, { title: 'Senior Backend Engineer', location: 'Bangalore', category: 'Programming', level: 'Senior level', salary: 180000, jobType: 'Part-time', date: now - 4 * DAY }),
            hidden: await createJob(globex, { title: 'Hidden React Role', visible: false }),
        }
        return { acme, globex, jobs }
    }
    const ids = (res) => res.body.jobs.map((j) => j.title)

    it('searches by keyword across title, category and company name', async () => {
        await seed()
        assert.deepEqual(ids(await request(app).get('/api/jobs?q=react')), ['React Developer'])
        assert.deepEqual(ids(await request(app).get('/api/jobs?q=globex')), ['Product Designer', 'Senior Backend Engineer'])
        assert.deepEqual(ids(await request(app).get('/api/jobs?q=data%20science')), ['Data Scientist'])
    })

    it('treats regex characters in the keyword literally', async () => {
        await seed()
        const res = await request(app).get('/api/jobs?q=.*')
        assert.equal(res.status, 200)
        assert.equal(res.body.jobs.length, 0)
    })

    it('combines location, category, level, type and salary filters', async () => {
        await seed()
        const res = await request(app).get('/api/jobs?locations=Bangalore&category=Programming&level=Senior%20level&type=Part-time&minSalary=100000&maxSalary=190000')
        assert.deepEqual(ids(res), ['Senior Backend Engineer'])

        assert.deepEqual(ids(await request(app).get('/api/jobs?location=york')), ['Product Designer'])
        assert.deepEqual(ids(await request(app).get('/api/jobs?category=Programming,Designing')), ['React Developer', 'Product Designer', 'Senior Backend Engineer'])
        assert.deepEqual(ids(await request(app).get('/api/jobs?minSalary=150000')), ['Data Scientist', 'Senior Backend Engineer'])
    })

    it('sorts and paginates', async () => {
        await seed()
        assert.deepEqual(ids(await request(app).get('/api/jobs?sort=salary_desc')), ['Data Scientist', 'Senior Backend Engineer', 'Product Designer', 'React Developer'])
        assert.deepEqual(ids(await request(app).get('/api/jobs?sort=oldest&limit=2&page=2')), ['Data Scientist', 'React Developer'])
        const p = await request(app).get('/api/jobs?limit=3&page=2')
        assert.deepEqual(p.body.pagination, { page: 2, limit: 3, total: 4, totalPages: 2 })
    })

    it('ignores junk params and returns empty results cleanly', async () => {
        await seed()
        const junk = await request(app).get('/api/jobs?category=Nope&level[$ne]=x&minSalary=abc&page=-5&sort=evil')
        assert.equal(junk.status, 200)
        assert.equal(junk.body.jobs.length, 4)
        const none = await request(app).get('/api/jobs?q=zzzzzz')
        assert.equal(none.body.jobs.length, 0)
        assert.equal(none.body.pagination.total, 0)
    })

    it('returns real platform stats and facets', async () => {
        await seed()
        await createUser()
        const res = await request(app).get('/api/jobs/meta')
        assert.equal(res.status, 200)
        assert.deepEqual(res.body.stats, { openJobs: 4, hiringCompanies: 2, candidates: 1 })
        assert.equal(res.body.categories.find((c) => c.name === 'Programming').count, 2)
        assert.equal(res.body.featuredCompanies.length, 2)
        assert.equal(res.body.featuredCompanies[0].openJobs, 2)
        assert.equal(res.body.featuredCompanies[0].password, undefined)
    })

    it('excludes a job and filters by company for "related jobs"', async () => {
        const { acme, jobs } = await seed()
        const res = await request(app).get(`/api/jobs?company=${acme._id}&exclude=${jobs.react._id}`)
        assert.deepEqual(ids(res), ['Data Scientist'])
    })
})

describe('Feature 2: saved jobs', () => {
    it('saves, lists, prevents duplicates and removes', async () => {
        const job = await createJob((await createCompany()).company)
        const user = await createUser()
        const as = (r) => r.set('x-test-user', user._id)

        assert.equal((await as(request(app).post('/api/users/saved-jobs')).send({ jobId: String(job._id) })).status, 201)
        assert.equal((await as(request(app).post('/api/users/saved-jobs')).send({ jobId: String(job._id) })).status, 201)
        assert.equal(await SavedJob.countDocuments({ userId: user._id }), 1)

        const list = await as(request(app).get('/api/users/saved-jobs'))
        assert.equal(list.body.savedJobs.length, 1)
        assert.equal(list.body.savedJobs[0].available, true)
        assert.equal(list.body.savedJobs[0].job.title, job.title)

        assert.equal((await as(request(app).delete(`/api/users/saved-jobs/${job._id}`))).status, 200)
        assert.equal(await SavedJob.countDocuments({ userId: user._id }), 0)
    })

    it('flags hidden jobs and drops deleted ones', async () => {
        const { company, token } = await createCompany()
        const keep = await createJob(company, { title: 'Will be hidden' })
        const gone = await createJob(company, { title: 'Will be deleted' })
        const user = await createUser()
        await SavedJob.create([{ userId: user._id, jobId: keep._id }, { userId: user._id, jobId: gone._id }])

        await request(app).post('/api/company/change-visiblity').set('token', token).send({ id: String(keep._id) })
        await request(app).delete(`/api/company/jobs/${gone._id}`).set('token', token)

        const list = await request(app).get('/api/users/saved-jobs').set('x-test-user', user._id)
        assert.equal(list.body.savedJobs.length, 1)
        assert.equal(list.body.savedJobs[0].available, false)
        assert.equal(list.body.savedJobs[0].job.title, 'Will be hidden')
    })

    it('requires sign-in and blocks saving hidden jobs', async () => {
        const job = await createJob((await createCompany()).company, { visible: false })
        const user = await createUser()
        assert.equal((await request(app).get('/api/users/saved-jobs')).status, 401)
        assert.equal((await request(app).post('/api/users/saved-jobs').set('x-test-user', user._id).send({ jobId: String(job._id) })).status, 404)
    })

    it('keeps each user\'s saved jobs private', async () => {
        const job = await createJob((await createCompany()).company)
        const a = await createUser()
        const b = await createUser()
        await SavedJob.create({ userId: a._id, jobId: job._id })
        const list = await request(app).get('/api/users/saved-jobs').set('x-test-user', b._id)
        assert.equal(list.body.savedJobs.length, 0)
    })
})

describe('Feature 4: edit and delete jobs', () => {
    it('edits own jobs with validation and sanitization', async () => {
        const { company, token } = await createCompany()
        const job = await createJob(company)

        const res = await request(app).patch(`/api/company/jobs/${job._id}`).set('token', token).send({
            title: 'Staff Frontend Engineer', salary: 250000, level: 'Senior level', category: 'Programming', location: 'Mumbai', jobType: 'Contract',
            description: '<p>Updated role with lots of detail.</p><script>bad()</script>',
        })
        assert.equal(res.status, 200)
        const updated = await Job.findById(job._id)
        assert.equal(updated.title, 'Staff Frontend Engineer')
        assert.equal(updated.salary, 250000)
        assert.equal(updated.jobType, 'Contract')
        assert.doesNotMatch(updated.description, /script/)

        assert.equal((await request(app).patch(`/api/company/jobs/${job._id}`).set('token', token).send({ level: 'Wizard' })).status, 400)
        assert.equal((await request(app).patch(`/api/company/jobs/${job._id}`).set('token', token).send({})).status, 400)
    })

    it('cannot read, edit or delete another company\'s job', async () => {
        const a = await createCompany()
        const b = await createCompany()
        const jobB = await createJob(b.company, { title: 'Original' })

        assert.equal((await request(app).get(`/api/company/jobs/${jobB._id}`).set('token', a.token)).status, 404)
        assert.equal((await request(app).patch(`/api/company/jobs/${jobB._id}`).set('token', a.token).send({ title: 'Hijacked title' })).status, 404)
        assert.equal((await request(app).delete(`/api/company/jobs/${jobB._id}`).set('token', a.token)).status, 404)
        assert.equal((await Job.findById(jobB._id)).title, 'Original')
    })

    it('deleting a job archives its applications and removes bookmarks', async () => {
        const { company, token } = await createCompany()
        const job = await createJob(company, { title: 'Closing Role', location: 'Chennai' })
        const user = await createUser()
        await JobApplication.create({ userId: user._id, companyId: company._id, jobId: job._id, date: Date.now() })
        await SavedJob.create({ userId: user._id, jobId: job._id })

        const res = await request(app).delete(`/api/company/jobs/${job._id}`).set('token', token)
        assert.equal(res.status, 200)
        assert.equal(res.body.applicationsArchived, 1)
        assert.equal(await Job.countDocuments(), 0)
        assert.equal(await SavedJob.countDocuments(), 0)

        const appDoc = await JobApplication.findOne({ userId: user._id })
        assert.equal(appDoc.jobRemoved, true)
        assert.equal(appDoc.jobSnapshot.title, 'Closing Role')

        // Recruiter applicant list no longer shows it; candidate history still does
        assert.equal((await request(app).get('/api/company/applicants').set('token', token)).body.applications.length, 0)
        const history = await request(app).get('/api/users/applications').set('x-test-user', user._id)
        assert.equal(history.body.applications[0].jobSnapshot.title, 'Closing Role')
    })

    it('editing a rejected job sends it back for review', async () => {
        const { company, token } = await createCompany()
        const job = await createJob(company, { moderationStatus: 'rejected', moderationReason: 'Misleading salary' })
        const res = await request(app).patch(`/api/company/jobs/${job._id}`).set('token', token).send({ salary: 90000 })
        assert.equal(res.status, 200)
        assert.equal((await Job.findById(job._id)).moderationStatus, 'pending')
    })

    it('lists jobs with applicant stats in one request', async () => {
        const { company, token } = await createCompany()
        const job = await createJob(company)
        const u1 = await createUser()
        const u2 = await createUser()
        await JobApplication.create([
            { userId: u1._id, companyId: company._id, jobId: job._id, date: Date.now(), status: 'Accepted' },
            { userId: u2._id, companyId: company._id, jobId: job._id, date: Date.now() },
        ])
        const res = await request(app).get('/api/company/list-jobs').set('token', token)
        assert.equal(res.body.jobsData[0].applicants, 2)
        assert.deepEqual(res.body.jobsData[0].applicantStats, { pending: 1, accepted: 1, rejected: 0 })
    })
})

describe('Feature 5: company profile', () => {
    it('updates profile fields and logo for the logged-in company only', async () => {
        const { company, token } = await createCompany({ name: 'Old Name' })
        const other = await createCompany({ name: 'Other Co' })

        const res = await request(app).patch('/api/company/profile').set('token', token)
            .field('name', 'New Name').field('about', 'We build robots.').field('website', 'https://acme.example').field('location', 'Pune').field('industry', 'Robotics')
            .attach('image', PNG_BYTES, { filename: 'logo.png', contentType: 'image/png' })
        assert.equal(res.status, 200)
        assert.equal(res.body.company.name, 'New Name')
        assert.equal(res.body.company.website, 'https://acme.example/')
        assert.match(res.body.company.image, /shortlist\/logos/)

        const fresh = await Company.findById(company._id)
        assert.equal(fresh.industry, 'Robotics')
        assert.equal((await Company.findById(other.company._id)).name, 'Other Co')

        // Updated name appears on public job data
        await createJob(fresh)
        const jobs = await request(app).get('/api/jobs')
        assert.equal(jobs.body.jobs[0].companyId.name, 'New Name')
    })

    it('validates website, length and logo type, and ignores protected fields', async () => {
        const { company, token } = await createCompany()
        assert.equal((await request(app).patch('/api/company/profile').set('token', token).send({ website: 'javascript:alert(1)' })).status, 400)
        assert.equal((await request(app).patch('/api/company/profile').set('token', token).send({ about: 'x'.repeat(2001) })).status, 400)
        const svg = await request(app).patch('/api/company/profile').set('token', token)
            .attach('image', Buffer.from('<svg/>'), { filename: 'x.svg', contentType: 'image/svg+xml' })
        assert.equal(svg.status, 400)

        await request(app).patch('/api/company/profile').set('token', token).send({ name: 'Renamed', status: 'active', email: 'hijack@example.com', password: 'x' })
        const fresh = await Company.findById(company._id).select('+password')
        assert.equal(fresh.name, 'Renamed')
        assert.equal(fresh.email, company.email)
        assert.notEqual(fresh.password, 'x')
    })

    it('requires a recruiter session', async () => {
        assert.equal((await request(app).patch('/api/company/profile').send({ name: 'X Co' })).status, 401)
    })
})

describe('Feature 3: admin panel', () => {
    const setup = async () => {
        const admin = await createUser({ role: 'admin', name: 'Ada Admin' })
        const candidate = await createUser()
        const { company, token } = await createCompany()
        const job = await createJob(company)
        return { admin, candidate, company, token, job }
    }

    it('blocks anonymous users, candidates and recruiters from every admin endpoint', async () => {
        const { candidate, token, job, company } = await setup()
        const endpoints = [
            ['get', '/api/admin/stats'], ['get', '/api/admin/users'], ['get', '/api/admin/companies'],
            ['get', '/api/admin/jobs'], ['get', '/api/admin/applications'], ['get', '/api/admin/activity'],
            ['patch', `/api/admin/users/${candidate._id}/status`], ['patch', `/api/admin/companies/${company._id}/status`],
            ['patch', `/api/admin/jobs/${job._id}/moderation`], ['delete', `/api/admin/jobs/${job._id}`],
        ]
        for (const [method, url] of endpoints) {
            assert.equal((await request(app)[method](url)).status, 401, `anon ${method} ${url}`)
            assert.equal((await request(app)[method](url).set('x-test-user', candidate._id)).status, 403, `candidate ${method} ${url}`)
            assert.equal((await request(app)[method](url).set('token', token)).status, 401, `recruiter ${method} ${url}`)
        }
    })

    it('blocks suspended admins', async () => {
        const admin = await createUser({ role: 'admin', status: 'suspended' })
        assert.equal((await request(app).get('/api/admin/stats').set('x-test-user', admin._id)).status, 403)
    })

    it('users cannot escalate their own role through any API', async () => {
        const { candidate } = await setup()
        // Profile/webhook/admin-status endpoints all ignore role in the body
        await request(app).post('/api/users/update-resume').set('x-test-user', candidate._id).send({ role: 'admin' })
        await request(app).patch(`/api/admin/users/${candidate._id}/status`).set('x-test-user', candidate._id).send({ status: 'active', role: 'admin' })
        assert.equal((await User.findById(candidate._id)).role, 'candidate')
        assert.equal((await request(app).get('/api/admin/stats').set('x-test-user', candidate._id)).status, 403)
    })

    it('shows platform statistics', async () => {
        const { admin } = await setup()
        const res = await request(app).get('/api/admin/stats').set('x-test-user', admin._id)
        assert.equal(res.status, 200)
        assert.equal(res.body.stats.users.total, 2)
        assert.equal(res.body.stats.companies.total, 1)
        assert.equal(res.body.stats.jobs.total, 1)
    })

    it('suspends and reactivates candidates (with audit log), never admins or self', async () => {
        const { admin, candidate, job } = await setup()
        const as = (r) => r.set('x-test-user', admin._id)

        assert.equal((await as(request(app).patch(`/api/admin/users/${candidate._id}/status`)).send({ status: 'suspended' })).status, 400, 'reason required')
        assert.equal((await as(request(app).patch(`/api/admin/users/${candidate._id}/status`)).send({ status: 'suspended', reason: 'Spam applications', role: 'admin' })).status, 200)
        const suspended = await User.findById(candidate._id)
        assert.equal(suspended.status, 'suspended')
        assert.equal(suspended.role, 'candidate')
        assert.equal((await request(app).post('/api/users/apply').set('x-test-user', candidate._id).send({ jobId: String(job._id) })).status, 403)

        assert.equal((await as(request(app).patch(`/api/admin/users/${candidate._id}/status`)).send({ status: 'active' })).status, 200)
        assert.equal((await User.findById(candidate._id)).status, 'active')

        assert.equal((await as(request(app).patch(`/api/admin/users/${admin._id}/status`)).send({ status: 'suspended', reason: 'x' })).status, 400)
        const otherAdmin = await createUser({ role: 'admin' })
        assert.equal((await as(request(app).patch(`/api/admin/users/${otherAdmin._id}/status`)).send({ status: 'suspended', reason: 'x' })).status, 403)

        const logs = await ModerationLog.find().sort({ createdAt: 1 })
        assert.deepEqual(logs.map((l) => l.action), ['user.suspend', 'user.reactivate'])
        assert.equal(logs[0].actorId, admin._id)
    })

    it('suspending a company blocks its login and hides its jobs', async () => {
        const { admin, company, token, job } = await setup()
        const res = await request(app).patch(`/api/admin/companies/${company._id}/status`).set('x-test-user', admin._id).send({ status: 'suspended', reason: 'Fraudulent listings' })
        assert.equal(res.status, 200)
        assert.equal((await request(app).get('/api/company/company').set('token', token)).status, 403)
        assert.equal((await request(app).get(`/api/jobs/${job._id}`)).status, 404)
        assert.equal((await request(app).get('/api/jobs')).body.jobs.length, 0)
    })

    it('moderates jobs: reject, hide, approve, remove', async () => {
        const { admin, job, token } = await setup()
        const mod = (body) => request(app).patch(`/api/admin/jobs/${job._id}/moderation`).set('x-test-user', admin._id).send(body)

        assert.equal((await mod({ action: 'reject' })).status, 400, 'reason required')
        assert.equal((await mod({ action: 'reject', reason: 'Misleading' })).status, 200)
        assert.equal((await request(app).get(`/api/jobs/${job._id}`)).status, 404)
        const recruiterView = await request(app).get('/api/company/list-jobs').set('token', token)
        assert.equal(recruiterView.body.jobsData[0].moderationStatus, 'rejected')
        assert.equal(recruiterView.body.jobsData[0].moderationReason, 'Misleading')

        assert.equal((await mod({ action: 'approve' })).status, 200)
        assert.equal((await request(app).get(`/api/jobs/${job._id}`)).status, 200)

        assert.equal((await mod({ action: 'hide', reason: 'Duplicate' })).status, 200)
        // Recruiter visibility toggle cannot override an admin hide
        await request(app).post('/api/company/change-visiblity').set('token', token).send({ id: String(job._id) })
        await request(app).post('/api/company/change-visiblity').set('token', token).send({ id: String(job._id) })
        assert.equal((await request(app).get(`/api/jobs/${job._id}`)).status, 404)

        const filtered = await request(app).get('/api/admin/jobs?moderation=hidden').set('x-test-user', admin._id)
        assert.equal(filtered.body.jobs.length, 1)

        assert.equal((await request(app).delete(`/api/admin/jobs/${job._id}`).set('x-test-user', admin._id).send({ reason: 'Spam' })).status, 200)
        assert.equal(await Job.countDocuments(), 0)

        const activity = await request(app).get('/api/admin/activity').set('x-test-user', admin._id)
        assert.deepEqual(activity.body.activity.map((a) => a.action), ['job.delete', 'job.hide', 'job.approve', 'job.reject'])
    })

    it('lists users, companies and applications with search and filters', async () => {
        const { admin, candidate, company, job } = await setup()
        await JobApplication.create({ userId: candidate._id, companyId: company._id, jobId: job._id, date: Date.now(), status: 'Accepted' })
        const as = (url) => request(app).get(url).set('x-test-user', admin._id)

        const users = await as(`/api/admin/users?q=${encodeURIComponent(candidate.email)}`)
        assert.equal(users.body.users.length, 1)
        assert.equal(users.body.users[0].applications, 1)

        const companies = await as('/api/admin/companies')
        assert.equal(companies.body.companies[0].jobs, 1)
        assert.equal(companies.body.companies[0].password, undefined)

        assert.equal((await as('/api/admin/applications?status=Accepted')).body.applications.length, 1)
        assert.equal((await as('/api/admin/applications?status=Rejected')).body.applications.length, 0)
    })
})
