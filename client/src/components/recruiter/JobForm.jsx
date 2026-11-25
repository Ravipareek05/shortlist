import { useState } from 'react'
import Button from '../ui/Button'
import { Field, Input, Select, Switch } from '../ui/Field'
import RichTextEditor from './RichTextEditor'
import { JOB_CATEGORIES, JOB_LEVELS, JOB_LOCATIONS, JOB_TYPES } from '../../lib/constants'
import { levelLabel } from '../../lib/format'

const EMPTY_JOB = {
    title: '',
    description: '',
    category: JOB_CATEGORIES[0],
    location: JOB_LOCATIONS[0],
    level: JOB_LEVELS[0],
    jobType: 'Full-time',
    salary: '',
    visible: true,
}

// Mirrors the server's validation for instant feedback
const validate = (job, plainLength) => {
    const e = {}
    const title = job.title.trim()
    if (title.length < 3) e.title = 'Title must be at least 3 characters'
    else if (title.length > 120) e.title = 'Title must be at most 120 characters'
    if (plainLength < 20) e.description = 'Add a description of at least 20 characters'
    const salary = Number(job.salary)
    if (job.salary === '' || !Number.isFinite(salary) || salary < 0) e.salary = 'Enter a salary (0 or more)'
    else if (salary > 100000000) e.salary = 'Salary looks too large'
    return e
}

const textLength = (html) => {
    if (!html) return 0
    return (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').trim().length
}

const JobForm = ({ initial = EMPTY_JOB, onSubmit, submitLabel = 'Post job', showVisibility = false, onCancel }) => {
    const [job, setJob] = useState(() => {
        const merged = { ...EMPTY_JOB }
        for (const key of Object.keys(EMPTY_JOB)) if (initial[key] !== undefined && initial[key] !== null) merged[key] = initial[key]
        return merged
    })
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)

    const set = (key, value) => {
        setJob((j) => ({ ...j, [key]: value }))
        setErrors((er) => ({ ...er, [key]: undefined }))
    }

    const submit = async (e) => {
        e.preventDefault()
        const found = validate(job, textLength(job.description))
        setErrors(found)
        if (Object.keys(found).length) {
            document.querySelector('[aria-invalid="true"]')?.focus()
            return
        }
        setBusy(true)
        try {
            const payload = { ...job, title: job.title.trim(), salary: Number(job.salary) }
            if (!showVisibility) delete payload.visible
            await onSubmit(payload)
        } catch (err) {
            setErrors({ form: err.message })
        } finally {
            setBusy(false)
        }
    }

    // Keep custom/legacy values selectable when editing older jobs
    const withCurrent = (options, current) => (current && !options.includes(current) ? [current, ...options] : options)

    return (
        <form onSubmit={submit} noValidate className='space-y-6'>
            {errors.form && <p role='alert' className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700'>{errors.form}</p>}

            <section className='card space-y-5 p-5 sm:p-6'>
                <h2 className='font-semibold text-ink-900'>Role details</h2>
                <Field label='Job title' error={errors.title} required>
                    {(a) => <Input {...a} value={job.title} onChange={(e) => set('title', e.target.value)} maxLength={120} placeholder='e.g. Senior Frontend Engineer' error={errors.title} />}
                </Field>
                <div className='grid gap-5 sm:grid-cols-2'>
                    <Field label='Category' required>
                        {(a) => <Select {...a} value={job.category} onChange={(e) => set('category', e.target.value)}>{withCurrent(JOB_CATEGORIES, job.category).map((c) => <option key={c}>{c}</option>)}</Select>}
                    </Field>
                    <Field label='Job type' required>
                        {(a) => <Select {...a} value={job.jobType ?? ''} onChange={(e) => set('jobType', e.target.value)}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</Select>}
                    </Field>
                    <Field label='Location' required>
                        {(a) => <Select {...a} value={job.location} onChange={(e) => set('location', e.target.value)}>{withCurrent(JOB_LOCATIONS, job.location).map((l) => <option key={l}>{l}</option>)}</Select>}
                    </Field>
                    <Field label='Experience level' required>
                        {(a) => <Select {...a} value={job.level} onChange={(e) => set('level', e.target.value)}>{withCurrent(JOB_LEVELS, job.level).map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}</Select>}
                    </Field>
                    <Field label='Salary (annual CTC)' error={errors.salary} hint='Shown to candidates as a compact figure, e.g. 120K' required>
                        {(a) => <Input {...a} type='number' inputMode='numeric' min='0' step='1000' value={job.salary} onChange={(e) => set('salary', e.target.value)} placeholder='120000' error={errors.salary} />}
                    </Field>
                </div>
            </section>

            <section className='card p-5 sm:p-6'>
                <Field label='Description' error={errors.description} hint='Responsibilities, requirements and what makes the role great.' required>
                    {(a) => <RichTextEditor id={a.id} describedBy={a['aria-describedby']} value={job.description} onChange={(html) => set('description', html)} error={errors.description} />}
                </Field>
            </section>

            {showVisibility && (
                <section className='card flex items-center justify-between gap-4 p-5 sm:p-6'>
                    <div>
                        <h2 className='font-semibold text-ink-900'>Visible to candidates</h2>
                        <p className='text-sm text-ink-500'>Hidden jobs don&apos;t appear in search and can&apos;t receive applications.</p>
                    </div>
                    <Switch checked={job.visible} onChange={(v) => set('visible', v)} label='Visible to candidates' />
                </section>
            )}

            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
                {onCancel && <Button variant='secondary' onClick={onCancel} disabled={busy}>Cancel</Button>}
                <Button type='submit' loading={busy} size='lg'>{submitLabel}</Button>
            </div>
        </form>
    )
}

export default JobForm
