import { UserButton } from '@clerk/react'
import { Bookmark, Briefcase, FileText, LayoutDashboard, Search, ShieldCheck } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { RequireCandidate } from '../../components/layout/Guards'
import { Notice } from '../../components/ui/Feedback'
import Button from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'

const CandidateShell = () => {
    const { userData, savedJobIds, isAdmin } = useApp()

    const items = [
        { to: '/candidate', end: true, label: 'Overview', icon: LayoutDashboard },
        { to: '/candidate/applications', label: 'Applications', icon: Briefcase },
        { to: '/candidate/saved', label: 'Saved jobs', icon: Bookmark, badge: savedJobIds.size || null },
        { to: '/candidate/profile', label: 'Profile & resume', icon: FileText },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin panel', icon: ShieldCheck }] : []),
    ]

    return (
        <DashboardLayout
            label='Candidate'
            items={items}
            account={
                <div className='flex items-center gap-3 rounded-xl bg-white p-3 shadow-card ring-1 ring-ink-100'>
                    <UserButton />
                    <div className='min-w-0'>
                        <p className='truncate text-sm font-medium text-ink-900'>{userData?.name}</p>
                        <p className='truncate text-xs text-ink-500'>{userData?.email}</p>
                    </div>
                </div>
            }
            footer={<Button to='/jobs' variant='dark' className='w-full'><Search className='h-4 w-4' aria-hidden='true' />Find jobs</Button>}
            banner={userData?.status === 'suspended' && (
                <div className='px-4 pt-4 sm:px-6 lg:px-8'>
                    <Notice tone='danger' title='Your account is suspended'>You can view your data but can&apos;t apply to or save jobs. Contact support if you think this is a mistake.</Notice>
                </div>
            )}
        />
    )
}

const CandidateLayout = () => (
    <RequireCandidate>
        <CandidateShell />
    </RequireCandidate>
)

export default CandidateLayout
