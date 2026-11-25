import { Link } from 'react-router-dom'

// Shortlist mark: a short list whose last item is checked.
export const LogoMark = ({ className = 'h-8 w-8', inverted = false }) => (
    <svg viewBox='0 0 32 32' fill='none' className={className} aria-hidden='true'>
        <rect width='32' height='32' rx='8' fill={inverted ? '#FFFFFF' : '#0F1422'} />
        <rect x='8' y='9.5' width='9' height='2.6' rx='1.3' fill={inverted ? '#B9C0CE' : '#5D6680'} />
        <rect x='8' y='14.7' width='12' height='2.6' rx='1.3' fill={inverted ? '#B9C0CE' : '#5D6680'} />
        <rect x='8' y='19.9' width='7' height='2.6' rx='1.3' fill={inverted ? '#0F1422' : '#FFFFFF'} />
        <path d='M18 21.2l2.4 2.4 4.6-5.1' stroke={inverted ? '#3F47EE' : '#7381FF'} strokeWidth='2.6' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
)

const Logo = ({ to = '/', inverted = false, className = '', label }) => (
    <Link to={to} className={`inline-flex items-center gap-2.5 rounded-lg ${className}`} aria-label='Shortlist home'>
        <LogoMark inverted={inverted} />
        <span className={`text-[17px] font-semibold tracking-tight ${inverted ? 'text-white' : 'text-ink-900'}`}>shortlist</span>
        {label && <span className={`hidden rounded-md px-1.5 py-0.5 text-[11px] font-medium sm:inline ${inverted ? 'bg-white/10 text-white/80' : 'bg-ink-100 text-ink-600'}`}>{label}</span>}
    </Link>
)

export default Logo
