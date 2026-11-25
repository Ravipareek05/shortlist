import { Link } from 'react-router-dom'
import { Briefcase, Building2, FileText, Users } from 'lucide-react'
import { PageHeader, StatCard } from '../../components/ui/Misc'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { adminApi } from '../../lib/api'
import { formatNumber } from '../../lib/format'
import { useQuery } from '../../hooks/useQuery'
import { usePageMeta } from '../../hooks/usePageMeta'
import { ActivityItem } from './AdminActivity'

const Breakdown = ({ title, rows, to }) => {
    const total = rows.reduce((s, r) => s + r.value, 0) || 1
    return (
        <section className='card p-5'>
            <div className='flex items-center justify-between'>
                <h2 className='font-semibold text-ink-900'>{title}</h2>
                {to && <Link to={to} className='text-sm font-medium text-brand-600 hover:text-brand-700'>Open</Link>}
            </div>
            <div className='mt-4 flex h-2 overflow-hidden rounded-full bg-ink-100' aria-hidden='true'>
                {rows.map((r) => r.value > 0 && <div key={r.label} className={r.color} style={{ width: `${(r.value / total) * 100}%` }} />)}
            </div>
            <dl className='mt-4 space-y-2'>
                {rows.map((r) => (
                    <div key={r.label} className='flex items-center justify-between text-sm'>
                        <dt className='flex items-center gap-2 text-ink-600'><span className={`h-2 w-2 rounded-full ${r.color}`} aria-hidden='true' />{r.label}</dt>
                        <dd className='font-medium tabular-nums text-ink-900'>{formatNumber(r.value)}</dd>
                    </div>
                ))}
            </dl>
        </section>
    )
}

const AdminOverview = () => {
    usePageMeta({ title: 'Admin', noindex: true })
    const { data, error, loading, reload } = useQuery(() => adminApi.stats(), [])
    const s = data?.stats

    if (error) return <ErrorState title='Could not load platform statistics' error={error} onRetry={reload} />

    return (
        <>
            <PageHeader eyebrow='Admin' title='Platform overview' description='Live numbers from the Shortlist database.' />

            <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                <StatCard label='Job seekers' value={formatNumber(s?.users.total)} hint={s && `${s.users.newThisWeek} new this week`} icon={Users} loading={loading} />
                <StatCard label='Recruiters' value={formatNumber(s?.companies.total)} hint={s && `${s.companies.newThisWeek} new this week`} icon={Building2} tone='neutral' loading={loading} />
                <StatCard label='Jobs' value={formatNumber(s?.jobs.total)} hint={s && `${s.jobs.visible} visible`} icon={Briefcase} tone='success' loading={loading} />
                <StatCard label='Applications' value={formatNumber(s?.applications.total)} hint={s && `${s.applications.newThisWeek} this week`} icon={FileText} tone='warning' loading={loading} />
            </div>

            {s && (
                <div className='mt-6 grid gap-4 lg:grid-cols-3'>
                    <Breakdown title='Job moderation' to='/admin/jobs' rows={[
                        { label: 'Approved', value: s.jobs.approved, color: 'bg-emerald-500' },
                        { label: 'Awaiting review', value: s.jobs.pending, color: 'bg-amber-400' },
                        { label: 'Rejected', value: s.jobs.rejected, color: 'bg-rose-500' },
                        { label: 'Hidden', value: s.jobs.hidden, color: 'bg-ink-400' },
                    ]} />
                    <Breakdown title='Applications' to='/admin/applications' rows={[
                        { label: 'Pending', value: s.applications.pending, color: 'bg-amber-400' },
                        { label: 'Accepted', value: s.applications.accepted, color: 'bg-emerald-500' },
                        { label: 'Rejected', value: s.applications.rejected, color: 'bg-rose-500' },
                    ]} />
                    <Breakdown title='Accounts' rows={[
                        { label: 'Active job seekers', value: s.users.active, color: 'bg-brand-500' },
                        { label: 'Suspended job seekers', value: s.users.suspended, color: 'bg-rose-500' },
                        { label: 'Active recruiters', value: s.companies.active, color: 'bg-ink-700' },
                        { label: 'Suspended recruiters', value: s.companies.suspended, color: 'bg-rose-300' },
                    ]} />
                </div>
            )}

            <section className='card mt-6' aria-labelledby='recent-activity'>
                <div className='flex items-center justify-between border-b border-ink-100 px-5 py-4'>
                    <h2 id='recent-activity' className='font-semibold text-ink-900'>Recent moderation</h2>
                    <Link to='/admin/activity' className='text-sm font-medium text-brand-600 hover:text-brand-700'>Full log</Link>
                </div>
                {data?.recentActivity?.length
                    ? <ul className='divide-y divide-ink-100'>{data.recentActivity.map((a) => <ActivityItem key={a._id} item={a} />)}</ul>
                    : <div className='p-5'><EmptyState title='No moderation actions yet' description='Actions you take will be logged here.' /></div>}
            </section>
        </>
    )
}

export default AdminOverview
