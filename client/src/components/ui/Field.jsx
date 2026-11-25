import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

// Label + control + hint/error, with the ARIA wiring done once.
export const Field = ({ label, hint, error, required, children, className = '', id: idProp }) => {
    const autoId = useId()
    const id = idProp ?? autoId
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className='label'>
                    {label}{required && <span className='ml-0.5 text-rose-500' aria-hidden='true'>*</span>}
                </label>
            )}
            {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
            {error
                ? <p id={`${id}-error`} className='mt-1.5 text-xs font-medium text-rose-600'>{error}</p>
                : hint && <p id={`${id}-hint`} className='mt-1.5 text-xs text-ink-500'>{hint}</p>}
        </div>
    )
}

export const Input = forwardRef(function Input({ className = '', error, icon: Icon, ...props }, ref) {
    if (!Icon) return <input ref={ref} className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />
    return (
        <div className='relative'>
            <Icon className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400' aria-hidden='true' />
            <input ref={ref} className={`input pl-9 ${error ? 'input-error' : ''} ${className}`} {...props} />
        </div>
    )
})

export const Select = forwardRef(function Select({ className = '', error, children, ...props }, ref) {
    return (
        <div className='relative'>
            <select ref={ref} className={`input appearance-none pr-9 ${error ? 'input-error' : ''} ${className}`} {...props}>
                {children}
            </select>
            <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400' aria-hidden='true' />
        </div>
    )
})

export const Textarea = forwardRef(function Textarea({ className = '', error, ...props }, ref) {
    return <textarea ref={ref} className={`input min-h-[110px] resize-y ${error ? 'input-error' : ''} ${className}`} {...props} />
})

export const Checkbox = ({ label, count, className = '', ...props }) => (
    <label className={`group flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 text-sm text-ink-700 hover:text-ink-900 ${className}`}>
        <input type='checkbox' className='h-4 w-4 rounded border-ink-300 text-brand-600 accent-brand-600 focus:ring-brand-500' {...props} />
        <span className='flex-1'>{label}</span>
        {count !== undefined && <span className='text-xs tabular-nums text-ink-400'>{count}</span>}
    </label>
)

export const Switch = ({ checked, onChange, label, disabled, size = 'md' }) => {
    const dims = size === 'sm' ? { track: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-4' } : { track: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-5' }
    return (
        <button
            type='button'
            role='switch'
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex ${dims.track} shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-brand-600' : 'bg-ink-200'}`}
        >
            <span className={`${dims.knob} rounded-full bg-white shadow transition-transform ${checked ? dims.on : 'translate-x-0'}`} />
        </button>
    )
}
