import { useEffect, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import Button from '../ui/Button'

// Keyword + location search. Submits on Enter or button press.
const SearchBar = ({ initialQuery = '', initialLocation = '', onSearch, size = 'lg', className = '' }) => {
    const [q, setQ] = useState(initialQuery)
    const [location, setLocation] = useState(initialLocation)

    useEffect(() => { setQ(initialQuery) }, [initialQuery])
    useEffect(() => { setLocation(initialLocation) }, [initialLocation])

    const submit = (e) => {
        e.preventDefault()
        onSearch({ q: q.trim(), location: location.trim() })
    }

    const h = size === 'lg' ? 'h-12 sm:h-14' : 'h-11'

    return (
        <form role='search' onSubmit={submit} className={`flex w-full flex-col gap-2 rounded-2xl bg-white p-2 shadow-elevated ring-1 ring-ink-900/5 sm:flex-row sm:items-center sm:gap-0 ${className}`}>
            <label className={`flex flex-1 items-center gap-2.5 rounded-xl px-3 ${h} focus-within:bg-ink-50`}>
                <Search className='h-5 w-5 shrink-0 text-ink-400' aria-hidden='true' />
                <span className='sr-only'>Job title, keyword or company</span>
                <input
                    type='search'
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder='Job title, keyword or company'
                    maxLength={100}
                    className='w-full bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none'
                />
            </label>
            <div className='hidden h-8 w-px bg-ink-100 sm:block' aria-hidden='true' />
            <label className={`flex flex-1 items-center gap-2.5 rounded-xl px-3 ${h} focus-within:bg-ink-50 sm:max-w-[240px]`}>
                <MapPin className='h-5 w-5 shrink-0 text-ink-400' aria-hidden='true' />
                <span className='sr-only'>Location</span>
                <input
                    type='text'
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder='City or region'
                    maxLength={100}
                    className='w-full bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none'
                />
            </label>
            <Button type='submit' size='lg' className={`${size === 'lg' ? 'sm:h-12' : 'sm:h-10'} sm:px-7`}>Search jobs</Button>
        </form>
    )
}

export default SearchBar
