import { useEffect, useId, useState } from 'react'
import { toast } from 'react-toastify'
import { Globe, ImagePlus, MapPin } from 'lucide-react'
import { PageHeader, Avatar } from '../../components/ui/Misc'
import { PageLoader } from '../../components/ui/Feedback'
import { Field, Input, Textarea } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import { companyApi } from '../../lib/api'
import { UPLOAD_LIMITS } from '../../lib/constants'
import { validateLogo, validateUrl } from '../../lib/validation'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useApp } from '../../context/AppContext'

const FIELDS = ['name', 'about', 'website', 'location', 'industry']

const CompanyProfile = () => {
    usePageMeta({ title: 'Company profile', noindex: true })
    const { companyData, setCompanyData } = useApp()
    const logoId = useId()

    const [form, setForm] = useState(null)
    const [logo, setLogo] = useState(null)
    const [preview, setPreview] = useState('')
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (companyData && !form) setForm(Object.fromEntries(FIELDS.map((f) => [f, companyData[f] ?? ''])))
    }, [companyData, form])

    useEffect(() => {
        if (!logo) { setPreview(''); return }
        const url = URL.createObjectURL(logo)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [logo])

    if (!form) return <PageLoader />

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }))
        setErrors((er) => ({ ...er, [key]: undefined }))
    }

    const dirty = Boolean(logo) || FIELDS.some((f) => (form[f] ?? '') !== (companyData[f] ?? ''))

    const submit = async (e) => {
        e.preventDefault()
        const found = {}
        if (form.name.trim().length < 2) found.name = 'Company name must be at least 2 characters'
        const urlError = validateUrl(form.website.trim())
        if (urlError) found.website = urlError
        if (form.about.length > 2000) found.about = 'Keep it under 2000 characters'
        const logoError = validateLogo(logo, { required: false })
        if (logoError) found.logo = logoError
        setErrors(found)
        if (Object.keys(found).length) return

        setBusy(true)
        try {
            const fields = Object.fromEntries(FIELDS.map((f) => [f, form[f].trim()]))
            const d = await companyApi.updateProfile(fields, logo)
            setCompanyData(d.company)
            setForm(Object.fromEntries(FIELDS.map((f) => [f, d.company[f] ?? ''])))
            setLogo(null)
            toast.success(d.message)
        } catch (err) {
            setErrors({ form: err.message })
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <PageHeader title='Company profile' description='Shown to candidates on every job you post.' />

            <div className='grid gap-6 lg:grid-cols-[1fr_320px]'>
                <form onSubmit={submit} noValidate className='space-y-6'>
                    {errors.form && <p role='alert' className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700'>{errors.form}</p>}

                    <section className='card space-y-5 p-5 sm:p-6'>
                        <div>
                            <span className='label'>Logo</span>
                            <div className='flex items-center gap-4'>
                                {preview ? <img src={preview} alt='New logo preview' className='h-16 w-16 rounded-xl object-contain p-1 ring-1 ring-ink-100' /> : <Avatar src={companyData.image} name={companyData.name} size='xl' rounded='xl' />}
                                <div>
                                    <label htmlFor={logoId} className='inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium text-ink-800 shadow-card hover:bg-ink-50'>
                                        <ImagePlus className='h-4 w-4' aria-hidden='true' />{logo ? 'Choose another' : 'Change logo'}
                                    </label>
                                    <input id={logoId} type='file' accept='image/png,image/jpeg,image/webp' className='sr-only'
                                        onChange={(e) => { const f = e.target.files?.[0] ?? null; setLogo(f); setErrors((er) => ({ ...er, logo: validateLogo(f, { required: false }) ?? undefined })) }} />
                                    <p className='mt-1.5 text-xs text-ink-500'>PNG, JPG or WebP, up to {UPLOAD_LIMITS.logoMB} MB</p>
                                    {errors.logo && <p className='mt-1 text-xs font-medium text-rose-600'>{errors.logo}</p>}
                                </div>
                            </div>
                        </div>

                        <Field label='Company name' error={errors.name} required>
                            {(a) => <Input {...a} value={form.name} onChange={set('name')} maxLength={100} error={errors.name} />}
                        </Field>
                        <div className='grid gap-5 sm:grid-cols-2'>
                            <Field label='Industry'>
                                {(a) => <Input {...a} value={form.industry} onChange={set('industry')} maxLength={100} placeholder='e.g. Fintech' />}
                            </Field>
                            <Field label='Headquarters'>
                                {(a) => <Input {...a} icon={MapPin} value={form.location} onChange={set('location')} maxLength={100} placeholder='e.g. Bangalore' />}
                            </Field>
                        </div>
                        <Field label='Website' error={errors.website}>
                            {(a) => <Input {...a} icon={Globe} type='url' value={form.website} onChange={set('website')} maxLength={300} placeholder='https://yourcompany.com' error={errors.website} />}
                        </Field>
                        <Field label='About' error={errors.about} hint={`${form.about.length}/2000`}>
                            {(a) => <Textarea {...a} rows={6} value={form.about} onChange={set('about')} maxLength={2000} placeholder='What does your company do? What is it like to work there?' error={errors.about} />}
                        </Field>
                    </section>

                    <section className='card p-5 sm:p-6'>
                        <h2 className='font-semibold text-ink-900'>Sign-in email</h2>
                        <p className='mt-1 text-sm text-ink-500'>{companyData.email}</p>
                        <p className='mt-1 text-xs text-ink-400'>Used to sign in and can&apos;t be changed here.</p>
                    </section>

                    <div className='flex justify-end gap-2'>
                        <Button variant='secondary' disabled={!dirty || busy} onClick={() => { setForm(Object.fromEntries(FIELDS.map((f) => [f, companyData[f] ?? '']))); setLogo(null); setErrors({}) }}>Discard</Button>
                        <Button type='submit' loading={busy} disabled={!dirty}>Save changes</Button>
                    </div>
                </form>

                <aside aria-label='Preview' className='lg:sticky lg:top-8 lg:self-start'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500'>Preview</p>
                    <div className='card p-5'>
                        <div className='flex items-center gap-3'>
                            {preview ? <img src={preview} alt='' className='h-10 w-10 rounded-lg object-contain p-1 ring-1 ring-ink-100' /> : <Avatar src={companyData.image} name={form.name} />}
                            <div className='min-w-0'>
                                <p className='truncate font-semibold text-ink-900'>{form.name || 'Company name'}</p>
                                {(form.industry || form.location) && <p className='truncate text-sm text-ink-500'>{[form.industry, form.location].filter(Boolean).join(' · ')}</p>}
                            </div>
                        </div>
                        {form.about && <p className='mt-4 line-clamp-6 whitespace-pre-line text-sm leading-6 text-ink-600'>{form.about}</p>}
                        {form.website && <p className='mt-3 truncate text-sm text-brand-600'>{form.website}</p>}
                    </div>
                </aside>
            </div>
        </>
    )
}

export default CompanyProfile
