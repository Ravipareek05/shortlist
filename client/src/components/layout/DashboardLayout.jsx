import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from '../brand/Logo'
import Button from '../ui/Button'

const navClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-white text-ink-900 shadow-card ring-1 ring-ink-100' : 'text-ink-500 hover:bg-ink-100/70 hover:text-ink-900'}`

const SidebarNav = ({ items }) => (
    <nav aria-label='Dashboard' className='flex flex-col gap-1'>
        {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                <item.icon className='h-4 w-4 shrink-0' aria-hidden='true' />
                <span className='flex-1'>{item.label}</span>
                {item.badge ? <span className='rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold tabular-nums text-white'>{item.badge}</span> : null}
            </NavLink>
        ))}
    </nav>
)

/**
 * Shared shell for candidate, recruiter and admin areas.
 * Sidebar on desktop, slide-in drawer on mobile.
 */
const DashboardLayout = ({ label, items, account, footer, banner }) => {
    const [open, setOpen] = useState(false)
    const location = useLocation()

    useEffect(() => { setOpen(false) }, [location.pathname])

    useEffect(() => {
        if (!open) return
        const onKey = (e) => e.key === 'Escape' && setOpen(false)
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open])

    const sidebar = (
        <div className='flex h-full flex-col gap-6 p-4'>
            <div className='px-1 pt-1'><Logo label={label} /></div>
            <SidebarNav items={items} />
            <div className='mt-auto space-y-3'>
                {account}
                {footer}
            </div>
        </div>
    )

    return (
        <div className='min-h-screen bg-ink-50/70'>
            <a href='#dashboard-main' className='sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4'>Skip to content</a>

            {/* Desktop sidebar */}
            <aside className='fixed inset-y-0 left-0 hidden w-64 border-r border-ink-100 bg-ink-50 lg:block'>{sidebar}</aside>

            {/* Mobile top bar */}
            <div className='sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-100 bg-white/90 px-4 backdrop-blur lg:hidden'>
                <Logo label={label} />
                <Button variant='ghost' size='icon' onClick={() => setOpen(true)} aria-label='Open navigation' aria-expanded={open}>
                    <Menu className='h-5 w-5' aria-hidden='true' />
                </Button>
            </div>

            {/* Mobile drawer */}
            {open && (
                <div className='fixed inset-0 z-50 lg:hidden' role='dialog' aria-modal='true' aria-label='Navigation'>
                    <div className='absolute inset-0 animate-fade-in bg-ink-950/40' onClick={() => setOpen(false)} aria-hidden='true' />
                    <div className='absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-in-left bg-ink-50 shadow-elevated'>
                        <Button variant='ghost' size='icon-sm' className='absolute right-3 top-4' onClick={() => setOpen(false)} aria-label='Close navigation'>
                            <X className='h-4 w-4' aria-hidden='true' />
                        </Button>
                        {sidebar}
                    </div>
                </div>
            )}

            <div className='lg:pl-64'>
                {banner}
                <main id='dashboard-main' className='mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout
