import { LogoMark } from './brand/Logo'

// Shown instead of a blank screen when required build-time configuration is missing.
const ConfigError = ({ missing }) => (
    <div className='flex min-h-screen items-center justify-center bg-ink-50 px-4'>
        <div className='w-full max-w-md rounded-2xl border border-ink-100 bg-white p-8 shadow-elevated'>
            <LogoMark />
            <h1 className='mt-5 text-lg font-semibold text-ink-900'>Shortlist isn&apos;t configured yet</h1>
            <p className='mt-2 text-sm text-ink-600'>Set these environment variables and rebuild:</p>
            <ul className='mt-3 space-y-1'>
                {missing.map((m) => <li key={m}><code className='rounded bg-ink-100 px-1.5 py-0.5 font-mono text-sm text-ink-800'>{m}</code></li>)}
            </ul>
            <p className='mt-4 text-xs text-ink-500'>See client/.env.example and the README.</p>
        </div>
    </div>
)

export default ConfigError
