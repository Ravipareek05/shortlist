import { useState } from 'react'
import { toast } from 'react-toastify'
import { ExternalLink } from 'lucide-react'
import { PageHeader, Tabs, Avatar } from '../../components/ui/Misc'
import { AccountBadge } from '../../components/ui/Badge'
import { ConfirmDialog } from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/Feedback'
import { adminApi } from '../../lib/api'
import { openSignedLink } from '../../lib/openSignedLink'
import { formatDate } from '../../lib/format'
import { usePageMeta } from '../../hooks/usePageMeta'
import { ListBody, SearchInput, Table, useAdminList } from './adminShared'

/**
 * Account management for both job seekers (kind="users") and recruiters (kind="companies").
 * Suspending requires a reason and is written to the moderation log.
 */
const AdminAccounts = ({ kind }) => {
    const isUsers = kind === 'users'
    usePageMeta({ title: isUsers ? 'Job seekers' : 'Recruiters', noindex: true })
    const list = useAdminList(isUsers ? adminApi.users : adminApi.companies)
    const [target, setTarget] = useState(null)

    const rows = (isUsers ? list.data?.users : list.data?.companies) ?? []

    const changeStatus = async (reason) => {
        const next = target.status === 'suspended' ? 'active' : 'suspended'
        try {
            const d = isUsers
                ? await adminApi.setUserStatus(target._id, next, reason)
                : await adminApi.setCompanyStatus(target._id, next, reason)
            toast.success(d.message)
            list.reload({ silent: true })
        } catch (e) {
            toast.error(e.message)
            throw e
        }
    }

    const suspending = target?.status !== 'suspended'

    return (
        <>
            <PageHeader title={isUsers ? 'Job seekers' : 'Recruiters'}
                description={isUsers ? 'Candidate accounts. Suspended users can’t apply to or save jobs.' : 'Company accounts. Suspended recruiters can’t sign in and their jobs are hidden.'} />

            <div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <Tabs className='w-fit max-w-full' value={list.filter || 'all'} onChange={(v) => list.setFilter(v === 'all' ? '' : v)}
                    tabs={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
                <SearchInput value={list.q} onChange={list.setQuery} placeholder='Search name or email' />
            </div>

            <ListBody list={list}>
                {rows.length === 0 ? <EmptyState title='No accounts found' description={list.q ? 'Try a different search.' : undefined} /> : (
                    <Table head={isUsers ? ['Name', 'Applications', 'Resume', 'Joined', 'Status', 'Actions'] : ['Company', 'Jobs', 'Applications', 'Joined', 'Status', 'Actions']}>
                        {rows.map((r) => (
                            <tr key={r._id} className='hover:bg-ink-50/50'>
                                <td className='px-4 py-3'>
                                    <div className='flex items-center gap-3'>
                                        <Avatar src={r.image} name={r.name} size='sm' rounded={isUsers ? 'full' : 'lg'} />
                                        <div className='min-w-0'>
                                            <p className='flex items-center gap-2 font-medium text-ink-900'>{r.name}{r.role === 'admin' && <Badge tone='dark'>Admin</Badge>}</p>
                                            <p className='truncate text-xs text-ink-500'>{r.email}</p>
                                        </div>
                                    </div>
                                    {r.status === 'suspended' && r.statusReason && <p className='mt-1 text-xs text-rose-600'>Reason: {r.statusReason}</p>}
                                </td>
                                {isUsers ? (
                                    <>
                                        <td className='px-4 py-3 tabular-nums text-ink-700'>{r.applications}</td>
                                        <td className='px-4 py-3'>{r.hasResume ? <button type='button' onClick={() => openSignedLink(() => adminApi.userResumeLink(r._id))} className='inline-flex items-center gap-1 text-brand-600 hover:underline'>View <ExternalLink className='h-3 w-3' aria-hidden='true' /></button> : <span className='text-ink-400'>None</span>}</td>
                                    </>
                                ) : (
                                    <>
                                        <td className='px-4 py-3 tabular-nums text-ink-700'>{r.jobs}</td>
                                        <td className='px-4 py-3 tabular-nums text-ink-700'>{r.applications}</td>
                                    </>
                                )}
                                <td className='px-4 py-3 text-ink-500'>{formatDate(r.createdAt) || '—'}</td>
                                <td className='px-4 py-3'><AccountBadge status={r.status} /></td>
                                <td className='px-4 py-3 text-right'>
                                    {r.role === 'admin'
                                        ? <span className='text-xs text-ink-400'>Protected</span>
                                        : (
                                            <div className='flex justify-end gap-1'>
                                                {!isUsers && <Button to={`/admin/jobs?company=${r._id}`} variant='ghost' size='sm'>Jobs</Button>}
                                                <Button size='sm' variant={r.status === 'suspended' ? 'secondary' : 'danger-ghost'} onClick={() => setTarget(r)}>
                                                    {r.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                                                </Button>
                                            </div>
                                        )}
                                </td>
                            </tr>
                        ))}
                    </Table>
                )}
            </ListBody>

            <ConfirmDialog
                open={Boolean(target)}
                onClose={() => setTarget(null)}
                onConfirm={changeStatus}
                tone={suspending ? 'danger' : 'primary'}
                title={`${suspending ? 'Suspend' : 'Reactivate'} ${target?.name ?? ''}?`}
                description={suspending
                    ? (isUsers ? 'They will not be able to apply to or save jobs until reactivated.' : 'They will be signed out, unable to sign in, and all their jobs will be hidden.')
                    : 'The account will regain full access immediately.'}
                confirmLabel={suspending ? 'Suspend account' : 'Reactivate'}
                requireReason={suspending}
                reasonPlaceholder='e.g. Spam or misleading listings'
            />
        </>
    )
}

export default AdminAccounts
