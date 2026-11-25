import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useClerk } from '@clerk/react'
import { toast } from 'react-toastify'
import { ArrowLeft, Briefcase, CalendarDays, CircleCheck, ExternalLink, Globe, Layers, MapPin, UserRound, Wallet } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge, { StatusBadge } from '../components/ui/Badge'
import { Avatar } from '../components/ui/Misc'
import { EmptyState, Notice, Skeleton } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import JobCard, { SaveButton } from '../components/jobs/JobCard'
import ResumeUploader from '../components/candidate/ResumeUploader'
import { useQuery } from '../hooks/useQuery'
import { usePageMeta } from '../hooks/usePageMeta'
import { jobsApi, userApi } from '../lib/api'
import { formatDate, formatSalary, levelLabel, timeAgo } from '../lib/format'
import { sanitizeHtml, htmlToText } from '../lib/sanitize'
import { useApp } from '../context/AppContext'

const Fact = ({ icon: Icon, label, value }) => (
    <div className='flex items-start gap-3'>
        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500 ring-1 ring-ink-100'>
            <Icon className='h-4 w-4' aria-hidden='true' />
        </span>
        <div>
            <dt className='text-xs text-ink-500'>{label}</dt>
            <dd className='text-sm font-semibold text-ink-900'>{value}</dd>
        </div>
    </div>
)

const ApplyPanel = ({ job }) => {
    const { openSignIn } = useClerk()
    const { isSignedIn, clerkLoaded, userData, userApplications, fetchUserApplications } = useApp()
    const [busy, setBusy] = useState(false)
    const [needResume, setNeedResume] = useState(false)

    const application = userApplications.find((a) => String(a.jobId?._id ?? a.jobId) === String(job._id))
    const suspended = userData?.status === 'suspended'

    const apply = async () => {
        if (!isSignedIn) return openSignIn()
        if (!userData) return toast.info('Loading your profile, please try again in a moment')
        if (!userData.resume) return setNeedResume(true)
        setBusy(true)
        try {
            const d = await userApi.apply(job._id)
            toast.success(d.message)
            await fetchUserApplications()
        } catch (e) {
            toast.error(e.message)
            if (e.status === 409) fetchUserApplications()
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            {application ? (
                <div className='flex flex-col gap-2'>
                    <div className='flex items-center gap-2 text-sm font-medium text-emerald-700'>
                        <CircleCheck className='h-4 w-4' aria-hidden='true' /> You applied {timeAgo(application.date)}
                    </div>
                    <div className='flex items-center gap-2 text-sm text-ink-500'>Status: <StatusBadge status={application.status} /></div>
                    <Button to='/candidate/applications' variant='secondary' className='mt-1'>Track application</Button>
                </div>
            ) : suspended ? (
                <Notice tone='danger' title='Account suspended'>You can&apos;t apply to jobs while your account is suspended.</Notice>
            ) : (
                <div className='flex gap-2'>
                    <Button size='lg' className='flex-1' onClick={apply} loading={busy} disabled={!clerkLoaded}>Apply now</Button>
                    <SaveButton jobId={job._id} withLabel className='h-12 rounded-xl' />
                </div>
            )}

            <Modal open={needResume} onClose={() => setNeedResume(false)} title='Upload your resume to apply'
                description={`Recruiters at ${job.companyId?.name ?? 'this company'} will see the resume you upload. You can replace it anytime from your profile.`}>
                <ResumeUploader compact onUploaded={() => { setNeedResume(false); toast.info('Resume saved. Click "Apply now" to submit.') }} />
            </Modal>
        </>
    )
}

const RelatedJobs = ({ job }) => {
    const { appliedJobIds } = useApp()
    const { data } = useQuery(() => jobsApi.search({ company: job.companyId?._id, exclude: job._id, limit: 3 }), [job._id])
    const jobs = data?.jobs ?? []
    if (jobs.length === 0) return null
    return (
        <section className='mt-16' aria-labelledby='related-heading'>
            <h2 id='related-heading' className='text-lg font-semibold text-ink-900'>More roles at {job.companyId?.name}</h2>
            <div className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {jobs.map((j) => <JobCard key={j._id} job={j} applied={appliedJobIds.has(String(j._id))} />)}
            </div>
        </section>
    )
}

const JobDetailSkeleton = () => (
    <div className='container-page py-10'>
        <Skeleton className='h-4 w-24' />
        <div className='mt-8 flex items-center gap-4'><Skeleton className='h-16 w-16 rounded-xl' /><div className='space-y-2'><Skeleton className='h-4 w-32' /><Skeleton className='h-7 w-72' /></div></div>
        <div className='mt-10 grid gap-10 lg:grid-cols-[1fr_340px]'>
            <div className='space-y-3'>{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className='h-3.5 w-full' />)}</div>
            <Skeleton className='h-64 w-full rounded-xl' />
        </div>
    </div>
)

const JobDetail = () => {
    const { id } = useParams()
    const { data, error, loading, reload } = useQuery(() => jobsApi.get(id), [id])
    const job = data?.job

    usePageMeta({
        title: job ? `${job.title} at ${job.companyId?.name}` : error ? 'Job not found' : 'Job details',
        description: job ? htmlToText(job.description).slice(0, 155) : undefined,
    })

    if (loading) return <JobDetailSkeleton />

    if (error || !job) {
        return (
            <div className='container-page py-16'>
                <EmptyState icon={Briefcase} as='h1'
                    title={error?.status === 404 ? 'This job is no longer available' : 'Could not load this job'}
                    description={error?.status === 404 ? 'It may have been filled, hidden or removed by the company.' : error?.message}
                    action={<div className='flex gap-2'>
                        {error?.status !== 404 && <Button variant='secondary' onClick={() => reload()}>Try again</Button>}
                        <Button to='/jobs'>Browse open roles</Button>
                    </div>} />
            </div>
        )
    }

    const company = job.companyId ?? {}

    return (
        <div className='container-page py-8 sm:py-10'>
            <Link to='/jobs' className='inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900'>
                <ArrowLeft className='h-4 w-4' aria-hidden='true' /> All jobs
            </Link>

            <header className='mt-6 flex flex-col gap-5 sm:flex-row sm:items-center'>
                <Avatar src={company.image} name={company.name} size='xl' rounded='xl' />
                <div className='min-w-0'>
                    <p className='font-medium text-ink-600'>{company.name}</p>
                    <h1 className='mt-1 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl'>{job.title}</h1>
                    <div className='mt-3 flex flex-wrap gap-1.5'>
                        <Badge><MapPin className='h-3 w-3' aria-hidden='true' />{job.location}</Badge>
                        <Badge>{levelLabel(job.level)}</Badge>
                        {job.jobType && <Badge>{job.jobType}</Badge>}
                        <Badge>{job.category}</Badge>
                    </div>
                </div>
            </header>

            <div className='mt-10 grid gap-10 lg:grid-cols-[1fr_340px]'>
                <article>
                    <h2 className='text-lg font-semibold text-ink-900'>About the role</h2>
                    <div className='rich-text mt-4' dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }} />
                </article>

                <aside className='space-y-4 lg:sticky lg:top-24 lg:self-start'>
                    <div className='card p-5'>
                        <dl className='grid gap-4'>
                            <Fact icon={Wallet} label='Salary (CTC)' value={formatSalary(job.salary)} />
                            <Fact icon={UserRound} label='Experience' value={levelLabel(job.level)} />
                            <Fact icon={MapPin} label='Location' value={job.location} />
                            {job.jobType && <Fact icon={Briefcase} label='Job type' value={job.jobType} />}
                            <Fact icon={Layers} label='Category' value={job.category} />
                            <Fact icon={CalendarDays} label='Posted' value={`${formatDate(job.date)} · ${timeAgo(job.date)}`} />
                        </dl>
                        <div className='mt-6 border-t border-ink-100 pt-5'>
                            <ApplyPanel job={job} />
                        </div>
                    </div>

                    <div className='card p-5'>
                        <div className='flex items-center gap-3'>
                            <Avatar src={company.image} name={company.name} />
                            <div className='min-w-0'>
                                <h2 className='truncate font-semibold text-ink-900'>{company.name}</h2>
                                {(company.industry || company.location) && <p className='truncate text-sm text-ink-500'>{[company.industry, company.location].filter(Boolean).join(' · ')}</p>}
                            </div>
                        </div>
                        {company.about && <p className='mt-4 whitespace-pre-line text-sm leading-6 text-ink-600'>{company.about}</p>}
                        <div className='mt-4 flex flex-wrap gap-2'>
                            {company.website && (
                                <Button href={company.website} target='_blank' rel='noopener noreferrer nofollow' variant='secondary' size='sm'>
                                    <Globe className='h-3.5 w-3.5' aria-hidden='true' /> Website <ExternalLink className='h-3 w-3' aria-hidden='true' />
                                </Button>
                            )}
                            <Button to={`/jobs?company=${company._id}&companyName=${encodeURIComponent(company.name ?? '')}`} variant='ghost' size='sm'>All roles</Button>
                        </div>
                    </div>
                </aside>
            </div>

            <RelatedJobs job={job} />
        </div>
    )
}

export default JobDetail
