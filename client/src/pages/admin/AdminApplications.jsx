import { PageHeader, Tabs, Avatar } from '../../components/ui/Misc'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/Feedback'
import { adminApi } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { usePageMeta } from '../../hooks/usePageMeta'
import { ListBody, Table, useAdminList } from './adminShared'

const AdminApplications = () => {
    usePageMeta({ title: 'Applications', noindex: true })
    const list = useAdminList(adminApi.applications)
    const apps = list.data?.applications ?? []

    return (
        <>
            <PageHeader title='Applications' description='Every application on the platform, newest first.' />
            <Tabs className='mb-5 w-fit max-w-full' value={list.filter || 'all'} onChange={(v) => list.setFilter(v === 'all' ? '' : v)} tabs={[
                { value: 'all', label: 'All' }, { value: 'Pending', label: 'Pending' }, { value: 'Accepted', label: 'Accepted' }, { value: 'Rejected', label: 'Rejected' },
            ]} />
            <ListBody list={list}>
                {apps.length === 0 ? <EmptyState title='No applications found' /> : (
                    <Table head={['Candidate', 'Job', 'Company', 'Applied', 'Status']}>
                        {apps.map((a) => (
                            <tr key={a._id} className='hover:bg-ink-50/50'>
                                <td className='px-4 py-3'>
                                    <div className='flex items-center gap-2.5'>
                                        <Avatar src={a.userId?.image} name={a.userId?.name ?? 'Deleted user'} size='sm' rounded='full' />
                                        <div className='min-w-0'>
                                            <p className='font-medium text-ink-900'>{a.userId?.name ?? 'Deleted user'}</p>
                                            {a.userId?.email && <p className='truncate text-xs text-ink-500'>{a.userId.email}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className='px-4 py-3'>
                                    <p className='text-ink-800'>{a.jobId?.title ?? a.jobSnapshot?.title ?? 'Removed job'}</p>
                                    {(a.jobRemoved || !a.jobId) && <p className='text-xs text-ink-400'>Listing removed</p>}
                                </td>
                                <td className='px-4 py-3 text-ink-700'>{a.companyId?.name ?? '—'}</td>
                                <td className='px-4 py-3 text-ink-500'>{formatDate(a.date)}</td>
                                <td className='px-4 py-3'><StatusBadge status={a.status} recruiterView /></td>
                            </tr>
                        ))}
                    </Table>
                )}
            </ListBody>
        </>
    )
}

export default AdminApplications
