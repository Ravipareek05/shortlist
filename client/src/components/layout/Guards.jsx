import { useClerk } from '@clerk/react'
import { Navigate, useLocation } from 'react-router-dom'
import { Lock, ShieldAlert } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import Logo from '../brand/Logo'
import Button from '../ui/Button'
import { ErrorState, PageLoader } from '../ui/Feedback'

// Note: these guards are for UX only. Every protected API endpoint enforces
// authentication and authorization on the server.

const CenteredCard = ({ icon: Icon, title, description, children }) => (
    <div className='flex min-h-screen flex-col items-center justify-center bg-ink-50/70 px-4'>
        <div className='mb-8'><Logo /></div>
        <div className='card w-full max-w-md p-8 text-center'>
            <div className='mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink-100 text-ink-600'>
                <Icon className='h-5 w-5' aria-hidden='true' />
            </div>
            <h1 className='text-lg font-semibold text-ink-900'>{title}</h1>
            <p className='mt-1.5 text-sm text-ink-500'>{description}</p>
            <div className='mt-6 flex flex-col gap-2'>{children}</div>
        </div>
    </div>
)

// Recruiter-only routes: redirect to login and come back afterwards
export const RequireRecruiter = ({ children }) => {
    const { companyToken } = useApp()
    const location = useLocation()
    if (!companyToken) {
        return <Navigate to={`/recruiter/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
    }
    return children
}

// Clerk-authenticated routes (candidates and admins)
export const RequireCandidate = ({ children, adminOnly = false }) => {
    const { clerkLoaded, isSignedIn, userData, userLoading, userError, fetchUserData } = useApp()
    const { openSignIn } = useClerk()
    const location = useLocation()

    if (!clerkLoaded) return <PageLoader />

    if (!isSignedIn) {
        return (
            <CenteredCard icon={Lock} title='Sign in to continue' description={adminOnly ? 'The admin panel requires an administrator account.' : 'Sign in to view your dashboard, applications and saved jobs.'}>
                <Button size='lg' onClick={() => openSignIn({ forceRedirectUrl: location.pathname })}>Sign in</Button>
                <Button to='/' variant='ghost'>Back to home</Button>
            </CenteredCard>
        )
    }

    if (userError && !userData) {
        return (
            <div className='flex min-h-screen items-center justify-center bg-ink-50/70 px-4'>
                <ErrorState title='We could not load your account' error={userError} onRetry={fetchUserData} className='w-full max-w-md bg-white' />
            </div>
        )
    }

    if (!userData || userLoading && !userData) return <PageLoader label='Loading your account…' />

    if (adminOnly && userData.role !== 'admin') {
        return (
            <CenteredCard icon={ShieldAlert} title='Admins only' description="Your account doesn't have access to the admin panel.">
                <Button to='/' variant='secondary'>Back to home</Button>
            </CenteredCard>
        )
    }

    return children
}
