import { ArrowRight, Bookmark, Briefcase, CircleCheck, Circle, Hourglass, Send } from 'lucide-react'
import { PageHeader, StatCard } from '../../components/ui/Misc'
import { EmptyState } from '../../components/ui/Feedback'
import Button from '../../components/ui/Button'
import ApplicationList from '../../components/candidate/ApplicationList'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useApp } from '../../context/AppContext'

// Profile completeness from real fields only
const ProfileCompletion = ({ user }) => {
    const steps = [
        { label: 'Name', done: Boolean(user.name) },
        { label: 'Email address', done: Boolean(user.email) },
        { label: 'Profile photo', done: Boolean(user.image) },
        { label: 'Resume uploaded', done: Boolean(user.resume) },
    ]
    const done = steps.filter((s) => s.done).length
    const pct = Math.round((done / steps.length) * 100)

    return (
        <div className='card p-5'>
            <div className='flex items-center justify-between'>
                <h2 className='font-semibold text-ink-900'>Profile strength</h2>
                <span className='text-sm font-semibold tabular-nums text-ink-900'>{pct}%</span>
            </div>
            <div className='mt-3 h-2 overflow-hidden rounded-full bg-ink-100' role='progressbar' aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label='Profile completion'>
                <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} />
            </div>
            <ul className='mt-4 space-y-2'>
                {steps.map((s) => (
                    <li key={s.label} className='flex items-center gap-2 text-sm'>
                        {s.done ? <CircleCheck className='h-4 w-4 text-emerald-500' aria-hidden='true' /> : <Circle className='h-4 w-4 text-ink-300' aria-hidden='true' />}
                        <span className={s.done ? 'text-ink-600' : 'font-medium text-ink-900'}>{s.label}</span>
                        <span className='sr-only'>{s.done ? 'complete' : 'incomplete'}</span>
                    </li>
                ))}
            </ul>
            {!user.resume && <Button to='/candidate/profile' className='mt-5 w-full'>Upload your resume</Button>}
        </div>
    )
}

const CandidateOverview = () => {
    usePageMeta({ title: 'My dashboard', noindex: true })
    const { userData, userApplications, savedJobIds } = useApp()

    const counts = userApplications.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }), {})
    const firstName = userData.name?.split(' ')[0]

    return (
        <>
            <PageHeader eyebrow='Dashboard' title={`Welcome back${firstName ? `, ${firstName}` : ''}`} description='Here is where your job search stands.'
                actions={<Button to='/jobs'>Browse jobs <ArrowRight className='h-4 w-4' aria-hidden='true' /></Button>} />

            <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                <StatCard label='Applications' value={userApplications.length} icon={Send} />
                <StatCard label='In review' value={counts.Pending ?? 0} icon={Hourglass} tone='warning' />
                <StatCard label='Accepted' value={counts.Accepted ?? 0} icon={CircleCheck} tone='success' />
                <StatCard label='Saved jobs' value={savedJobIds.size} icon={Bookmark} tone='neutral' />
            </div>

            <div className='mt-6 grid gap-6 lg:grid-cols-[1fr_300px]'>
                <section aria-labelledby='recent-apps'>
                    <div className='mb-3 flex items-center justify-between'>
                        <h2 id='recent-apps' className='font-semibold text-ink-900'>Recent applications</h2>
                        {userApplications.length > 0 && <Button to='/candidate/applications' variant='ghost' size='sm'>View all</Button>}
                    </div>
                    {userApplications.length === 0
                        ? <EmptyState icon={Briefcase} title='No applications yet' description='When you apply to a job it will show up here with its status.' action={<Button to='/jobs' variant='secondary'>Find a role</Button>} />
                        : <ApplicationList applications={userApplications.slice(0, 5)} />}
                </section>
                <ProfileCompletion user={userData} />
            </div>
        </>
    )
}

export default CandidateOverview
