import { Link, useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { ArrowRight, BarChart3, Bookmark, Briefcase, Building2, Code2, FileCheck2, Layers, ListChecks, Megaphone, Network, PenTool, Send, ShieldCheck, Users } from 'lucide-react'
import SearchBar from '../components/jobs/SearchBar'
import JobCard, { JobCardSkeleton } from '../components/jobs/JobCard'
import Button from '../components/ui/Button'
import { Avatar } from '../components/ui/Misc'
import { EmptyState, ErrorState } from '../components/ui/Feedback'
import { useQuery } from '../hooks/useQuery'
import { usePageMeta } from '../hooks/usePageMeta'
import { jobsApi } from '../lib/api'
import { formatNumber, pluralize } from '../lib/format'
import { useApp } from '../context/AppContext'

const toSearchUrl = (params) => {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v)
    const s = qs.toString()
    return `/jobs${s ? `?${s}` : ''}`
}

const Hero = ({ meta }) => {
    const navigate = useNavigate()
    const topCategories = meta?.categories?.slice(0, 5) ?? []

    return (
        <section className='relative overflow-hidden bg-ink-900 text-white'>
            <div className='bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]' aria-hidden='true' />
            <div className='absolute -top-40 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]' aria-hidden='true' />

            <div className='container-page relative pb-20 pt-16 sm:pb-24 sm:pt-24'>
                <div className='mx-auto max-w-3xl text-center'>
                    <p className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-ink-200'>
                        <span className='h-1.5 w-1.5 rounded-full bg-emerald-400' aria-hidden='true' />
                        {meta?.stats?.openJobs ? `${pluralize(meta.stats.openJobs, 'open role')} right now` : 'Hiring, simplified'}
                    </p>
                    <h1 className='mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl'>
                        Get on the shortlist<span className='text-brand-400'>.</span>
                    </h1>
                    <p className='mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300 sm:text-lg'>
                        Find roles at companies that are actively hiring. Apply with your resume in one click and follow every application from review to offer.
                    </p>
                </div>

                <div className='mx-auto mt-10 max-w-3xl'>
                    <SearchBar onSearch={(p) => navigate(toSearchUrl(p))} />
                    {topCategories.length > 0 && (
                        <div className='mt-5 flex flex-wrap items-center justify-center gap-2 text-sm'>
                            <span className='text-ink-400'>Popular:</span>
                            {topCategories.map((c) => (
                                <Link key={c.name} to={toSearchUrl({ category: c.name })}
                                    className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ink-200 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white'>
                                    {c.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

const Stats = ({ meta }) => {
    const s = meta?.stats
    if (!s || s.openJobs === 0) return null
    const items = [
        { label: 'Open roles', value: s.openJobs, icon: Briefcase },
        { label: 'Companies hiring', value: s.hiringCompanies, icon: Building2 },
        { label: 'Candidates on Shortlist', value: s.candidates, icon: Users },
    ].filter((i) => i.value > 0)

    return (
        <section aria-label='Platform statistics' className='border-b border-ink-100 bg-white'>
            <dl className={`container-page grid divide-y divide-ink-100 sm:divide-x sm:divide-y-0 ${items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                {items.map((i) => (
                    <div key={i.label} className='flex items-center gap-4 px-2 py-6 sm:justify-center'>
                        <i.icon className='h-5 w-5 text-brand-600' aria-hidden='true' />
                        <div>
                            <dd className='text-2xl font-semibold tabular-nums tracking-tight text-ink-900'>{formatNumber(i.value)}</dd>
                            <dt className='text-sm text-ink-500'>{i.label}</dt>
                        </div>
                    </div>
                ))}
            </dl>
        </section>
    )
}

const SectionHeading = ({ eyebrow, title, description, action }) => (
    <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
            <p className='eyebrow'>{eyebrow}</p>
            <h2 className='mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl'>{title}</h2>
            {description && <p className='mt-2 max-w-xl text-ink-500'>{description}</p>}
        </div>
        {action}
    </div>
)

const CATEGORY_ICONS = {
    Programming: Code2,
    'Data Science': BarChart3,
    Designing: PenTool,
    Networking: Network,
    Management: Users,
    Marketing: Megaphone,
    Cybersecurity: ShieldCheck,
}

const CategoryIcon = ({ name }) => {
    const Icon = CATEGORY_ICONS[name] ?? Layers
    return (
        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600'>
            <Icon className='h-4 w-4' aria-hidden='true' />
        </span>
    )
}

const Categories = ({ meta }) => {
    const categories = meta?.categories ?? []
    if (categories.length === 0) return null
    return (
        <section className='container-page pt-20'>
            <SectionHeading eyebrow='Categories' title='Explore by discipline' />
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                {categories.map((c) => (
                    <Link key={c.name} to={toSearchUrl({ category: c.name })}
                        className='group flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-elevated'>
                        <div className='flex min-w-0 items-center gap-3'>
                            <CategoryIcon name={c.name} />
                            <div className='min-w-0'>
                                <p className='truncate text-sm font-semibold text-ink-900'>{c.name}</p>
                                <p className='text-xs text-ink-500'>{pluralize(c.count, 'open role')}</p>
                            </div>
                        </div>
                        <ArrowRight className='h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600' aria-hidden='true' />
                    </Link>
                ))}
            </div>
        </section>
    )
}

const LatestJobs = () => {
    const { appliedJobIds } = useApp()
    const { data, error, loading, reload } = useQuery(() => jobsApi.search({ limit: 6, sort: 'newest' }), [])
    const jobs = data?.jobs ?? []

    return (
        <section className='container-page pt-20'>
            <SectionHeading
                eyebrow='Latest'
                title='Recently posted roles'
                action={<Button to='/jobs' variant='secondary'>View all jobs <ArrowRight className='h-4 w-4' aria-hidden='true' /></Button>}
            />
            {error ? <ErrorState title='Could not load jobs' error={error} onRetry={reload} />
                : loading ? (
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>{Array.from({ length: 6 }, (_, i) => <JobCardSkeleton key={i} />)}</div>
                ) : jobs.length === 0 ? (
                    <EmptyState icon={Briefcase} title='No open roles yet' description='New jobs will appear here as soon as companies post them.'
                        action={<Button to='/recruiter/signup' variant='secondary'>Post the first job</Button>} />
                ) : (
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                        {jobs.map((job) => <JobCard key={job._id} job={job} applied={appliedJobIds.has(String(job._id))} />)}
                    </div>
                )}
        </section>
    )
}

const FeaturedCompanies = ({ meta }) => {
    const companies = meta?.featuredCompanies ?? []
    if (companies.length === 0) return null
    return (
        <section className='container-page pt-20'>
            <SectionHeading eyebrow='Companies' title='Hiring on Shortlist now' description='Teams with the most open roles on the platform right now.' />
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                {companies.map((c) => (
                    <Link key={c._id} to={`/jobs?company=${c._id}&companyName=${encodeURIComponent(c.name)}`}
                        className='flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated'>
                        <Avatar src={c.image} name={c.name} size='lg' rounded='xl' />
                        <div className='min-w-0'>
                            <p className='truncate font-semibold text-ink-900'>{c.name}</p>
                            <p className='text-sm text-ink-500'>{pluralize(c.openJobs, 'open role')}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}

const FEATURES = [
    { icon: Send, title: 'One-click applications', text: 'Upload your resume once, then apply to any role with a single click.' },
    { icon: ListChecks, title: 'Clear status tracking', text: 'See whether each application is in review, accepted or not selected.' },
    { icon: Bookmark, title: 'Save roles for later', text: 'Bookmark interesting jobs and come back to them when you are ready.' },
    { icon: BarChart3, title: 'Built for recruiters', text: 'Post roles, manage listings and review applicants from one dashboard.' },
    { icon: FileCheck2, title: 'Resumes in one place', text: 'Recruiters open candidate resumes directly from each application.' },
    { icon: ShieldCheck, title: 'Moderated listings', text: 'Admins review and remove listings that break the rules.' },
]

const WhyShortlist = () => (
    <section className='container-page pt-24'>
        <div className='mx-auto max-w-2xl text-center'>
            <p className='eyebrow'>Why Shortlist</p>
            <h2 className='mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl'>Less busywork, more good matches</h2>
            <p className='mt-3 text-ink-500'>Everything candidates and hiring teams need, and nothing they don&apos;t.</p>
        </div>
        <div className='mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3'>
            {FEATURES.map((f) => (
                <div key={f.title} className='flex gap-4'>
                    <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white'>
                        <f.icon className='h-[18px] w-[18px]' aria-hidden='true' />
                    </span>
                    <div>
                        <h3 className='font-semibold text-ink-900'>{f.title}</h3>
                        <p className='mt-1 text-sm leading-6 text-ink-500'>{f.text}</p>
                    </div>
                </div>
            ))}
        </div>
    </section>
)

const CallToAction = () => {
    const { openSignUp } = useClerk()
    const { isSignedIn } = useApp()
    return (
        <section className='container-page pt-24'>
            <div className='grid gap-4 lg:grid-cols-2'>
                <div className='relative overflow-hidden rounded-2xl bg-ink-900 p-8 text-white sm:p-10'>
                    <div className='bg-grid absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]' aria-hidden='true' />
                    <div className='relative'>
                        <p className='text-sm font-medium text-brand-300'>For candidates</p>
                        <h2 className='mt-2 text-2xl font-semibold tracking-tight'>Your next role is a search away</h2>
                        <p className='mt-2 max-w-sm text-ink-300'>Create a free account, upload your resume and start applying today.</p>
                        <div className='mt-6 flex flex-wrap gap-2'>
                            {isSignedIn
                                ? <Button to='/candidate' variant='light'>Go to my dashboard</Button>
                                : <Button variant='light' onClick={() => openSignUp()}>Create free account</Button>}
                            <Button to='/jobs' variant='outline-light'>Browse jobs</Button>
                        </div>
                    </div>
                </div>
                <div className='relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-8 sm:p-10'>
                    <p className='text-sm font-medium text-brand-700'>For recruiters</p>
                    <h2 className='mt-2 text-2xl font-semibold tracking-tight text-ink-900'>Hire your next teammate</h2>
                    <p className='mt-2 max-w-sm text-ink-600'>Post a role in minutes, then review applicants and resumes in one dashboard.</p>
                    <div className='mt-6 flex flex-wrap gap-2'>
                        <Button to='/recruiter/signup' variant='dark'>Post a job</Button>
                        <Button to='/recruiter/login' variant='secondary'>Recruiter sign in</Button>
                    </div>
                </div>
            </div>
        </section>
    )
}

const Home = () => {
    usePageMeta({})
    const { data: meta } = useQuery(() => jobsApi.meta(), [])

    return (
        <>
            <Hero meta={meta} />
            <Stats meta={meta} />
            <Categories meta={meta} />
            <LatestJobs />
            <FeaturedCompanies meta={meta} />
            <WhyShortlist />
            <CallToAction />
        </>
    )
}

export default Home
