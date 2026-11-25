const TONES = {
    neutral: 'bg-ink-100 text-ink-700 ring-ink-200/60',
    brand: 'bg-brand-50 text-brand-700 ring-brand-200/60',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200/70',
    danger: 'bg-rose-50 text-rose-700 ring-rose-200/70',
    dark: 'bg-ink-900 text-white ring-ink-900',
}

const Badge = ({ tone = 'neutral', icon: Icon, children, className = '', dot = false }) => (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}>
        {dot && <span className='h-1.5 w-1.5 rounded-full bg-current opacity-70' aria-hidden='true' />}
        {Icon && <Icon className='h-3 w-3' aria-hidden='true' />}
        {children}
    </span>
)

const STATUS_TONES = { Pending: 'warning', Accepted: 'success', Rejected: 'danger' }
const STATUS_LABELS = { Pending: 'In review', Accepted: 'Accepted', Rejected: 'Not selected' }

export const StatusBadge = ({ status, recruiterView = false }) => (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} dot>
        {recruiterView ? (status ?? 'Pending') : (STATUS_LABELS[status] ?? status)}
    </Badge>
)

const MODERATION = {
    approved: { tone: 'success', label: 'Approved' },
    pending: { tone: 'warning', label: 'In review' },
    rejected: { tone: 'danger', label: 'Rejected' },
    hidden: { tone: 'neutral', label: 'Hidden by moderator' },
}

export const ModerationBadge = ({ status = 'approved' }) => {
    const m = MODERATION[status] ?? MODERATION.approved
    return <Badge tone={m.tone} dot>{m.label}</Badge>
}

export const AccountBadge = ({ status = 'active' }) => (
    <Badge tone={status === 'suspended' ? 'danger' : 'success'} dot>{status === 'suspended' ? 'Suspended' : 'Active'}</Badge>
)

export default Badge
