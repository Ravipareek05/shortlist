import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { StatusBadge } from '../ui/Badge'
import { Avatar } from '../ui/Misc'
import { formatDate } from '../../lib/format'

// Handles applications whose job was deleted (jobId null / jobRemoved) using the saved snapshot
const describeApplication = (a) => {
    const removed = a.jobRemoved || !a.jobId
    return {
        removed,
        title: a.jobId?.title ?? a.jobSnapshot?.title ?? 'Job no longer listed',
        location: a.jobId?.location ?? a.jobSnapshot?.location ?? '',
        company: a.companyId?.name ?? 'Company unavailable',
        logo: a.companyId?.image,
        jobLink: !removed && a.jobId?._id ? `/jobs/${a.jobId._id}` : null,
    }
}

// Table on desktop, stacked cards on mobile
const ApplicationList = ({ applications }) => (
    <>
        <div className='hidden overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card md:block'>
            <table className='w-full text-left text-sm'>
                <thead className='border-b border-ink-100 bg-ink-50/60 text-xs font-medium uppercase tracking-wider text-ink-500'>
                    <tr>
                        <th scope='col' className='px-5 py-3'>Role</th>
                        <th scope='col' className='px-5 py-3'>Company</th>
                        <th scope='col' className='px-5 py-3'>Applied</th>
                        <th scope='col' className='px-5 py-3'>Status</th>
                    </tr>
                </thead>
                <tbody className='divide-y divide-ink-100'>
                    {applications.map((a) => {
                        const d = describeApplication(a)
                        return (
                            <tr key={a._id} className='hover:bg-ink-50/50'>
                                <td className='px-5 py-4'>
                                    {d.jobLink ? <Link to={d.jobLink} className='font-medium text-ink-900 hover:text-brand-600'>{d.title}</Link> : <span className='font-medium text-ink-700'>{d.title}</span>}
                                    <div className='mt-0.5 flex items-center gap-2 text-xs text-ink-500'>
                                        {d.location && <span className='inline-flex items-center gap-1'><MapPin className='h-3 w-3' aria-hidden='true' />{d.location}</span>}
                                        {d.removed && <span className='text-ink-400'>· Listing removed</span>}
                                    </div>
                                </td>
                                <td className='px-5 py-4'>
                                    <div className='flex items-center gap-2.5'>
                                        <Avatar src={d.logo} name={d.company} size='sm' />
                                        <span className='text-ink-700'>{d.company}</span>
                                    </div>
                                </td>
                                <td className='px-5 py-4 text-ink-500'>{formatDate(a.date)}</td>
                                <td className='px-5 py-4'><StatusBadge status={a.status} /></td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

        <ul className='space-y-3 md:hidden'>
            {applications.map((a) => {
                const d = describeApplication(a)
                return (
                    <li key={a._id} className='card p-4'>
                        <div className='flex items-start gap-3'>
                            <Avatar src={d.logo} name={d.company} />
                            <div className='min-w-0 flex-1'>
                                {d.jobLink ? <Link to={d.jobLink} className='font-medium text-ink-900'>{d.title}</Link> : <p className='font-medium text-ink-700'>{d.title}</p>}
                                <p className='text-sm text-ink-500'>{d.company}{d.location && ` · ${d.location}`}</p>
                                {d.removed && <p className='text-xs text-ink-400'>Listing removed</p>}
                            </div>
                        </div>
                        <div className='mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-sm'>
                            <span className='text-ink-500'>Applied {formatDate(a.date)}</span>
                            <StatusBadge status={a.status} />
                        </div>
                    </li>
                )
            })}
        </ul>
    </>
)

export default ApplicationList
