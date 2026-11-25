import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Download, ExternalLink, FileText, Mail, Users } from 'lucide-react'
import { PageHeader, Tabs, Avatar } from '../../components/ui/Misc'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { StatusBadge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { companyApi } from '../../lib/api'
import { openSignedLink } from '../../lib/openSignedLink'
import { APPLICATION_STATUSES } from '../../lib/constants'
import { formatDate, levelLabel, timeAgo } from '../../lib/format'
import { useQuery } from '../../hooks/useQuery'
import { usePageMeta } from '../../hooks/usePageMeta'

const StatusSelect = ({ application, onChange, busy }) => (
  <Select
    value={application.status}
    disabled={busy}
    onChange={(e) => onChange(application, e.target.value)}
    aria-label={`Status for ${application.userId.name}`}
    className={`h-8 w-36 py-1 text-sm ${application.status === 'Accepted' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : application.status === 'Rejected' ? 'border-rose-200 bg-rose-50 text-rose-800' : ''}`}
  >
    {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
  </Select>
)

// Resumes are private; each click fetches a short-lived signed link for this application
const openResume = (applicationId, download = false) => openSignedLink(() => companyApi.applicationResumeLink(applicationId, download))

const ResumeLinks = ({ application }) => application.userId.hasResume ? (
  <div className='flex items-center gap-1'>
    <Button onClick={() => openResume(application._id)} variant='secondary' size='sm' aria-label={`View resume of ${application.userId.name}`}>
      <FileText className='h-3.5 w-3.5' aria-hidden='true' />Resume
    </Button>
    <Button onClick={() => openResume(application._id, true)} variant='ghost' size='icon-sm' aria-label={`Download resume of ${application.userId.name}`}>
      <Download className='h-4 w-4' aria-hidden='true' />
    </Button>
  </div>
) : <span className='text-xs text-ink-400'>No resume</span>

const CandidateDrawer = ({ candidate, applications, onClose, onStatus, busyId }) => {
  if (!candidate) return null
  const theirs = applications.filter((a) => a.userId._id === candidate._id)
  return (
    <Modal open side onClose={onClose} title='Candidate' description={`Applied to ${theirs.length} of your ${theirs.length === 1 ? 'role' : 'roles'}`}>
      <div className='flex items-center gap-4'>
        <Avatar src={candidate.image} name={candidate.name} size='xl' rounded='full' />
        <div className='min-w-0'>
          <p className='truncate text-lg font-semibold text-ink-900'>{candidate.name}</p>
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className='inline-flex items-center gap-1.5 truncate text-sm text-brand-600 hover:underline'>
              <Mail className='h-3.5 w-3.5' aria-hidden='true' />{candidate.email}
            </a>
          )}
        </div>
      </div>

      <div className='mt-6 rounded-xl border border-ink-100 bg-ink-50/60 p-4'>
        <p className='text-sm font-semibold text-ink-900'>Resume</p>
        {candidate.hasResume && theirs[0] ? (
          <div className='mt-3 flex gap-2'>
            <Button onClick={() => openResume(theirs[0]._id)} variant='secondary' size='sm'><ExternalLink className='h-3.5 w-3.5' aria-hidden='true' />Open</Button>
            <Button onClick={() => openResume(theirs[0]._id, true)} variant='secondary' size='sm'><Download className='h-3.5 w-3.5' aria-hidden='true' />Download</Button>
          </div>
        ) : <p className='mt-1 text-sm text-ink-500'>This candidate hasn&apos;t uploaded a resume.</p>}
      </div>

      <h3 className='mt-6 text-sm font-semibold text-ink-900'>Applications</h3>
      <ul className='mt-3 space-y-3'>
        {theirs.map((a) => (
          <li key={a._id} className='rounded-xl border border-ink-100 p-4'>
            <p className='font-medium text-ink-900'>{a.jobId.title}</p>
            <p className='text-sm text-ink-500'>{a.jobId.location} · {levelLabel(a.jobId.level)} · applied {formatDate(a.date)}</p>
            <div className='mt-3'><StatusSelect application={a} onChange={onStatus} busy={busyId === a._id} /></div>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

const ViewApplications = () => {
  usePageMeta({ title: 'Applicants', noindex: true })
  const [params, setParams] = useSearchParams()
  const jobId = params.get('jobId') ?? ''
  const status = params.get('status') ?? 'all'

  const { data, error, loading, reload, setData } = useQuery(() => Promise.all([companyApi.applicants(), companyApi.jobs()]), [])
  const [busyId, setBusyId] = useState(null)
  const [candidate, setCandidate] = useState(null)

  const applications = useMemo(() => (data?.[0]?.applications ?? []).filter((a) => a.jobId && a.userId), [data])
  const jobs = data?.[1]?.jobsData ?? []

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value && value !== 'all') next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  // Function to Update Job Applications Status
  const changeJobApplicationStatus = async (application, newStatus) => {
    if (newStatus === application.status) return
    setBusyId(application._id)
    try {
      const d = await companyApi.setApplicationStatus(application._id, newStatus)
      setData(([apps, js]) => [{ ...apps, applications: apps.applications.map((a) => a._id === application._id ? { ...a, status: newStatus } : a) }, js])
      toast.success(d.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const byJob = jobId ? applications.filter((a) => a.jobId._id === jobId) : applications
  const visible = status === 'all' ? byJob : byJob.filter((a) => a.status === status)
  const count = (s) => byJob.filter((a) => a.status === s).length

  return (
    <>
      <PageHeader title='Applicants' description='Review candidates, open resumes and update application status.' />

      {error ? <ErrorState title='Could not load applicants' error={error} onRetry={reload} />
        : loading ? (
          <div className='space-y-3'>{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className='h-16 w-full rounded-xl' />)}</div>
        ) : applications.length === 0 ? (
          <EmptyState icon={Users} title='No applicants yet' description='When candidates apply to your jobs, they will appear here.' action={<Button to='/dashboard/manage-jobs' variant='secondary'>View your jobs</Button>} />
        ) : (
          <>
            <div className='mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <Tabs className='w-fit max-w-full' value={status} onChange={(v) => setParam('status', v)} tabs={[
                { value: 'all', label: 'All', count: byJob.length },
                { value: 'Pending', label: 'Pending', count: count('Pending') },
                { value: 'Accepted', label: 'Accepted', count: count('Accepted') },
                { value: 'Rejected', label: 'Rejected', count: count('Rejected') },
              ]} />
              <label className='flex items-center gap-2 text-sm text-ink-500'>
                <span className='shrink-0'>Job</span>
                <Select value={jobId} onChange={(e) => setParam('jobId', e.target.value)} className='h-9 py-1.5 sm:w-72'>
                  <option value=''>All jobs</option>
                  {jobs.map((j) => <option key={j._id} value={j._id}>{j.title} ({j.applicants})</option>)}
                </Select>
              </label>
            </div>

            {visible.length === 0 ? <EmptyState title='No applicants match these filters' /> : (
              <>
                {/* Desktop table */}
                <div className='hidden overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card lg:block'>
                  <table className='w-full text-left text-sm'>
                    <thead className='border-b border-ink-100 bg-ink-50/60 text-xs font-medium uppercase tracking-wider text-ink-500'>
                      <tr>
                        <th scope='col' className='px-5 py-3'>Candidate</th>
                        <th scope='col' className='px-5 py-3'>Job</th>
                        <th scope='col' className='px-5 py-3'>Applied</th>
                        <th scope='col' className='px-5 py-3'>Resume</th>
                        <th scope='col' className='px-5 py-3'>Status</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-ink-100'>
                      {visible.map((a) => (
                        <tr key={a._id} className='hover:bg-ink-50/50'>
                          <td className='px-5 py-3'>
                            <button type='button' onClick={() => setCandidate(a.userId)} className='flex items-center gap-3 text-left'>
                              <Avatar src={a.userId.image} name={a.userId.name} size='sm' rounded='full' />
                              <span>
                                <span className='block font-medium text-ink-900 hover:text-brand-600'>{a.userId.name}</span>
                                {a.userId.email && <span className='block text-xs text-ink-500'>{a.userId.email}</span>}
                              </span>
                            </button>
                          </td>
                          <td className='px-5 py-3'>
                            <p className='font-medium text-ink-800'>{a.jobId.title}</p>
                            <p className='text-xs text-ink-500'>{a.jobId.location}</p>
                          </td>
                          <td className='px-5 py-3 text-ink-500' title={formatDate(a.date)}>{timeAgo(a.date)}</td>
                          <td className='px-5 py-3'><ResumeLinks application={a} /></td>
                          <td className='px-5 py-3'><StatusSelect application={a} onChange={changeJobApplicationStatus} busy={busyId === a._id} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile / tablet cards */}
                <ul className='space-y-3 lg:hidden'>
                  {visible.map((a) => (
                    <li key={a._id} className='card p-4'>
                      <button type='button' onClick={() => setCandidate(a.userId)} className='flex w-full items-center gap-3 text-left'>
                        <Avatar src={a.userId.image} name={a.userId.name} rounded='full' />
                        <span className='min-w-0 flex-1'>
                          <span className='block truncate font-medium text-ink-900'>{a.userId.name}</span>
                          <span className='block truncate text-sm text-ink-500'>{a.jobId.title} · {timeAgo(a.date)}</span>
                        </span>
                        <StatusBadge status={a.status} recruiterView />
                      </button>
                      <div className='mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3'>
                        <ResumeLinks application={a} />
                        <StatusSelect application={a} onChange={changeJobApplicationStatus} busy={busyId === a._id} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

      <CandidateDrawer candidate={candidate} applications={applications} onClose={() => setCandidate(null)} onStatus={changeJobApplicationStatus} busyId={busyId} />
    </>
  )
}

export default ViewApplications
