import { Ban, Briefcase, CircleCheck, EyeOff, RefreshCw, Trash2, CircleX } from 'lucide-react'
import { PageHeader, Tabs } from '../../components/ui/Misc'
import { EmptyState } from '../../components/ui/Feedback'
import { adminApi } from '../../lib/api'
import { formatDate, timeAgo } from '../../lib/format'
import { usePageMeta } from '../../hooks/usePageMeta'
import { ListBody, useAdminList } from './adminShared'

const ACTIONS = {
    'job.approve': { icon: CircleCheck, text: 'approved job', tone: 'text-emerald-600 bg-emerald-50' },
    'job.reject': { icon: CircleX, text: 'rejected job', tone: 'text-rose-600 bg-rose-50' },
    'job.hide': { icon: EyeOff, text: 'hid job', tone: 'text-ink-600 bg-ink-100' },
    'job.delete': { icon: Trash2, text: 'removed job', tone: 'text-rose-600 bg-rose-50' },
    'user.suspend': { icon: Ban, text: 'suspended job seeker', tone: 'text-rose-600 bg-rose-50' },
    'user.reactivate': { icon: RefreshCw, text: 'reactivated job seeker', tone: 'text-emerald-600 bg-emerald-50' },
    'company.suspend': { icon: Ban, text: 'suspended recruiter', tone: 'text-rose-600 bg-rose-50' },
    'company.reactivate': { icon: RefreshCw, text: 'reactivated recruiter', tone: 'text-emerald-600 bg-emerald-50' },
}

export const ActivityItem = ({ item }) => {
    const a = ACTIONS[item.action] ?? { icon: Briefcase, text: item.action, tone: 'text-ink-600 bg-ink-100' }
    return (
        <li className='flex gap-3 px-5 py-3.5'>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.tone}`}><a.icon className='h-4 w-4' aria-hidden='true' /></span>
            <div className='min-w-0 flex-1 text-sm'>
                <p className='text-ink-700'><span className='font-medium text-ink-900'>{item.actorName ?? 'Admin'}</span> {a.text} <span className='font-medium text-ink-900'>{item.targetLabel}</span></p>
                {item.reason && <p className='mt-0.5 text-ink-500'>“{item.reason}”</p>}
            </div>
            <time className='shrink-0 text-xs text-ink-400' dateTime={item.createdAt} title={formatDate(item.createdAt)}>{timeAgo(item.createdAt)}</time>
        </li>
    )
}

const AdminActivity = () => {
    usePageMeta({ title: 'Moderation log', noindex: true })
    const list = useAdminList(adminApi.activity, 'type')
    const items = list.data?.activity ?? []

    return (
        <>
            <PageHeader title='Moderation log' description='Every admin action, newest first.' />
            <Tabs className='mb-5 w-fit max-w-full' value={list.filter || 'all'} onChange={(v) => list.setFilter(v === 'all' ? '' : v)} tabs={[
                { value: 'all', label: 'All' }, { value: 'job', label: 'Jobs' }, { value: 'user', label: 'Job seekers' }, { value: 'company', label: 'Recruiters' },
            ]} />
            <ListBody list={list} empty='No moderation actions yet'>
                {items.length > 0
                    ? <ul className='card divide-y divide-ink-100'>{items.map((i) => <ActivityItem key={i._id} item={i} />)}</ul>
                    : <EmptyState title='No moderation actions yet' />}
            </ListBody>
        </>
    )
}

export default AdminActivity
