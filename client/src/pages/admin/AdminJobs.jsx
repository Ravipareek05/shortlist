import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { CircleCheck, CircleX, ExternalLink, EyeOff, Trash2 } from 'lucide-react'
import { PageHeader, Tabs, Avatar } from '../../components/ui/Misc'
import { ModerationBadge, AccountBadge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/Feedback'
import Button from '../../components/ui/Button'
import { adminApi } from '../../lib/api'
import { formatDate, formatSalary } from '../../lib/format'
import { usePageMeta } from '../../hooks/usePageMeta'
import { ListBody, SearchInput, Table, useAdminList } from './adminShared'

const ACTIONS = {
    approve: { title: 'Approve', description: 'The job becomes visible to candidates again (if the recruiter has it set to visible).', confirm: 'Approve job', tone: 'primary', reason: false },
    reject: { title: 'Reject', description: 'The job is removed from search. The recruiter sees your reason and can edit and resubmit.', confirm: 'Reject job', tone: 'danger', reason: true },
    hide: { title: 'Hide', description: 'The job is hidden from candidates. The recruiter cannot make it visible again.', confirm: 'Hide job', tone: 'danger', reason: true },
    remove: { title: 'Remove', description: 'The job is deleted permanently. Applications stay in candidates’ history as “listing removed”.', confirm: 'Remove job', tone: 'danger', reason: true },
}

const AdminJobs = () => {
    usePageMeta({ title: 'Job moderation', noindex: true })
    const [params] = useSearchParams()
    const company = params.get('company') ?? undefined
    const list = useAdminList((p) => adminApi.jobs({ ...p, company }), 'moderation', [company])
    const [pending, setPending] = useState(null) // { job, action }

    const jobs = list.data?.jobs ?? []

    const run = async (reason) => {
        const { job, action } = pending
        try {
            const d = action === 'remove'
                ? await adminApi.removeJob(job._id, reason)
                : await adminApi.moderateJob(job._id, action, reason)
            toast.success(d.message)
            list.reload({ silent: true })
        } catch (e) {
            toast.error(e.message)
            throw e
        }
    }

    const cfg = pending ? ACTIONS[pending.action] : null

    return (
        <>
            <PageHeader title='Job moderation' description={company ? 'Jobs from one company.' : 'Review every listing on the platform and act on ones that break the rules.'}
                actions={company && <Button to='/admin/jobs' variant='secondary' size='sm'>Show all companies</Button>} />

            <div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <Tabs className='w-fit max-w-full' value={list.filter || 'all'} onChange={(v) => list.setFilter(v === 'all' ? '' : v)} tabs={[
                    { value: 'all', label: 'All' }, { value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Awaiting review' },
                    { value: 'rejected', label: 'Rejected' }, { value: 'hidden', label: 'Hidden' },
                ]} />
                <SearchInput value={list.q} onChange={list.setQuery} placeholder='Search job titles' />
            </div>

            <ListBody list={list}>
                {jobs.length === 0 ? <EmptyState title='No jobs found' description={list.q ? 'Try a different search.' : undefined} /> : (
                    <Table head={['Job', 'Company', 'Posted', 'Applicants', 'Status', 'Actions']}>
                        {jobs.map((j) => {
                            const m = j.moderationStatus ?? 'approved'
                            const publiclyVisible = m === 'approved' && j.visible && j.companyId?.status !== 'suspended'
                            return (
                                <tr key={j._id} className='align-top hover:bg-ink-50/50'>
                                    <td className='px-4 py-3'>
                                        <p className='font-medium text-ink-900'>{j.title}</p>
                                        <p className='text-xs text-ink-500'>{j.location} · {j.category} · {formatSalary(j.salary)}</p>
                                        {j.moderationReason && m !== 'approved' && <p className='mt-1 text-xs text-rose-600'>Reason: {j.moderationReason}</p>}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <div className='flex items-center gap-2'>
                                            <Avatar src={j.companyId?.image} name={j.companyId?.name} size='xs' />
                                            <span className='text-ink-700'>{j.companyId?.name ?? '—'}</span>
                                        </div>
                                        {j.companyId?.status === 'suspended' && <div className='mt-1'><AccountBadge status='suspended' /></div>}
                                    </td>
                                    <td className='px-4 py-3 text-ink-500'>{formatDate(j.date)}</td>
                                    <td className='px-4 py-3 tabular-nums text-ink-700'>{j.applicants}</td>
                                    <td className='px-4 py-3'>
                                        <div className='flex flex-col items-start gap-1'>
                                            <ModerationBadge status={m} />
                                            {!j.visible && <span className='text-xs text-ink-400'>Hidden by recruiter</span>}
                                        </div>
                                    </td>
                                    <td className='px-4 py-3'>
                                        <div className='flex justify-end gap-1'>
                                            {publiclyVisible && <Button to={`/jobs/${j._id}`} target='_blank' variant='ghost' size='icon-sm' aria-label={`Open ${j.title}`}><ExternalLink className='h-4 w-4' aria-hidden='true' /></Button>}
                                            {m !== 'approved' && <Button variant='ghost' size='icon-sm' className='text-emerald-600' onClick={() => setPending({ job: j, action: 'approve' })} aria-label={`Approve ${j.title}`}><CircleCheck className='h-4 w-4' aria-hidden='true' /></Button>}
                                            {m !== 'rejected' && <Button variant='ghost' size='icon-sm' onClick={() => setPending({ job: j, action: 'reject' })} aria-label={`Reject ${j.title}`}><CircleX className='h-4 w-4' aria-hidden='true' /></Button>}
                                            {m !== 'hidden' && <Button variant='ghost' size='icon-sm' onClick={() => setPending({ job: j, action: 'hide' })} aria-label={`Hide ${j.title}`}><EyeOff className='h-4 w-4' aria-hidden='true' /></Button>}
                                            <Button variant='danger-ghost' size='icon-sm' onClick={() => setPending({ job: j, action: 'remove' })} aria-label={`Remove ${j.title}`}><Trash2 className='h-4 w-4' aria-hidden='true' /></Button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </Table>
                )}
            </ListBody>

            <ConfirmDialog
                open={Boolean(pending)}
                onClose={() => setPending(null)}
                onConfirm={run}
                title={cfg ? `${cfg.title} “${pending.job.title}”?` : ''}
                description={cfg?.description}
                confirmLabel={cfg?.confirm}
                tone={cfg?.tone}
                requireReason={cfg?.reason}
                reasonLabel='Reason (shown to the recruiter)'
                reasonPlaceholder='e.g. Salary information is misleading'
            />
        </>
    )
}

export default AdminJobs
