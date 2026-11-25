import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '../../components/ui/Field'
import { Pagination } from '../../components/ui/Misc'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback'
import { useQuery } from '../../hooks/useQuery'

// URL-backed list state (?q=&status=&page=) shared by all admin list pages
// eslint-disable-next-line react-refresh/only-export-components
export const useAdminList = (fetcher, filterKey = 'status', extraDeps = []) => {
    const [params, setParams] = useSearchParams()
    const q = params.get('q') ?? ''
    const filter = params.get(filterKey) ?? ''
    const page = Math.max(1, Number(params.get('page')) || 1)

    const query = useQuery(() => fetcher({ q, [filterKey]: filter, page }), [q, filter, page, ...extraDeps])

    const set = (key, value) => {
        const next = new URLSearchParams(params)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key !== 'page') next.delete('page')
        setParams(next, { replace: key !== 'page' })
    }

    return { ...query, q, filter, page, setQuery: (v) => set('q', v), setFilter: (v) => set(filterKey, v), setPage: (p) => set('page', p > 1 ? String(p) : '') }
}

export const SearchInput = ({ value, onChange, placeholder }) => {
    const [text, setText] = useState(value)
    useEffect(() => { setText(value) }, [value])
    useEffect(() => {
        if (text === value) return
        const t = setTimeout(() => onChange(text.trim()), 350)
        return () => clearTimeout(t)
    }, [text, value, onChange])
    return (
        <div className='w-full sm:w-72'>
            <Input icon={Search} type='search' value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} className='h-9 py-1.5' />
        </div>
    )
}

export const ListBody = ({ list, empty, children }) => {
    if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />
    if (list.loading && !list.data) return <div className='space-y-2'>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className='h-14 w-full rounded-lg' />)}</div>
    return (
        <div className={list.loading ? 'opacity-60 transition-opacity' : ''}>
            {children ?? <EmptyState title={empty} />}
            {list.data?.pagination && <Pagination className='mt-6' page={list.page} totalPages={list.data.pagination.totalPages} onChange={list.setPage} />}
        </div>
    )
}

export const Table = ({ head, children }) => (
    <div className='overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card'>
        <table className='w-full min-w-[720px] text-left text-sm'>
            <thead className='border-b border-ink-100 bg-ink-50/60 text-xs font-medium uppercase tracking-wider text-ink-500'>
                <tr>{head.map((h) => <th key={h} scope='col' className={`px-4 py-3 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>)}</tr>
            </thead>
            <tbody className='divide-y divide-ink-100'>{children}</tbody>
        </table>
    </div>
)
