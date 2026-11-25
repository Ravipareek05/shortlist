import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Briefcase, ExternalLink, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { PageHeader, Tabs } from '../../components/ui/Misc'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { ModerationBadge } from '../../components/ui/Badge'
import { Switch } from '../../components/ui/Field'
import { ConfirmDialog } from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { companyApi } from '../../lib/api'
import { formatDate, formatSalary } from '../../lib/format'
import { useQuery } from '../../hooks/useQuery'
import { usePageMeta } from '../../hooks/usePageMeta'

const isLive = (j) => j.visible && (j.moderationStatus ?? 'approved') === 'approved'

const ManageJobs = () => {
  usePageMeta({ title: 'Manage jobs', noindex: true })
  const { data, error, loading, reload, setData } = useQuery(() => companyApi.jobs(), [])
  const [tab, setTab] = useState('all')
  const [toDelete, setToDelete] = useState(null)
  const [toggling, setToggling] = useState(null)

  const jobs = data?.jobsData ?? []

  // Function to change Job Visibility (optimistic)
  const changeJobVisiblity = async (job) => {
    setToggling(job._id)
    setData((d) => ({ ...d, jobsData: d.jobsData.map((j) => j._id === job._id ? { ...j, visible: !j.visible } : j) }))
    try {
      const d = await companyApi.toggleVisibility(job._id)
      toast.success(d.message)
    } catch (e) {
      toast.error(e.message)
      reload({ silent: true })
    } finally {
      setToggling(null)
    }
  }

  const deleteJob = async () => {
    try {
      const d = await companyApi.deleteJob(toDelete._id)
      toast.success(d.applicationsArchived ? `Job deleted. ${d.applicationsArchived} application(s) archived.` : 'Job deleted')
      setData((cur) => ({ ...cur, jobsData: cur.jobsData.filter((j) => j._id !== toDelete._id) }))
    } catch (e) {
      toast.error(e.message)
      throw e
    }
  }

  const filtered = jobs.filter((j) => tab === 'all' || (tab === 'live' ? isLive(j) : !isLive(j)))

  return (
    <>
      <PageHeader title='Jobs' description='Edit, hide or remove your listings.'
        actions={<Button to='/dashboard/add-job'><Plus className='h-4 w-4' aria-hidden='true' />Post a job</Button>} />

      {error ? <ErrorState title='Could not load your jobs' error={error} onRetry={reload} />
        : loading ? (
          <div className='space-y-3'>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className='h-20 w-full rounded-xl' />)}</div>
        ) : jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title='No jobs posted yet' description='Post your first role to start receiving applications.' action={<Button to='/dashboard/add-job'>Post a job</Button>} />
        ) : (
          <>
            <Tabs className='mb-5 w-fit max-w-full' value={tab} onChange={setTab} tabs={[
              { value: 'all', label: 'All', count: jobs.length },
              { value: 'live', label: 'Live', count: jobs.filter(isLive).length },
              { value: 'hidden', label: 'Hidden or in review', count: jobs.filter((j) => !isLive(j)).length },
            ]} />

            {filtered.length === 0 ? <EmptyState title='No jobs in this view' /> : (
              <ul className='space-y-3'>
                {filtered.map((job) => {
                  const moderation = job.moderationStatus ?? 'approved'
                  return (
                    <li key={job._id} className='card flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Link to={`/dashboard/jobs/${job._id}/edit`} className='font-semibold text-ink-900 hover:text-brand-600'>{job.title}</Link>
                          {moderation !== 'approved' && <ModerationBadge status={moderation} />}
                        </div>
                        <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500'>
                          <span className='inline-flex items-center gap-1'><MapPin className='h-3.5 w-3.5' aria-hidden='true' />{job.location}</span>
                          <span>{formatSalary(job.salary)} CTC</span>
                          <span>Posted {formatDate(job.date)}</span>
                        </p>
                        {job.moderationReason && moderation !== 'approved' && <p className='mt-1 text-xs text-rose-600'>Moderator note: {job.moderationReason}</p>}
                      </div>

                      <div className='flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3 md:border-0 md:pt-0'>
                        <Link to={`/dashboard/view-applications?jobId=${job._id}`} className='inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-50 px-3 text-sm font-medium text-ink-700 hover:bg-ink-100'>
                          <Users className='h-3.5 w-3.5' aria-hidden='true' />{job.applicants}
                          <span className='sr-only'>applicants</span>
                          {job.applicantStats?.pending > 0 && <span className='rounded-full bg-amber-100 px-1.5 text-xs text-amber-800'>{job.applicantStats.pending} new</span>}
                        </Link>
                        <label className='flex h-8 items-center gap-2 rounded-lg px-2 text-sm text-ink-600'>
                          <Switch size='sm' checked={job.visible} disabled={toggling === job._id} onChange={() => changeJobVisiblity(job)} label={`Show ${job.title} to candidates`} />
                          <span>{job.visible ? 'Visible' : 'Hidden'}</span>
                        </label>
                        {isLive(job) && (
                          <Button to={`/jobs/${job._id}`} variant='ghost' size='icon-sm' aria-label={`View ${job.title} public page`}><ExternalLink className='h-4 w-4' aria-hidden='true' /></Button>
                        )}
                        <Button to={`/dashboard/jobs/${job._id}/edit`} variant='ghost' size='icon-sm' aria-label={`Edit ${job.title}`}><Pencil className='h-4 w-4' aria-hidden='true' /></Button>
                        <Button variant='danger-ghost' size='icon-sm' onClick={() => setToDelete(job)} aria-label={`Delete ${job.title}`}><Trash2 className='h-4 w-4' aria-hidden='true' /></Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={deleteJob}
        title={`Delete “${toDelete?.title ?? ''}”?`}
        description={toDelete?.applicants
          ? `The listing will be removed permanently. Its ${toDelete.applicants} application(s) stay in candidates' history marked as "listing removed".`
          : 'The listing will be removed permanently.'}
        confirmLabel='Delete job'
      />
    </>
  )
}

export default ManageJobs
