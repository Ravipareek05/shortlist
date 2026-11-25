import { useEffect, useId, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ArrowLeft, Building2, Eye, EyeOff, ImagePlus, Lock, Mail } from 'lucide-react'
import Logo from '../components/brand/Logo'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { companyApi } from '../lib/api'
import { UPLOAD_LIMITS } from '../lib/constants'
import { EMAIL_RE, validateLogo } from '../lib/validation'
import { usePageMeta } from '../hooks/usePageMeta'
import { useApp } from '../context/AppContext'


const PasswordInput = (props) => {
    const [show, setShow] = useState(false)
    return (
        <div className='relative'>
            <Input {...props} icon={Lock} type={show ? 'text' : 'password'} className='pr-10' />
            <button type='button' onClick={() => setShow((s) => !s)} className='absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 hover:text-ink-700'
                aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className='h-4 w-4' aria-hidden='true' /> : <Eye className='h-4 w-4' aria-hidden='true' />}
            </button>
        </div>
    )
}

const RecruiterAuth = ({ mode = 'login' }) => {
    const isSignup = mode === 'signup'
    usePageMeta({
        title: isSignup ? 'Create a recruiter account' : 'Recruiter sign in',
        description: 'Post jobs and review applicants on Shortlist.',
    })

    const navigate = useNavigate()
    const [params] = useSearchParams()
    const next = params.get('next')
    const safeNext = next && next.startsWith('/dashboard') ? next : '/dashboard'
    const { companyToken, loginRecruiter } = useApp()
    const logoId = useId()

    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [logo, setLogo] = useState(null)
    const [preview, setPreview] = useState('')
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!logo) { setPreview(''); return }
        const url = URL.createObjectURL(logo)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [logo])

    useEffect(() => { setErrors({}) }, [mode])

    if (companyToken) return <Navigate to={safeNext} replace />

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }))
        setErrors((er) => ({ ...er, [key]: undefined }))
    }

    const validate = () => {
        const e = {}
        if (isSignup && form.name.trim().length < 2) e.name = 'Enter your company name'
        if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address'
        if (isSignup ? form.password.length < 8 : !form.password) e.password = isSignup ? 'Use at least 8 characters' : 'Enter your password'
        if (isSignup) {
            const logoError = validateLogo(logo)
            if (logoError) e.logo = logoError
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const submit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setBusy(true)
        try {
            const d = isSignup
                ? await companyApi.register({ name: form.name.trim(), email: form.email.trim(), password: form.password, image: logo })
                : await companyApi.login(form.email.trim(), form.password)
            loginRecruiter(d.token, d.company)
            toast.success(isSignup ? `Welcome to Shortlist, ${d.company.name}` : `Welcome back, ${d.company.name}`)
            navigate(safeNext, { replace: true })
        } catch (err) {
            setErrors({ form: err.message })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className='grid min-h-screen lg:grid-cols-2'>
            <div className='flex flex-col px-4 py-8 sm:px-10'>
                <div className='flex items-center justify-between'>
                    <Logo />
                    <Link to='/' className='inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900'>
                        <ArrowLeft className='h-4 w-4' aria-hidden='true' /> Home
                    </Link>
                </div>

                <div className='mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12'>
                    <p className='eyebrow'>For recruiters</p>
                    <h1 className='mt-2 text-2xl font-semibold tracking-tight text-ink-900'>{isSignup ? 'Create your company account' : 'Sign in to your dashboard'}</h1>
                    <p className='mt-2 text-sm text-ink-500'>
                        {isSignup ? 'Post jobs and start reviewing applicants in minutes.' : 'Manage your job posts and applicants.'}
                    </p>

                    <form onSubmit={submit} noValidate className='mt-8 space-y-4'>
                        {errors.form && <p role='alert' className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700'>{errors.form}</p>}

                        {isSignup && (
                            <div>
                                <span className='label'>Company logo<span className='ml-0.5 text-rose-500' aria-hidden='true'>*</span></span>
                                <label htmlFor={logoId} className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-3 transition-colors hover:bg-ink-50 ${errors.logo ? 'border-rose-300' : 'border-ink-200'}`}>
                                    {preview
                                        ? <img src={preview} alt='Logo preview' className='h-14 w-14 rounded-lg object-contain ring-1 ring-ink-100' />
                                        : <span className='flex h-14 w-14 items-center justify-center rounded-lg bg-ink-100 text-ink-400'><ImagePlus className='h-5 w-5' aria-hidden='true' /></span>}
                                    <span className='text-sm'>
                                        <span className='font-medium text-ink-800'>{logo ? logo.name : 'Upload logo'}</span>
                                        <span className='block text-xs text-ink-500'>PNG, JPG or WebP, up to {UPLOAD_LIMITS.logoMB} MB</span>
                                    </span>
                                    <input id={logoId} type='file' accept='image/png,image/jpeg,image/webp' className='sr-only'
                                        onChange={(e) => { const f = e.target.files?.[0]; setLogo(f ?? null); setErrors((er) => ({ ...er, logo: f ? validateLogo(f) ?? undefined : undefined })) }} />
                                </label>
                                {errors.logo && <p className='mt-1.5 text-xs font-medium text-rose-600'>{errors.logo}</p>}
                            </div>
                        )}

                        {isSignup && (
                            <Field label='Company name' error={errors.name} required>
                                {(a) => <Input {...a} icon={Building2} value={form.name} onChange={set('name')} autoComplete='organization' maxLength={100} placeholder='Acme Inc.' error={errors.name} />}
                            </Field>
                        )}
                        <Field label='Work email' error={errors.email} required>
                            {(a) => <Input {...a} icon={Mail} type='email' value={form.email} onChange={set('email')} autoComplete='email' placeholder='you@company.com' error={errors.email} />}
                        </Field>
                        <Field label='Password' error={errors.password} hint={isSignup ? 'At least 8 characters' : undefined} required>
                            {(a) => <PasswordInput {...a} value={form.password} onChange={set('password')} autoComplete={isSignup ? 'new-password' : 'current-password'} maxLength={72} error={errors.password} />}
                        </Field>

                        <Button type='submit' size='lg' className='w-full' loading={busy}>{isSignup ? 'Create account' : 'Sign in'}</Button>
                    </form>

                    <p className='mt-6 text-center text-sm text-ink-500'>
                        {isSignup ? 'Already have an account? ' : 'New to Shortlist? '}
                        <Link to={`${isSignup ? '/recruiter/login' : '/recruiter/signup'}${next ? `?next=${encodeURIComponent(next)}` : ''}`} className='font-medium text-brand-600 hover:text-brand-700'>
                            {isSignup ? 'Sign in' : 'Create a recruiter account'}
                        </Link>
                    </p>
                    <p className='mt-3 text-center text-xs text-ink-400'>Looking for a job? <Link to='/jobs' className='underline hover:text-ink-700'>Browse open roles</Link></p>
                </div>
            </div>

            <div className='relative hidden overflow-hidden bg-ink-900 lg:block'>
                <div className='bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]' aria-hidden='true' />
                <div className='absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-600/30 blur-[110px]' aria-hidden='true' />
                <div className='relative flex h-full flex-col justify-center px-16 text-white'>
                    <h2 className='max-w-md text-3xl font-semibold tracking-tight'>Everything you need to hire, in one dashboard.</h2>
                    <ul className='mt-8 space-y-4 text-ink-300'>
                        {['Post and edit roles with a rich-text editor', 'See every applicant and open resumes instantly', 'Accept or decline with one click', 'Show or hide listings at any time'].map((t) => (
                            <li key={t} className='flex items-center gap-3'>
                                <span className='flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-brand-300'>✓</span>{t}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default RecruiterAuth
