// LOCAL DEVELOPMENT SANDBOX — not used in production.
// Starts the real API against a throwaway in-memory MongoDB filled with local fixtures,
// so the UI can be exercised without touching a real database, Clerk or Cloudinary.
//
//   node tests/sandbox-server.js            (API on http://localhost:5056)
//
// Recruiter login for the sandbox: sandbox-recruiter@example.com / sandbox-password
import { MongoMemoryServer } from 'mongodb-memory-server-core'
import bcrypt from 'bcrypt'

process.env.NODE_ENV = 'development'
process.env.JWT_SECRET = 'sandbox-only-secret-not-for-production-use-0123456789'
process.env.CLIENT_URLS = 'http://localhost:5173,http://localhost:4173'

const mongod = await MongoMemoryServer.create()
process.env.MONGODB_URI = mongod.getUri()

const { default: connectDB } = await import('../config/db.js')
const { createApp } = await import('../app.js')
const { setUploader } = await import('../services/storage.js')
const { default: Company } = await import('../models/Company.js')
const { default: Job } = await import('../models/Job.js')
const { default: User } = await import('../models/User.js')
const { default: JobApplication } = await import('../models/JobApplication.js')

await connectDB()

// Uploads are kept in memory and served back as data URLs
setUploader(async (buffer, options) => ({
    secure_url: options.resource_type === 'raw'
        ? 'data:application/pdf;base64,' + buffer.toString('base64')
        : `data:image/png;base64,${buffer.toString('base64')}`,
}))

const logo = (letter, bg) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="32" y="42" font-family="Helvetica,Arial" font-size="30" font-weight="700" fill="white" text-anchor="middle">${letter}</text></svg>`)}`

const password = await bcrypt.hash('sandbox-password', 10)
const companies = await Company.create([
    { name: 'Northwind Labs', email: 'sandbox-recruiter@example.com', password, image: logo('N', '#3F47EE'), industry: 'Developer tools', location: 'Bangalore', website: 'https://northwind.example', about: 'Northwind builds developer tooling used by engineering teams to ship faster.' },
    { name: 'Helio Health', email: 'helio@example.com', password, image: logo('H', '#0EA5E9'), industry: 'Healthcare', location: 'Mumbai' },
    { name: 'Quanta Analytics', email: 'quanta@example.com', password, image: logo('Q', '#10B981'), industry: 'Data', location: 'Hyderabad' },
    { name: 'Atlas Security', email: 'atlas@example.com', password, image: logo('A', '#F43F5E'), industry: 'Security', location: 'New York' },
])

const desc = (role) => `<p>We are looking for a ${role} to join a small, senior team.</p><h3>What you'll do</h3><ul><li>Own features end to end</li><li>Work closely with design and product</li><li>Review code and mentor teammates</li></ul><h3>What we're looking for</h3><ul><li>Strong fundamentals and clear communication</li><li>Experience shipping production software</li></ul><p>Read more on <a href="https://example.com">our engineering blog</a>.</p>`

const DAY = 86400000
const now = Date.now()
const specs = [
    ['Senior Frontend Engineer', 0, 'Programming', 'Bangalore', 'Senior level', 3200000, 'Full-time', 1],
    ['Product Designer', 0, 'Designing', 'Bangalore', 'Intermediate level', 1800000, 'Full-time', 2],
    ['Data Scientist', 2, 'Data Science', 'Hyderabad', 'Intermediate level', 2400000, 'Full-time', 3],
    ['Security Engineer', 3, 'Cybersecurity', 'New York', 'Senior level', 150000, 'Contract', 4],
    ['Growth Marketing Manager', 1, 'Marketing', 'Mumbai', 'Intermediate level', 1500000, 'Full-time', 5],
    ['Network Engineer', 3, 'Networking', 'New York', 'Beginner level', 90000, 'Full-time', 6],
    ['Backend Engineer (Node.js)', 0, 'Programming', 'Bangalore', 'Intermediate level', 2200000, 'Full-time', 7],
    ['Engineering Manager', 2, 'Management', 'Hyderabad', 'Senior level', 4500000, 'Full-time', 8],
    ['Frontend Intern', 0, 'Programming', 'Bangalore', 'Beginner level', 300000, 'Internship', 9],
    ['Clinical Data Analyst', 1, 'Data Science', 'Mumbai', 'Beginner level', 800000, 'Part-time', 10],
    ['Hidden draft role', 0, 'Programming', 'Bangalore', 'Senior level', 100000, 'Full-time', 11, { visible: false }],
    ['Rejected listing', 0, 'Marketing', 'Chennai', 'Beginner level', 1000, 'Full-time', 12, { moderationStatus: 'rejected', moderationReason: 'Salary looks misleading' }],
    ['Mobile Engineer (React Native)', 2, 'Programming', 'Chennai', 'Intermediate level', 2000000, 'Full-time', 13],
]
const jobs = await Job.create(specs.map(([title, c, category, location, level, salary, jobType, age, extra]) => ({
    title, companyId: companies[c]._id, category, location, level, salary, jobType, date: now - age * DAY, description: desc(title), ...extra,
})))

const users = await User.create([
    { _id: 'user_sandbox_1', name: 'Priya Sharma', email: 'priya@example.com', image: logo('P', '#8B5CF6'), resume: 'data:application/pdf;base64,JVBERi0xLjQK' },
    { _id: 'user_sandbox_2', name: 'Arjun Mehta', email: 'arjun@example.com', image: logo('A', '#F59E0B'), resume: 'data:application/pdf;base64,JVBERi0xLjQK' },
    { _id: 'user_sandbox_3', name: 'Lena Fischer', email: 'lena@example.com', image: logo('L', '#14B8A6'), resume: '' },
])

await JobApplication.create([
    { userId: users[0]._id, companyId: companies[0]._id, jobId: jobs[0]._id, date: now - 1 * DAY, status: 'Pending' },
    { userId: users[1]._id, companyId: companies[0]._id, jobId: jobs[0]._id, date: now - 2 * DAY, status: 'Accepted' },
    { userId: users[1]._id, companyId: companies[0]._id, jobId: jobs[1]._id, date: now - 3 * DAY, status: 'Rejected' },
    { userId: users[0]._id, companyId: companies[2]._id, jobId: jobs[2]._id, date: now - 1 * DAY, status: 'Pending' },
])

const app = createApp({ useClerk: false, getUserId: (req) => req.headers['x-test-user'] ?? null, loadClerkUser: async () => null })
const PORT = process.env.SANDBOX_PORT || 5056
const server = app.listen(PORT, () => console.log(`Sandbox API ready on http://localhost:${PORT}`))

const shutdown = async () => {
    server.close()
    await mongod.stop()
    process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
