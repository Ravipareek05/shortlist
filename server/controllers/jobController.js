import Job from "../models/Job.js"
import Company from "../models/Company.js"
import User from "../models/User.js"
import { COMPANY_PUBLIC_FIELDS, isJobPublic, publicJobFilter } from "../services/jobs.js"
import { JOB_CATEGORIES, JOB_LEVELS, JOB_TYPES } from "../utils/constants.js"
import { notFound } from "../utils/httpError.js"
import { escapeRegex, isObjectId, listParam, number, pagination, paginationMeta } from "../utils/validate.js"

const SORTS = {
    newest: { date: -1, _id: -1 },
    oldest: { date: 1, _id: 1 },
    salary_desc: { salary: -1, date: -1 },
    salary_asc: { salary: 1, date: -1 },
}

// Builds a MongoDB filter from query params. Unknown values are ignored rather than erroring,
// so shared URLs with stale params still work.
export const buildJobQuery = async (query) => {
    const filter = await publicJobFilter()
    const and = []

    const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : ''
    if (q) {
        const rx = new RegExp(escapeRegex(q), 'i')
        const companyIds = await Company.find({ name: rx, status: { $ne: 'suspended' } }).distinct('_id')
        and.push({ $or: [{ title: rx }, { category: rx }, { companyId: { $in: companyIds } }] })
    }

    const location = typeof query.location === 'string' ? query.location.trim().slice(0, 100) : ''
    if (location) and.push({ location: new RegExp(escapeRegex(location), 'i') })

    const locations = listParam(query.locations)
    if (locations.length) and.push({ location: { $in: locations } })

    const categories = listParam(query.category, JOB_CATEGORIES)
    if (categories.length) and.push({ category: { $in: categories } })

    const levels = listParam(query.level, JOB_LEVELS)
    if (levels.length) and.push({ level: { $in: levels } })

    const types = listParam(query.type, JOB_TYPES)
    if (types.length) and.push({ jobType: { $in: types } })

    const safeNumber = (value) => {
        try { return number(value, { field: 'salary', required: false }) } catch { return undefined }
    }
    const minSalary = safeNumber(query.minSalary)
    const maxSalary = safeNumber(query.maxSalary)
    if (minSalary !== undefined || maxSalary !== undefined) {
        const salary = {}
        if (minSalary !== undefined) salary.$gte = minSalary
        if (maxSalary !== undefined) salary.$lte = maxSalary
        and.push({ salary })
    }

    if (isObjectId(query.company)) and.push({ companyId: query.company })
    if (isObjectId(query.exclude)) and.push({ _id: { $ne: query.exclude } })

    if (and.length) filter.$and = and
    return filter
}

// Search jobs: GET /api/jobs?q=&location=&locations=&category=&level=&type=&minSalary=&maxSalary=&sort=&page=&limit=
export const getJobs = async (req, res) => {
    const filter = await buildJobQuery(req.query)
    const { page, limit, skip } = pagination(req.query, { defaultLimit: 12, maxLimit: 50 })
    const sortKey = Object.hasOwn(SORTS, req.query.sort) ? req.query.sort : 'newest'

    const [jobs, total] = await Promise.all([
        Job.find(filter)
            .sort(SORTS[sortKey])
            .skip(skip)
            .limit(limit)
            .populate({ path: 'companyId', select: COMPANY_PUBLIC_FIELDS })
            .lean(),
        Job.countDocuments(filter),
    ])

    res.json({ success: true, jobs, pagination: paginationMeta(page, limit, total), sort: sortKey })
}

// Real platform data for the landing page and filter options
export const getJobsMeta = async (req, res) => {
    const filter = await publicJobFilter()

    const [facets] = await Job.aggregate([
        { $match: filter },
        {
            $facet: {
                totals: [{ $group: { _id: null, jobs: { $sum: 1 }, companies: { $addToSet: '$companyId' }, minSalary: { $min: '$salary' }, maxSalary: { $max: '$salary' } } }],
                categories: [{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
                locations: [{ $group: { _id: '$location', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }],
                levels: [{ $group: { _id: '$level', count: { $sum: 1 } } }],
                types: [{ $match: { jobType: { $exists: true } } }, { $group: { _id: '$jobType', count: { $sum: 1 } } }],
                topCompanies: [{ $group: { _id: '$companyId', openJobs: { $sum: 1 } } }, { $sort: { openJobs: -1 } }, { $limit: 8 }],
            },
        },
    ])

    const totals = facets.totals[0] ?? { jobs: 0, companies: [], minSalary: 0, maxSalary: 0 }

    const companyDocs = await Company.find({ _id: { $in: facets.topCompanies.map((c) => c._id) } })
        .select('name image industry location')
        .lean()
    const byId = new Map(companyDocs.map((c) => [String(c._id), c]))
    const featuredCompanies = facets.topCompanies
        .map((c) => ({ ...byId.get(String(c._id)), openJobs: c.openJobs }))
        .filter((c) => c._id)

    const candidates = await User.countDocuments({ status: { $ne: 'suspended' }, role: { $ne: 'admin' } })

    const toList = (arr) => arr.map((x) => ({ name: x._id, count: x.count }))

    res.json({
        success: true,
        stats: { openJobs: totals.jobs, hiringCompanies: totals.companies.length, candidates },
        salaryRange: { min: totals.minSalary ?? 0, max: totals.maxSalary ?? 0 },
        categories: toList(facets.categories),
        locations: toList(facets.locations),
        levels: toList(facets.levels),
        types: toList(facets.types),
        featuredCompanies,
        options: { categories: JOB_CATEGORIES, levels: JOB_LEVELS, types: JOB_TYPES },
    })
}

// Get Single Job Using JobID (404 for hidden, moderated or unknown jobs)
export const getJobById = async (req, res) => {
    const { id } = req.params

    if (!isObjectId(id)) throw notFound('Job not found')

    const job = await Job.findById(id)
        .populate({ path: 'companyId', select: `${COMPANY_PUBLIC_FIELDS} status` })
        .lean()

    if (!job || !(await isJobPublic(job))) {
        throw notFound('This job is no longer available')
    }

    delete job.companyId.status
    res.json({ success: true, job })
}
