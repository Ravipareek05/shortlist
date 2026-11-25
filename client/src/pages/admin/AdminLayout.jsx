import { UserButton } from '@clerk/react'
import { Activity, Briefcase, Building2, FileText, Gauge, Home, Users } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { RequireCandidate } from '../../components/layout/Guards'
import Button from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'

const AdminShell = () => {
    const { userData } = useApp()
    const items = [
        { to: '/admin', end: true, label: 'Overview', icon: Gauge },
        { to: '/admin/jobs', label: 'Job moderation', icon: Briefcase },
        { to: '/admin/users', label: 'Job seekers', icon: Users },
        { to: '/admin/companies', label: 'Recruiters', icon: Building2 },
        { to: '/admin/applications', label: 'Applications', icon: FileText },
        { to: '/admin/activity', label: 'Moderation log', icon: Activity },
    ]
    return (
        <DashboardLayout
            label='Admin'
            items={items}
            account={
                <div className='flex items-center gap-3 rounded-xl bg-white p-3 shadow-card ring-1 ring-ink-100'>
                    <UserButton />
                    <div className='min-w-0'>
                        <p className='truncate text-sm font-medium text-ink-900'>{userData?.name}</p>
                        <p className='truncate text-xs text-ink-500'>Administrator</p>
                    </div>
                </div>
            }
            footer={<Button to='/' variant='secondary' className='w-full'><Home className='h-4 w-4' aria-hidden='true' />Back to site</Button>}
        />
    )
}

// Client guard is UX only: every /api/admin endpoint checks the admin role on the server.
const AdminLayout = () => (
    <RequireCandidate adminOnly>
        <AdminShell />
    </RequireCandidate>
)

export default AdminLayout
