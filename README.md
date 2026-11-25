# Shortlist

**Shortlist** is a recruitment platform connecting talented candidates with companies that are hiring. Candidates search roles, apply with their resume and track every application. Recruiters post and manage jobs and review applicants. Admins moderate listings and accounts.

## Features

**Candidates** (signed in with Clerk)
- Job search with keyword, location, category, experience level, job type and salary filters, plus sorting and pagination; every search is a shareable URL
- One-click applications using an uploaded PDF resume
- Dashboard: application status tracking, saved jobs, profile and resume management

**Recruiters** (company email and password)
- Post, edit, hide and delete jobs (rich-text descriptions)
- Review applicants, open or download resumes, accept or reject, see a candidate's applications across your roles
- Company profile: logo, about, website, location, industry

**Admins**
- Platform statistics
- Job moderation: approve, reject, hide or remove listings, with reasons shown to recruiters
- Suspend and reactivate job seekers and recruiters
- Application monitoring and a full moderation audit log

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS 3, React Router 7, Axios, Clerk React, Quill, React Toastify, lucide-react, DOMPurify |
| Backend | Node.js, Express 4, Mongoose 8 (MongoDB Atlas), Clerk Express + Svix webhooks, JWT + bcrypt, Multer + Cloudinary, helmet, express-rate-limit, sanitize-html, Sentry (optional) |
| Hosting | Vercel (two projects: `client/` and `server/`) |

## Architecture

```
Browser ── React SPA (client/) ──HTTPS──▶ Express API (server/) ──▶ MongoDB Atlas
              │                               │
              │ Clerk sign-in (candidates)    ├──▶ Cloudinary (logos, resumes)
              ▼                               │
           Clerk ──── webhooks (user sync) ───┘
```

- **Candidates and admins** authenticate with Clerk. The API verifies the Clerk session on `/api/users/*` and `/api/admin/*`. A Clerk webhook keeps the `users` collection in sync, and if the webhook was missed the record is created on first request.
- **Recruiters** authenticate with email and password. The API issues a 7-day HS256 JWT, which is sent in the `token` header to `/api/company/*`.
- **Admins** are regular Clerk users whose database record has `role: "admin"`. The role can only be granted with the provisioning script (see [Admin accounts](#admin-accounts)). No API endpoint can change it.
- Every ownership and role check happens on the server. Frontend route guards only improve the experience.

### Folder structure

```
client/
  public/                 favicon, OG image
  src/
    components/
      brand/              Logo
      ui/                 Design-system primitives (Button, Field, Modal, Badge…)
      layout/             PublicLayout, DashboardLayout, route guards
      jobs/ candidate/ recruiter/
    context/AppContext.jsx  Recruiter + candidate session state
    hooks/                useQuery, usePageMeta
    lib/                  api.js (all HTTP calls), constants, format, sanitize, validation
    pages/                Home, Jobs, JobDetail, RecruiterAuth, candidate/, recruiter/, admin/
server/
  app.js                  Express app factory (security middleware, routes)
  server.js               Entry point (local listen / Vercel handler)
  config/                 db (cached connection), cloudinary, multer, env checks, Sentry
  controllers/            company, job, user, admin, webhooks
  middleware/             auth (recruiter JWT, Clerk user, admin), error handler
  models/                 User, Company, Job, JobApplication, SavedJob, ModerationLog
  routes/                 company, job, user, admin
  services/               jobs (visibility, deletion), storage (Cloudinary), userSync
  scripts/admin.js        Admin provisioning
  tests/                  node:test suite + local sandbox server
```

## Local setup

Requirements: Node.js 20+, a MongoDB Atlas cluster, and Cloudinary and Clerk accounts.

```bash
# 1. Backend
cd server
cp .env.example .env        # fill in real values (see below)
npm install
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd client
cp .env.example .env        # fill in real values
npm install
npm run dev                 # http://localhost:5173
```

### Environment variables

**server/.env**

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string. Query options are fine, e.g. `...mongodb.net/?retryWrites=true` |
| `MONGODB_DB` | no | Database name. Defaults to `job-portal` (where the original app stored data) |
| `JWT_SECRET` | yes | Long random string, at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URLS` | yes in production | Comma-separated allowed browser origins, e.g. `https://shortlist.vercel.app`. A `*` matches one subdomain label (for preview URLs) |
| `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_SECRET_KEY` | yes | Cloudinary dashboard |
| `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | yes | Clerk dashboard → API keys |
| `CLERK_WEBHOOK_SECRET` | yes | Clerk dashboard → Webhooks → your endpoint's signing secret |
| `SENTRY_DSN` | no | Enables Sentry error reporting |
| `PORT` | no | Local port (default 5000) |

The server prints a `[config]` warning at startup for anything missing, still a placeholder, or too weak.

**client/.env**: only public values belong here (everything prefixed `VITE_` ends up in the browser bundle).

| Variable | Notes |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_…` / `pk_live_…`) |
| `VITE_BACKEND_URL` | API base URL, e.g. `http://localhost:5000` or `https://shortlist-api.vercel.app` (no trailing slash) |

### Clerk setup

1. Create a Clerk application and copy the keys into both `.env` files.
2. Add a webhook endpoint `https://<your-api>/webhooks` subscribed to `user.created`, `user.updated` and `user.deleted`. Copy its signing secret to `CLERK_WEBHOOK_SECRET`.
3. In production, add your frontend domain in Clerk and use the `pk_live_`/`sk_live_` keys.

### Admin accounts

Admins sign in with a normal Clerk account. To grant access, the person must have signed in once; then run from `server/` (with the production `MONGODB_URI` in `server/.env`):

```bash
npm run admin -- promote someone@example.com
npm run admin -- list
npm run admin -- demote someone@example.com
```

## Testing

```bash
cd server && npm test        # 66 API tests against an in-memory MongoDB (downloads mongod on first run)
cd client && npm run lint && npm run build
```

The API tests cover authorization (cross-company access, admin-only routes, role escalation), XSS sanitization, uploads (type, signature and size checks), expired and forged JWTs, rate limiting, CORS, webhooks, search filters, saved jobs, job edit/delete, company profile and moderation.

To click through the UI without real credentials, run the sandbox API (in-memory database with local fixture data, never used in production):

```bash
cd server && node tests/sandbox-server.js     # API on :5056, recruiter: sandbox-recruiter@example.com / sandbox-password
cd client && VITE_BACKEND_URL=http://localhost:5056 npm run dev
```

## Deploying to Vercel

Create **two Vercel projects** from the same GitHub repository.

**1. API (`server/`)**
- Root directory: `server`
- Framework preset: Other (`vercel.json` routes all requests to `server.js`)
- Environment variables: everything in the server table above, with `CLIENT_URLS` set to the frontend's production URL
- After the first deploy, set the Clerk webhook URL to `https://<api-domain>/webhooks`

**2. Frontend (`client/`)**
- Root directory: `client`
- Framework preset: Vite (build `npm run build`, output `dist`)
- Environment variables: `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_BACKEND_URL=https://<api-domain>`
- `vercel.json` handles SPA routing, long-term caching for hashed assets, and security headers

**Production checklist**
- [ ] `JWT_SECRET` is a fresh 32+ character random value (changing it signs out all recruiters)
- [ ] `CLIENT_URLS` matches the frontend URL exactly (scheme + host, no trailing slash)
- [ ] MongoDB Atlas network access allows Vercel (Vercel uses dynamic IPs, so allow `0.0.0.0/0` with strong credentials, or use Atlas's Vercel integration)
- [ ] Clerk production instance has the frontend domain, and the webhook points at the API
- [ ] Cloudinary: new resumes are stored as raw files. Older resumes uploaded as images may need *Settings → Security → Allow delivery of PDF and ZIP files* enabled
- [ ] Promote at least one admin with `npm run admin -- promote <email>`

**Limits**: Vercel caps request bodies at 4.5 MB, so resumes are limited to 4 MB and logos to 2 MB. Rate limiting is per serverless instance (in memory). For strict global limits, put a shared store such as Redis behind `express-rate-limit`.

## Database changes

All changes are **additive**. Existing documents keep working without a migration.

| Collection | Change |
|---|---|
| `users` | `role` (`candidate` default / `admin`), `status` (`active` / `suspended`), `statusReason`, timestamps |
| `companies` | `about`, `website`, `location`, `industry`, `status`, `statusReason`, timestamps; `password` is excluded from queries by default |
| `jobs` | `jobType` (optional), `moderationStatus` (missing = approved), `moderationReason`, timestamps; indexes for listing, company and salary queries |
| `jobapplications` | `jobRemoved` + `jobSnapshot` (keeps history readable after a job is deleted); status enum; **unique index on (userId, jobId)** |
| `savedjobs` | New collection: one bookmark per (userId, jobId) |
| `moderationlogs` | New collection: admin audit trail |

Mongoose builds the new indexes on startup. If the existing data somehow contains duplicate applications for the same user and job, the unique index won't build. Mongoose logs the error, the app keeps working, and the application code still blocks new duplicates.

## License

Proprietary. All rights reserved.
