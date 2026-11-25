import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, Clock, MapPin, Wallet } from 'lucide-react'
import { Avatar } from '../ui/Misc'
import Badge from '../ui/Badge'
import { formatSalary, levelLabel, timeAgo } from '../../lib/format'
import { htmlToText } from '../../lib/sanitize'
import { useApp } from '../../context/AppContext'

export const SaveButton = ({ jobId, className = '', withLabel = false }) => {
    const { savedJobIds, toggleSaveJob } = useApp()
    const saved = savedJobIds.has(String(jobId))
    const Icon = saved ? BookmarkCheck : Bookmark

    return (
        <button
            type='button'
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSaveJob(jobId) }}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${withLabel ? 'h-10 border border-ink-200 bg-white px-4 shadow-card hover:bg-ink-50' : 'h-9 w-9 hover:bg-ink-100'} ${saved ? 'text-brand-600' : 'text-ink-500 hover:text-ink-900'} ${className}`}
        >
            <Icon className={`h-[18px] w-[18px] ${saved ? 'fill-brand-100' : ''}`} aria-hidden='true' />
            {withLabel && (saved ? 'Saved' : 'Save')}
        </button>
    )
}

const JobCard = ({ job, applied = false }) => {
    const company = job.companyId ?? {}
    const excerpt = htmlToText(job.description).slice(0, 140)

    return (
        <article className='group relative flex h-full flex-col rounded-xl border border-ink-100 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-elevated'>
            <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                    <Avatar src={company.image} name={company.name} />
                    <div className='min-w-0'>
                        <p className='truncate text-sm font-medium text-ink-600'>{company.name}</p>
                        <p className='flex items-center gap-1 text-xs text-ink-400'>
                            <Clock className='h-3 w-3' aria-hidden='true' />{timeAgo(job.date)}
                        </p>
                    </div>
                </div>
                <SaveButton jobId={job._id} className='-mr-1.5 -mt-1' />
            </div>

            <h3 className='mt-4 text-base font-semibold leading-snug text-ink-900'>
                <Link to={`/jobs/${job._id}`} className='after:absolute after:inset-0 after:rounded-xl focus:outline-none'>
                    {job.title}
                </Link>
            </h3>

            {excerpt && <p className='mt-1.5 line-clamp-2 text-sm leading-6 text-ink-500'>{excerpt}</p>}

            <div className='mt-4 flex flex-wrap gap-1.5'>
                <Badge><MapPin className='h-3 w-3' aria-hidden='true' />{job.location}</Badge>
                <Badge>{levelLabel(job.level)}</Badge>
                {job.jobType && <Badge>{job.jobType}</Badge>}
            </div>

            <div className='mt-auto flex items-center justify-between gap-3 pt-5'>
                <span className='inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900'>
                    <Wallet className='h-4 w-4 text-ink-400' aria-hidden='true' />
                    {formatSalary(job.salary)}
                    <span className='font-normal text-ink-400'>CTC</span>
                </span>
                {applied
                    ? <Badge tone='success' dot>Applied</Badge>
                    : <span className='text-sm font-medium text-brand-600 opacity-0 transition-opacity group-hover:opacity-100'>View role →</span>}
            </div>
        </article>
    )
}

export const JobCardSkeleton = () => (
    <div className='rounded-xl border border-ink-100 bg-white p-5 shadow-card'>
        <div className='flex items-center gap-3'>
            <div className='skeleton h-10 w-10 rounded-lg' />
            <div className='flex-1 space-y-2'><div className='skeleton h-3 w-24' /><div className='skeleton h-2.5 w-16' /></div>
        </div>
        <div className='skeleton mt-5 h-4 w-3/4' />
        <div className='skeleton mt-3 h-3 w-full' />
        <div className='skeleton mt-2 h-3 w-5/6' />
        <div className='mt-5 flex gap-2'><div className='skeleton h-5 w-20 rounded-full' /><div className='skeleton h-5 w-16 rounded-full' /></div>
        <div className='skeleton mt-6 h-4 w-24' />
    </div>
)

export default memo(JobCard)
