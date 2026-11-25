import { useClerk } from '@clerk/react'
import { ExternalLink, FileText, Settings } from 'lucide-react'
import { PageHeader, Avatar } from '../../components/ui/Misc'
import Button from '../../components/ui/Button'
import { AccountBadge } from '../../components/ui/Badge'
import ResumeUploader from '../../components/candidate/ResumeUploader'
import { usePageMeta } from '../../hooks/usePageMeta'
import { formatDate } from '../../lib/format'
import { useApp } from '../../context/AppContext'

const Row = ({ label, children }) => (
    <div className='grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4'>
        <dt className='text-sm text-ink-500'>{label}</dt>
        <dd className='text-sm font-medium text-ink-900'>{children}</dd>
    </div>
)

const CandidateProfile = () => {
    usePageMeta({ title: 'Profile & resume', noindex: true })
    const { openUserProfile } = useClerk()
    const { userData } = useApp()
    const suspended = userData.status === 'suspended'

    return (
        <>
            <PageHeader title='Profile & resume' description='This is what recruiters see when you apply.' />

            <div className='grid gap-6 lg:grid-cols-2'>
                <section className='card p-5 sm:p-6' aria-labelledby='profile-heading'>
                    <div className='flex items-center justify-between gap-3'>
                        <h2 id='profile-heading' className='font-semibold text-ink-900'>Profile</h2>
                        <Button variant='secondary' size='sm' onClick={() => openUserProfile()}>
                            <Settings className='h-3.5 w-3.5' aria-hidden='true' /> Manage account
                        </Button>
                    </div>
                    <div className='mt-5 flex items-center gap-4'>
                        <Avatar src={userData.image} name={userData.name} size='xl' rounded='full' />
                        <div className='min-w-0'>
                            <p className='truncate text-lg font-semibold text-ink-900'>{userData.name}</p>
                            <p className='truncate text-sm text-ink-500'>{userData.email}</p>
                        </div>
                    </div>
                    <dl className='mt-5 divide-y divide-ink-100 border-t border-ink-100'>
                        <Row label='Account status'><AccountBadge status={userData.status} /></Row>
                        {userData.createdAt && <Row label='Member since'>{formatDate(userData.createdAt)}</Row>}
                    </dl>
                    <p className='mt-3 text-xs text-ink-500'>Name, email and photo are managed in your account settings and sync automatically.</p>
                </section>

                <section className='card p-5 sm:p-6' aria-labelledby='resume-heading'>
                    <h2 id='resume-heading' className='font-semibold text-ink-900'>Resume</h2>
                    <p className='mt-1 text-sm text-ink-500'>Recruiters see this resume on each application. Uploading a new file replaces it.</p>

                    {userData.resume && (
                        <div className='mt-5 flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-3'>
                            <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-ink-100'><FileText className='h-5 w-5' aria-hidden='true' /></span>
                            <div className='min-w-0 flex-1'>
                                <p className='text-sm font-medium text-ink-900'>Current resume</p>
                                <p className='text-xs text-ink-500'>PDF on file</p>
                            </div>
                            <Button href={userData.resume} target='_blank' rel='noopener noreferrer' variant='secondary' size='sm'>
                                View <ExternalLink className='h-3 w-3' aria-hidden='true' />
                            </Button>
                        </div>
                    )}

                    <div className='mt-5'>
                        {suspended
                            ? <p className='text-sm text-ink-500'>Resume uploads are disabled while your account is suspended.</p>
                            : <ResumeUploader />}
                    </div>
                </section>
            </div>
        </>
    )
}

export default CandidateProfile
