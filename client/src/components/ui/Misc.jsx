import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { initials } from '../../lib/format'

// Company logo / user avatar with graceful fallback to initials
export const Avatar = ({ src, name = '', size = 'md', rounded = 'lg', className = '' }) => {
    const [failed, setFailed] = useState(false)
    const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-lg' }
    const radius = rounded === 'full' ? 'rounded-full' : rounded === 'xl' ? 'rounded-xl' : 'rounded-lg'
    const base = `${sizes[size]} ${radius} shrink-0 overflow-hidden ring-1 ring-ink-100 ${className}`

    if (!src || failed) {
        return <div className={`${base} flex items-center justify-center bg-ink-100 font-semibold text-ink-600`} aria-hidden='true'>{initials(name)}</div>
    }
    return (
        <img
            src={src}
            alt={name ? `${name} logo` : ''}
            loading='lazy'
            decoding='async'
            onError={() => setFailed(true)}
            className={`${base} bg-white object-contain ${rounded === 'full' ? 'object-cover' : 'p-1'}`}
        />
    )
}

// Numbered pagination with ellipses; never goes below 1 or above totalPages
export const Pagination = ({ page, totalPages, onChange, className = '' }) => {
    if (!totalPages || totalPages <= 1) return null

    const pages = []
    const add = (p) => pages.push(p)
    const window = 1
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - page) <= window) add(p)
        else if (pages[pages.length - 1] !== '…') add('…')
    }

    const btn = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors'

    return (
        <nav aria-label='Pagination' className={`flex items-center justify-center gap-1 ${className}`}>
            <button type='button' className={`${btn} text-ink-600 hover:bg-ink-100 disabled:opacity-40`} disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))} aria-label='Previous page'>
                <ChevronLeft className='h-4 w-4' aria-hidden='true' />
            </button>
            {pages.map((p, i) => p === '…'
                ? <span key={`gap-${i}`} className='px-1 text-ink-400' aria-hidden='true'>…</span>
                : (
                    <button key={p} type='button' onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}
                        className={`${btn} ${p === page ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
                        {p}
                    </button>
                ))}
            <button type='button' className={`${btn} text-ink-600 hover:bg-ink-100 disabled:opacity-40`} disabled={page >= totalPages} onClick={() => onChange(Math.min(totalPages, page + 1))} aria-label='Next page'>
                <ChevronRight className='h-4 w-4' aria-hidden='true' />
            </button>
        </nav>
    )
}

export const StatCard = ({ label, value, hint, icon: Icon, tone = 'brand', loading }) => {
    const tones = { brand: 'bg-brand-50 text-brand-600', success: 'bg-emerald-50 text-emerald-600', warning: 'bg-amber-50 text-amber-600', danger: 'bg-rose-50 text-rose-600', neutral: 'bg-ink-100 text-ink-600' }
    return (
        <div className='card p-4 sm:p-5'>
            <div className='flex items-center justify-between gap-3'>
                <p className='text-sm font-medium text-ink-500'>{label}</p>
                {Icon && (
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
                        <Icon className='h-4 w-4' aria-hidden='true' />
                    </span>
                )}
            </div>
            {loading
                ? <div className='skeleton mt-3 h-8 w-16' />
                : <p className='mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink-900 sm:text-3xl'>{value}</p>}
            {hint && <p className='mt-1 text-xs text-ink-500'>{hint}</p>}
        </div>
    )
}

export const Tabs = ({ tabs, value, onChange, className = '' }) => (
    <div role='tablist' className={`flex gap-1 overflow-x-auto rounded-lg bg-ink-100/70 p-1 ${className}`}>
        {tabs.map((t) => (
            <button key={t.value} role='tab' type='button' aria-selected={value === t.value} onClick={() => onChange(t.value)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${value === t.value ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-800'}`}>
                {t.label}
                {t.count !== undefined && <span className={`rounded-full px-1.5 text-xs tabular-nums ${value === t.value ? 'bg-ink-100 text-ink-700' : 'text-ink-400'}`}>{t.count}</span>}
            </button>
        ))}
    </div>
)

export const PageHeader = ({ title, description, actions, eyebrow }) => (
    <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
            {eyebrow && <p className='eyebrow mb-1'>{eyebrow}</p>}
            <h1 className='text-xl font-semibold tracking-tight text-ink-900 sm:text-2xl'>{title}</h1>
            {description && <p className='mt-1 text-sm text-ink-500'>{description}</p>}
        </div>
        {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
    </div>
)
