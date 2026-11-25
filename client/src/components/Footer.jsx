import { Link } from 'react-router-dom'
import { LogoMark } from './brand/Logo'

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className='mt-24 border-t border-ink-100 bg-ink-50/60'>
      <div className='container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='lg:col-span-2'>
          <Link to='/' className='inline-flex items-center gap-2.5' aria-label='Shortlist home'>
            <LogoMark />
            <span className='text-[17px] font-semibold tracking-tight text-ink-900'>shortlist</span>
          </Link>
          <p className='mt-3 max-w-xs text-sm leading-6 text-ink-500'>
            A modern platform connecting talented candidates with companies that are hiring.
          </p>
        </div>

        <nav aria-label='For candidates'>
          <h2 className='text-sm font-semibold text-ink-900'>Candidates</h2>
          <ul className='mt-3 space-y-2 text-sm text-ink-500'>
            <li><Link className='hover:text-ink-900' to='/jobs'>Browse jobs</Link></li>
            <li><Link className='hover:text-ink-900' to='/candidate/applications'>My applications</Link></li>
            <li><Link className='hover:text-ink-900' to='/candidate/saved'>Saved jobs</Link></li>
          </ul>
        </nav>

        <nav aria-label='For recruiters'>
          <h2 className='text-sm font-semibold text-ink-900'>Recruiters</h2>
          <ul className='mt-3 space-y-2 text-sm text-ink-500'>
            <li><Link className='hover:text-ink-900' to='/recruiter/signup'>Post a job</Link></li>
            <li><Link className='hover:text-ink-900' to='/recruiter/login'>Recruiter sign in</Link></li>
            <li><Link className='hover:text-ink-900' to='/dashboard'>Recruiter dashboard</Link></li>
          </ul>
        </nav>
      </div>
      <div className='border-t border-ink-100'>
        <p className='container-page py-5 text-xs text-ink-400'>© {year} Shortlist. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
