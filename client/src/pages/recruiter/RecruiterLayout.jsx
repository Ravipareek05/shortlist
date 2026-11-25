import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Briefcase, LayoutDashboard, LogOut, Plus, Users } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { RequireRecruiter } from '../../components/layout/Guards'
import { Avatar } from '../../components/ui/Misc'
import Button from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useApp } from '../../context/AppContext'

const RecruiterShell = () => {
    const { companyData, logoutRecruiter } = useApp()
    const navigate = useNavigate()
    const [confirmLogout, setConfirmLogout] = useState(false)

    const items = [
        { to: '/dashboard', end: true, label: 'Overview', icon: LayoutDashboard },
        { to: '/dashboard/manage-jobs', label: 'Jobs', icon: Briefcase },
        { to: '/dashboard/view-applications', label: 'Applicants', icon: Users },
        { to: '/dashboard/company', label: 'Company profile', icon: Building2 },
    ]

    const logout = () => {
        logoutRecruiter()
        navigate('/')
    }

    return (
        <>
            <DashboardLayout
                label='Recruiter'
                items={items}
                account={
                    <div className='flex items-center gap-3 rounded-xl bg-white p-3 shadow-card ring-1 ring-ink-100'>
                        <Avatar src={companyData?.image} name={companyData?.name ?? ''} size='sm' />
                        <div className='min-w-0 flex-1'>
                            <p className='truncate text-sm font-medium text-ink-900'>{companyData?.name ?? 'Loading…'}</p>
                            <p className='truncate text-xs text-ink-500'>{companyData?.email}</p>
                        </div>
                        <Button variant='ghost' size='icon-sm' onClick={() => setConfirmLogout(true)} aria-label='Log out'>
                            <LogOut className='h-4 w-4' aria-hidden='true' />
                        </Button>
                    </div>
                }
                footer={<Button to='/dashboard/add-job' className='w-full'><Plus className='h-4 w-4' aria-hidden='true' />Post a job</Button>}
            />
            <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title='Log out?' size='sm'
                footer={<><Button variant='secondary' onClick={() => setConfirmLogout(false)}>Cancel</Button><Button variant='dark' onClick={logout}>Log out</Button></>}>
                <p className='text-sm text-ink-600'>You&apos;ll need to sign in again to manage your jobs.</p>
            </Modal>
        </>
    )
}

const RecruiterLayout = () => (
    <RequireRecruiter>
        <RecruiterShell />
    </RequireRecruiter>
)

export default RecruiterLayout
