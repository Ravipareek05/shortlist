import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, EyeOff, Hourglass, Plus, Users } from 'lucide-react'
import { PageHeader, StatCard, Avatar } from '../../components/ui/Misc'
import { EmptyState, ErrorState, Notice, Skeleton } from '../../components/ui/Feedback'
import { StatusBadge, ModerationBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { companyApi } from '../../lib/api'
import { formatDate, timeAgo } from '../../lib/format'
import { useQuery } from '../../hooks/useQuery'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useApp } from '../../context/AppContext'

const RecruiterOverview = () => {
    usePageMeta({ title: 'Recruiter dashboard', noindex: true })
    const { companyData } = useApp()
    const { data, error, loading, reload } = useQuery(() => Promise.all([companyApi.jobs(), companyApi.applicants()]), [])

    if (error) return <ErrorState title='Could not load your dashboard' error={error} onRetry={reload} />

    const jobs = data?.[0]?.jobsData ?? []
    const applications = (data?.[1]?.applications ?? []).filter((a) => a.jobId && a.userId)
    const live = jobs.filter((j) => j.visible && (j.moderationStatus ?? 'approved') === 'approved')
    const hidden = jobs.length - live.length
    const pending = applications.filter((a) => a.status === 'Pending').length
    const flagged = jobs.filter((j) => ['rejected', 'hidden'].includes(j.moderationStatus))

    return (
        <>
            <PageHeader eyebrow='Overview' title={companyData ? `Hi, ${companyData.name}` : 'Overview'} description='A snapshot of your open roles and applicants.'
                actions={<Button to='/dashboard/add-job'><Plus className='h-4 w-4' aria-hidden='true' />Post a job</Button>} />

            {flagged.length > 0 && (
                <Notice tone='danger' className='mb-6' title={`${flagged.length} ${flagged.length === 1 ? 'job needs' : 'jobs need'} attention`}>
                    Moderators rejected or hid {flagged.map((j) => `“${j.title}”`).join(', ')}. <Link to='/dashboard/manage-jobs' className='font-medium underline'>Review jobs</Link>
                </Notice>
            )}

            <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                <StatCard label='Live jobs' value={live.length} icon={Briefcase} loading={loading} />
                <StatCard label='Hidden or in review' value={hidden} icon={EyeOff} tone='neutral' loading={loading} />
                <StatCard label='Total applicants' value={applications.length} icon={Users} tone='success' loading={loading} />
                <StatCard label='Awaiting review' value={pending} icon={Hourglass} tone='warning' loading={loading} />
            </div>

            <div className='mt-6 grid gap-6 lg:grid-cols-2'>
                <section className='card' aria-labelledby='recent-applicants'>
                    <div className='flex items-center justify-between border-b border-ink-100 px-5 py-4'>
                        <h2 id='recent-applicants' className='font-semibold text-ink-900'>Recent applicants</h2>
                        <Button to='/dashboard/view-applications' variant='ghost' size='sm'>View all <ArrowRight className='h-3.5 w-3.5' aria-hidden='true' /></Button>
                    </div>
                    {loading ? (
                        <div className='space-y-3 p-5'>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className='h-10 w-full' />)}</div>
                    ) : applications.length === 0 ? (
                        <div className='p-5'><EmptyState icon={Users} title='No applicants yet' description='Applicants will appear here as candidates apply.' /></div>
                    ) : (
                        <ul className='divide-y divide-ink-100'>
                            {applications.slice(0, 6).map((a) => (
                                <li key={a._id} className='flex items-center gap-3 px-5 py-3'>
                                    <Avatar src={a.userId.image} name={a.userId.name} size='sm' rounded='full' />
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate text-sm font-medium text-ink-900'>{a.userId.name}</p>
                                        <p className='truncate text-xs text-ink-500'>{a.jobId.title} · {timeAgo(a.date)}</p>
                                    </div>
                                    <StatusBadge status={a.status} recruiterView />
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className='card' aria-labelledby='your-jobs'>
                    <div className='flex items-center justify-between border-b border-ink-100 px-5 py-4'>
                        <h2 id='your-jobs' className='font-semibold text-ink-900'>Your jobs</h2>
                        <Button to='/dashboard/manage-jobs' variant='ghost' size='sm'>Manage <ArrowRight className='h-3.5 w-3.5' aria-hidden='true' /></Button>
                    </div>
                    {loading ? (
                        <div className='space-y-3 p-5'>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className='h-10 w-full' />)}</div>
                    ) : jobs.length === 0 ? (
                        <div className='p-5'><EmptyState icon={Briefcase} title='No jobs posted yet' description='Post your first role to start receiving applications.' action={<Button to='/dashboard/add-job'>Post a job</Button>} /></div>
                    ) : (
                        <ul className='divide-y divide-ink-100'>
                            {jobs.slice(0, 6).map((j) => (
                                <li key={j._id} className='flex items-center gap-3 px-5 py-3'>
                                    <div className='min-w-0 flex-1'>
                                        <Link to={`/dashboard/jobs/${j._id}/edit`} className='truncate text-sm font-medium text-ink-900 hover:text-brand-600'>{j.title}</Link>
                                        <p className='truncate text-xs text-ink-500'>{j.location} · posted {formatDate(j.date)}</p>
                                    </div>
                                    {(j.moderationStatus ?? 'approved') !== 'approved' ? <ModerationBadge status={j.moderationStatus} /> : !j.visible && <span className='text-xs text-ink-400'>Hidden</span>}
                                    <Link to={`/dashboard/view-applications?jobId=${j._id}`} className='whitespace-nowrap rounded-md bg-ink-50 px-2 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100'>
                                        {j.applicants} {j.applicants === 1 ? 'applicant' : 'applicants'}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    )
}

export default RecruiterOverview
