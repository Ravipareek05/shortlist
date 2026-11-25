import { Bookmark, Trash2 } from 'lucide-react'
import { PageHeader, Avatar } from '../../components/ui/Misc'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import Button from '../../components/ui/Button'
import JobCard, { JobCardSkeleton } from '../../components/jobs/JobCard'
import { useQuery } from '../../hooks/useQuery'
import { usePageMeta } from '../../hooks/usePageMeta'
import { userApi } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { useApp } from '../../context/AppContext'

const SavedJobs = () => {
    usePageMeta({ title: 'Saved jobs', noindex: true })
    const { savedJobIds, toggleSaveJob, appliedJobIds } = useApp()
    // Refetch whenever the saved set changes (e.g. unsaving from a card)
    const { data, error, loading, reload } = useQuery(() => userApi.savedJobs(), [savedJobIds.size])

    const saved = (data?.savedJobs ?? []).filter((s) => savedJobIds.has(String(s.jobId)))
    const available = saved.filter((s) => s.available)
    const unavailable = saved.filter((s) => !s.available)

    return (
        <>
            <PageHeader title='Saved jobs' description='Roles you bookmarked to come back to later.' />

            {error ? <ErrorState title='Could not load saved jobs' error={error} onRetry={reload} />
                : loading && !data ? (
                    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>{Array.from({ length: 3 }, (_, i) => <JobCardSkeleton key={i} />)}</div>
                ) : saved.length === 0 ? (
                    <EmptyState icon={Bookmark} title='No saved jobs yet' description='Tap the bookmark icon on any job to save it here.' action={<Button to='/jobs' variant='secondary'>Browse jobs</Button>} />
                ) : (
                    <>
                        {available.length > 0 && (
                            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                                {available.map((s) => <JobCard key={s._id} job={s.job} applied={appliedJobIds.has(String(s.jobId))} />)}
                            </div>
                        )}

                        {unavailable.length > 0 && (
                            <section className='mt-10' aria-labelledby='unavailable-heading'>
                                <h2 id='unavailable-heading' className='text-sm font-semibold text-ink-900'>No longer available</h2>
                                <p className='text-sm text-ink-500'>These roles were closed or hidden by the company.</p>
                                <ul className='mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white'>
                                    {unavailable.map((s) => (
                                        <li key={s._id} className='flex items-center gap-3 px-4 py-3'>
                                            <Avatar src={s.job?.companyId?.image} name={s.job?.companyId?.name} size='sm' className='opacity-60' />
                                            <div className='min-w-0 flex-1'>
                                                <p className='truncate text-sm font-medium text-ink-500 line-through'>{s.job?.title}</p>
                                                <p className='text-xs text-ink-400'>{s.job?.companyId?.name} · saved {formatDate(s.savedAt)}</p>
                                            </div>
                                            <Button variant='ghost' size='icon-sm' onClick={() => toggleSaveJob(s.jobId)} aria-label={`Remove ${s.job?.title ?? 'job'} from saved jobs`}>
                                                <Trash2 className='h-4 w-4' aria-hidden='true' />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </>
                )}
        </>
    )
}

export default SavedJobs
