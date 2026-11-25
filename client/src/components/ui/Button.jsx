import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
    primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
    dark: 'bg-ink-900 text-white shadow-sm hover:bg-ink-800 active:bg-ink-950 disabled:bg-ink-400',
    secondary: 'border border-ink-200 bg-white text-ink-800 shadow-card hover:border-ink-300 hover:bg-ink-50 disabled:text-ink-400',
    ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:text-ink-300',
    danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300',
    'danger-ghost': 'text-rose-600 hover:bg-rose-50 disabled:text-rose-300',
    light: 'bg-white text-ink-900 shadow-sm hover:bg-ink-100',
    'outline-light': 'border border-white/20 text-white hover:bg-white/10',
}

const SIZES = {
    xs: 'h-7 gap-1 rounded-md px-2 text-xs',
    sm: 'h-8 gap-1.5 rounded-lg px-3 text-sm',
    md: 'h-10 gap-2 rounded-lg px-4 text-sm',
    lg: 'h-12 gap-2 rounded-xl px-5 text-[15px]',
    icon: 'h-9 w-9 rounded-lg',
    'icon-sm': 'h-8 w-8 rounded-lg',
}

const buttonClass = ({ variant = 'primary', size = 'md', className = '' } = {}) =>
    `inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`

const Button = forwardRef(function Button({ variant, size, className, loading = false, disabled, to, href, children, type = 'button', ...props }, ref) {
    const cls = buttonClass({ variant, size, className })
    const content = (
        <>
            {loading && <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />}
            {children}
        </>
    )

    if (to) return <Link ref={ref} to={to} className={cls} {...props}>{content}</Link>
    if (href) return <a ref={ref} href={href} className={cls} {...props}>{content}</a>

    return (
        <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
            {content}
        </button>
    )
})

export default Button
