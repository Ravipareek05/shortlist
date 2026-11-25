import { LEVEL_LABELS } from './constants'

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('en')
const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export const formatSalary = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? compact.format(Number(n)) : 'Not disclosed')

export const formatNumber = (n) => full.format(Number(n) || 0)

export const formatDate = (value) => {
    if (!value) return ''
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d)
}

const UNITS = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
]

export const timeAgo = (value) => {
    if (!value) return ''
    const seconds = (new Date(value).getTime() - Date.now()) / 1000
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
    }
    return 'just now'
}

export const levelLabel = (level) => LEVEL_LABELS[level] ?? level

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?'

export const pluralize = (n, word, plural = `${word}s`) => `${formatNumber(n)} ${n === 1 ? word : plural}`
