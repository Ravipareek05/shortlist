import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react'
import Button from './Button'

export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden='true' />

export const Spinner = ({ className = 'h-5 w-5', label = 'Loading' }) => (
    <Loader2 className={`animate-spin text-brand-600 ${className}`} role='status' aria-label={label} />
)

export const PageLoader = ({ label = 'Loading…' }) => (
    <div className='flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-ink-500'>
        <Spinner className='h-6 w-6' />
        <span>{label}</span>
    </div>
)

export const EmptyState = ({ icon: Icon = Inbox, title, description, action, className = '', as: Heading = 'h3' }) => (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/50 px-6 py-14 text-center ${className}`}>
        <div className='mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-ink-500 shadow-card ring-1 ring-ink-100'>
            <Icon className='h-5 w-5' aria-hidden='true' />
        </div>
        <Heading className='text-base font-semibold text-ink-900'>{title}</Heading>
        {description && <p className='mt-1.5 max-w-sm text-sm text-ink-500'>{description}</p>}
        {action && <div className='mt-5'>{action}</div>}
    </div>
)

export const ErrorState = ({ title = 'Something went wrong', error, onRetry, className = '' }) => (
    <div role='alert' className={`flex flex-col items-center justify-center rounded-xl border border-rose-100 bg-rose-50/50 px-6 py-12 text-center ${className}`}>
        <div className='mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-rose-500 shadow-card ring-1 ring-rose-100'>
            <AlertTriangle className='h-5 w-5' aria-hidden='true' />
        </div>
        <h3 className='text-base font-semibold text-ink-900'>{title}</h3>
        <p className='mt-1.5 max-w-sm text-sm text-ink-600'>{error?.message ?? 'Please try again.'}</p>
        {onRetry && (
            <Button variant='secondary' size='sm' className='mt-5' onClick={() => onRetry()}>
                <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' /> Try again
            </Button>
        )}
    </div>
)

export const Notice = ({ tone = 'warning', icon: Icon = AlertTriangle, title, children, className = '' }) => {
    const tones = {
        warning: 'border-amber-200 bg-amber-50 text-amber-900',
        danger: 'border-rose-200 bg-rose-50 text-rose-900',
        info: 'border-brand-200 bg-brand-50 text-brand-900',
    }
    return (
        <div role='status' className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
            <Icon className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
            <div>
                {title && <p className='font-semibold'>{title}</p>}
                {children && <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>}
            </div>
        </div>
    )
}
