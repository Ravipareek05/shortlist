import { Compass } from 'lucide-react'
import Button from '../components/ui/Button'
import { usePageMeta } from '../hooks/usePageMeta'

const NotFound = () => {
    usePageMeta({ title: 'Page not found', noindex: true })
    return (
        <div className='container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center'>
            <span className='flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-600'><Compass className='h-6 w-6' aria-hidden='true' /></span>
            <p className='mt-6 font-mono text-sm text-brand-600'>404</p>
            <h1 className='mt-2 text-2xl font-semibold tracking-tight text-ink-900'>This page doesn&apos;t exist</h1>
            <p className='mt-2 max-w-sm text-ink-500'>The link may be broken or the page may have moved.</p>
            <div className='mt-6 flex gap-2'>
                <Button to='/'>Go home</Button>
                <Button to='/jobs' variant='secondary'>Browse jobs</Button>
            </div>
        </div>
    )
}

export default NotFound
