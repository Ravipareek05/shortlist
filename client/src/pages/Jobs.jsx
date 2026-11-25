import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Briefcase, SlidersHorizontal, X } from 'lucide-react'
import SearchBar from '../components/jobs/SearchBar'
import JobCard, { JobCardSkeleton } from '../components/jobs/JobCard'
import Button from '../components/ui/Button'
import { Checkbox, Input, Select } from '../components/ui/Field'
import { EmptyState, ErrorState } from '../components/ui/Feedback'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Misc'
import { useQuery } from '../hooks/useQuery'
import { usePageMeta } from '../hooks/usePageMeta'
import { jobsApi } from '../lib/api'
import { JOB_CATEGORIES, JOB_LEVELS, JOB_TYPES, SORT_OPTIONS } from '../lib/constants'
import { formatNumber, levelLabel } from '../lib/format'
import { useApp } from '../context/AppContext'

const LIST_KEYS = ['category', 'level', 'type', 'locations']
const FILTER_KEYS = ['q', 'location', 'minSalary', 'maxSalary', 'company', ...LIST_KEYS]

const readList = (params, key) => (params.get(key) ?? '').split(',').map((s) => s.trim()).filter(Boolean)

const FilterGroup = ({ title, children }) => (
    <fieldset className='border-b border-ink-100 py-5 first:pt-0 last:border-0'>
        <legend className='mb-2 text-sm font-semibold text-ink-900'>{title}</legend>
        {children}
    </fieldset>
)

// Salary inputs keep local state and commit on blur/Enter, so typing doesn't refetch per keystroke
const SalaryRange = ({ min, max, onCommit }) => {
    const [lo, setLo] = useState(min)
    const [hi, setHi] = useState(max)
    useEffect(() => { setLo(min) }, [min])
    useEffect(() => { setHi(max) }, [max])
    const commit = () => onCommit({ minSalary: lo, maxSalary: hi })
    const onKey = (e) => e.key === 'Enter' && (e.preventDefault(), commit())
    return (
        <div className='grid grid-cols-2 gap-2'>
            <label>
                <span className='mb-1 block text-xs text-ink-500'>Min</span>
                <Input type='number' inputMode='numeric' min='0' step='1000' placeholder='Any' value={lo} onChange={(e) => setLo(e.target.value)} onBlur={commit} onKeyDown={onKey} />
            </label>
            <label>
                <span className='mb-1 block text-xs text-ink-500'>Max</span>
                <Input type='number' inputMode='numeric' min='0' step='1000' placeholder='Any' value={hi} onChange={(e) => setHi(e.target.value)} onBlur={commit} onKeyDown={onKey} />
            </label>
        </div>
    )
}

const Filters = ({ params, meta, toggle, setValues }) => {
    const countsFor = (list) => Object.fromEntries((list ?? []).map((x) => [x.name, x.count]))
    const categoryCounts = countsFor(meta?.categories)
    const levelCounts = countsFor(meta?.levels)
    const typeCounts = countsFor(meta?.types)
    const locations = meta?.locations ?? []

    return (
        <div>
            <FilterGroup title='Category'>
                {JOB_CATEGORIES.map((c) => (
                    <Checkbox key={c} label={c} count={categoryCounts[c] ?? 0} checked={readList(params, 'category').includes(c)} onChange={() => toggle('category', c)} />
                ))}
            </FilterGroup>
            <FilterGroup title='Experience level'>
                {JOB_LEVELS.map((l) => (
                    <Checkbox key={l} label={levelLabel(l)} count={levelCounts[l] ?? 0} checked={readList(params, 'level').includes(l)} onChange={() => toggle('level', l)} />
                ))}
            </FilterGroup>
            <FilterGroup title='Job type'>
                {JOB_TYPES.map((t) => (
                    <Checkbox key={t} label={t} count={typeCounts[t] ?? 0} checked={readList(params, 'type').includes(t)} onChange={() => toggle('type', t)} />
                ))}
            </FilterGroup>
            {locations.length > 0 && (
                <FilterGroup title='Location'>
                    {locations.map((l) => (
                        <Checkbox key={l.name} label={l.name} count={l.count} checked={readList(params, 'locations').includes(l.name)} onChange={() => toggle('locations', l.name)} />
                    ))}
                </FilterGroup>
            )}
            <FilterGroup title='Salary (CTC)'>
                <SalaryRange min={params.get('minSalary') ?? ''} max={params.get('maxSalary') ?? ''} onCommit={setValues} />
            </FilterGroup>
        </div>
    )
}

const Jobs = () => {
    const [params, setParams] = useSearchParams()
    const [mobileFilters, setMobileFilters] = useState(false)
    const { appliedJobIds } = useApp()

    const queryKey = params.toString()
    const page = Math.max(1, Number(params.get('page')) || 1)
    const sort = params.get('sort') ?? 'newest'

    const { data: meta } = useQuery(() => jobsApi.meta(), [])
    const { data, error, loading, reload } = useQuery(() => {
        const p = Object.fromEntries(params.entries())
        delete p.companyName
        return jobsApi.search({ ...p, limit: 12 })
    }, [queryKey])

    const q = params.get('q') ?? ''
    const companyName = params.get('companyName')
    usePageMeta({
        title: q ? `${q} jobs` : companyName ? `Jobs at ${companyName}` : 'Browse jobs',
        description: 'Search open roles by keyword, location, category, experience level, job type and salary.',
    })

    // Any filter change resets to page 1
    const update = (mutate) => {
        const next = new URLSearchParams(params)
        mutate(next)
        next.delete('page')
        setParams(next)
    }

    const toggle = (key, value) => update((next) => {
        const list = readList(next, key)
        const updated = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
        if (updated.length) next.set(key, updated.join(','))
        else next.delete(key)
    })

    const setValues = (values) => update((next) => {
        for (const [k, v] of Object.entries(values)) {
            const clean = String(v ?? '').trim()
            if (clean) next.set(k, clean)
            else next.delete(k)
        }
    })

    const clearAll = () => setParams(sort !== 'newest' ? { sort } : {})

    const goToPage = (p) => {
        const next = new URLSearchParams(params)
        if (p > 1) next.set('page', String(p))
        else next.delete('page')
        setParams(next)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Active filter chips
    const chips = useMemo(() => {
        const out = []
        if (q) out.push({ key: 'q', label: `“${q}”` })
        if (params.get('location')) out.push({ key: 'location', label: `Near ${params.get('location')}` })
        if (params.get('company')) out.push({ key: 'company', label: companyName ? `Company: ${companyName}` : 'One company', extra: 'companyName' })
        for (const key of LIST_KEYS) for (const v of readList(params, key)) out.push({ key, value: v, label: key === 'level' ? levelLabel(v) : v })
        if (params.get('minSalary')) out.push({ key: 'minSalary', label: `Min ${formatNumber(params.get('minSalary'))}` })
        if (params.get('maxSalary')) out.push({ key: 'maxSalary', label: `Max ${formatNumber(params.get('maxSalary'))}` })
        return out
    }, [params, q, companyName])

    const removeChip = (chip) => {
        if (chip.value) return toggle(chip.key, chip.value)
        update((next) => { next.delete(chip.key); if (chip.extra) next.delete(chip.extra) })
    }

    const activeCount = FILTER_KEYS.reduce((n, k) => n + (LIST_KEYS.includes(k) ? readList(params, k).length : params.get(k) ? 1 : 0), 0)
    const jobs = data?.jobs ?? []
    const pagination = data?.pagination

    return (
        <div>
            <section className='border-b border-ink-100 bg-ink-50/60'>
                <div className='container-page py-8 sm:py-10'>
                    <h1 className='text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl'>Find your next role</h1>
                    <p className='mt-1 text-ink-500'>Search open positions at companies hiring on Shortlist.</p>
                    <SearchBar size='md' className='mt-6 max-w-4xl' initialQuery={q} initialLocation={params.get('location') ?? ''}
                        onSearch={({ q: nq, location }) => setValues({ q: nq, location })} />
                </div>
            </section>

            <div className='container-page grid gap-8 py-8 lg:grid-cols-[260px_1fr]'>
                {/* Desktop filters */}
                <aside className='hidden lg:block' aria-label='Filters'>
                    <div className='sticky top-24'>
                        <div className='mb-4 flex items-center justify-between'>
                            <h2 className='text-sm font-semibold uppercase tracking-wider text-ink-500'>Filters</h2>
                            {activeCount > 0 && <button type='button' onClick={clearAll} className='text-sm font-medium text-brand-600 hover:text-brand-700'>Clear all</button>}
                        </div>
                        <Filters params={params} meta={meta} toggle={toggle} setValues={setValues} />
                    </div>
                </aside>

                <section aria-labelledby='results-heading'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                        <h2 id='results-heading' className='text-sm text-ink-500' aria-live='polite'>
                            {loading ? 'Searching…' : pagination ? <><span className='font-semibold text-ink-900'>{formatNumber(pagination.total)}</span> {pagination.total === 1 ? 'job' : 'jobs'} found</> : ''}
                        </h2>
                        <div className='flex items-center gap-2'>
                            <Button variant='secondary' size='sm' className='lg:hidden' onClick={() => setMobileFilters(true)}>
                                <SlidersHorizontal className='h-4 w-4' aria-hidden='true' /> Filters{activeCount > 0 && ` (${activeCount})`}
                            </Button>
                            <label className='flex items-center gap-2 text-sm text-ink-500'>
                                <span className='hidden sm:inline'>Sort by</span>
                                <Select value={sort} onChange={(e) => setValues({ sort: e.target.value === 'newest' ? '' : e.target.value })} className='h-8 py-1 text-sm'>
                                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </Select>
                            </label>
                        </div>
                    </div>

                    {chips.length > 0 && (
                        <div className='mt-4 flex flex-wrap items-center gap-2'>
                            {chips.map((chip) => (
                                <button key={`${chip.key}-${chip.value ?? ''}`} type='button' onClick={() => removeChip(chip)}
                                    className='inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white py-1 pl-3 pr-2 text-sm text-ink-700 shadow-card hover:border-ink-300'
                                    aria-label={`Remove filter ${chip.label}`}>
                                    {chip.label}<X className='h-3.5 w-3.5 text-ink-400' aria-hidden='true' />
                                </button>
                            ))}
                            <button type='button' onClick={clearAll} className='text-sm font-medium text-ink-500 hover:text-ink-900'>Clear all</button>
                        </div>
                    )}

                    <div className='mt-6'>
                        {error ? (
                            <ErrorState title='Could not load jobs' error={error} onRetry={reload} />
                        ) : loading && !data ? (
                            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>{Array.from({ length: 6 }, (_, i) => <JobCardSkeleton key={i} />)}</div>
                        ) : jobs.length === 0 ? (
                            <EmptyState icon={Briefcase} title='No jobs match your search'
                                description={activeCount ? 'Try removing a filter or searching for something broader.' : 'There are no open roles right now. Check back soon.'}
                                action={activeCount ? <Button variant='secondary' onClick={clearAll}>Clear all filters</Button> : null} />
                        ) : (
                            <div className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
                                {jobs.map((job) => <JobCard key={job._id} job={job} applied={appliedJobIds.has(String(job._id))} />)}
                            </div>
                        )}
                    </div>

                    {pagination && <Pagination className='mt-10' page={page} totalPages={pagination.totalPages} onChange={goToPage} />}
                </section>
            </div>

            <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title='Filters'
                footer={<>
                    <Button variant='secondary' onClick={clearAll}>Clear all</Button>
                    <Button onClick={() => setMobileFilters(false)}>Show {pagination ? formatNumber(pagination.total) : ''} results</Button>
                </>}>
                <Filters params={params} meta={meta} toggle={toggle} setValues={setValues} />
            </Modal>
        </div>
    )
}

export default Jobs
