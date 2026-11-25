import { useEffect, useState } from 'react'
import { useClerk, UserButton } from '@clerk/clerk-react'
import { NavLink, useLocation } from 'react-router-dom'
import { Bookmark, Briefcase, LayoutDashboard, Menu, ShieldCheck, X } from 'lucide-react'
import Logo from './brand/Logo'
import Button from './ui/Button'
import { useApp } from '../context/AppContext'

const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'}`

const Navbar = () => {

    const { openSignIn, openSignUp } = useClerk()
    const { isSignedIn, clerkLoaded, companyToken, isAdmin } = useApp()
    const [open, setOpen] = useState(false)
    const location = useLocation()

    useEffect(() => { setOpen(false) }, [location.pathname, location.search])

    const links = [
        { to: '/jobs', label: 'Find jobs', icon: Briefcase, show: true },
        { to: '/candidate/saved', label: 'Saved', icon: Bookmark, show: isSignedIn },
        { to: '/candidate', label: 'My dashboard', icon: LayoutDashboard, show: isSignedIn, end: true },
        { to: '/admin', label: 'Admin', icon: ShieldCheck, show: isAdmin },
    ].filter((l) => l.show)

    return (
        <header className='sticky top-0 z-40 border-b border-ink-100/80 bg-white/85 backdrop-blur-md'>
            <div className='container-page flex h-16 items-center justify-between gap-4'>
                <div className='flex items-center gap-6'>
                    <Logo />
                    <nav aria-label='Main' className='hidden items-center gap-1 md:flex'>
                        {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>)}
                    </nav>
                </div>

                <div className='hidden items-center gap-2 md:flex'>
                    {companyToken
                        ? <Button to='/dashboard' variant='secondary' size='sm'><LayoutDashboard className='h-4 w-4' aria-hidden='true' />Recruiter dashboard</Button>
                        : <Button to='/recruiter/login' variant='ghost' size='sm'>For recruiters</Button>}
                    {clerkLoaded && (isSignedIn
                        ? <div className='ml-1 flex h-9 items-center'><UserButton /></div>
                        : <>
                            <Button variant='ghost' size='sm' onClick={() => openSignIn()}>Sign in</Button>
                            <Button variant='dark' size='sm' onClick={() => openSignUp()}>Get started</Button>
                        </>)}
                </div>

                <div className='flex items-center gap-2 md:hidden'>
                    {clerkLoaded && isSignedIn && <UserButton />}
                    <Button variant='ghost' size='icon' onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls='mobile-menu' aria-label={open ? 'Close menu' : 'Open menu'}>
                        {open ? <X className='h-5 w-5' aria-hidden='true' /> : <Menu className='h-5 w-5' aria-hidden='true' />}
                    </Button>
                </div>
            </div>

            {open && (
                <div id='mobile-menu' className='animate-fade-in border-t border-ink-100 bg-white md:hidden'>
                    <nav aria-label='Mobile' className='container-page flex flex-col gap-1 py-3'>
                        {links.map((l) => (
                            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-ink-50 text-ink-900' : 'text-ink-600'}`}>
                                <l.icon className='h-4 w-4' aria-hidden='true' />{l.label}
                            </NavLink>
                        ))}
                        <div className='my-2 border-t border-ink-100' />
                        {companyToken
                            ? <Button to='/dashboard' variant='secondary'>Recruiter dashboard</Button>
                            : <Button to='/recruiter/login' variant='secondary'>For recruiters</Button>}
                        {clerkLoaded && !isSignedIn && (
                            <div className='mt-1 grid grid-cols-2 gap-2'>
                                <Button variant='secondary' onClick={() => openSignIn()}>Sign in</Button>
                                <Button variant='dark' onClick={() => openSignUp()}>Get started</Button>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}

export default Navbar
