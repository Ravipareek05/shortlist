import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from './Button'
import { Field, Textarea } from './Field'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

// Accessible dialog: fixed overlay, Escape to close, focus moved in and trapped, focus restored on close.
export const Modal = ({ open, onClose, title, description, children, footer, size = 'md', side = false }) => {
    const panelRef = useRef(null)
    const titleId = useId()
    const descId = useId()

    useEffect(() => {
        if (!open) return
        const previouslyFocused = document.activeElement
        const { overflow } = document.body.style
        document.body.style.overflow = 'hidden'

        const focusFirst = () => {
            const el = panelRef.current?.querySelector('[data-autofocus]') ?? panelRef.current?.querySelector(FOCUSABLE)
            el?.focus()
        }
        const t = setTimeout(focusFirst, 0)

        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose?.()
            }
            if (e.key === 'Tab' && panelRef.current) {
                const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
                if (items.length === 0) return
                const first = items[0]
                const last = items[items.length - 1]
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
            }
        }
        document.addEventListener('keydown', onKey)

        return () => {
            clearTimeout(t)
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = overflow
            previouslyFocused?.focus?.()
        }
    }, [open, onClose])

    if (!open) return null

    const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }
    const panelPosition = side
        ? 'fixed inset-y-0 right-0 flex w-full max-w-md flex-col rounded-none sm:rounded-l-2xl'
        : `relative w-full ${sizes[size]} rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col`

    return createPortal(
        <div className={`fixed inset-0 z-50 flex ${side ? '' : 'items-end justify-center sm:items-center sm:p-4'}`}>
            <div className='absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-[2px]' onClick={onClose} aria-hidden='true' />
            <div
                ref={panelRef}
                role='dialog'
                aria-modal='true'
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                className={`${panelPosition} animate-slide-up bg-white shadow-elevated ring-1 ring-ink-100`}
            >
                <div className='flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4'>
                    <div>
                        <h2 id={titleId} className='text-base font-semibold text-ink-900'>{title}</h2>
                        {description && <p id={descId} className='mt-1 text-sm text-ink-500'>{description}</p>}
                    </div>
                    <Button variant='ghost' size='icon-sm' onClick={onClose} aria-label='Close dialog'>
                        <X className='h-4 w-4' aria-hidden='true' />
                    </Button>
                </div>
                <div className='flex-1 overflow-y-auto px-5 py-4'>{children}</div>
                {footer && <div className='flex flex-col-reverse gap-2 border-t border-ink-100 px-5 py-3.5 sm:flex-row sm:justify-end'>{footer}</div>}
            </div>
        </div>,
        document.body
    )
}

/**
 * Confirmation dialog. With `requireReason`, collects a reason (e.g. for moderation).
 * onConfirm(reason) may return a promise; the dialog shows a loading state until it settles.
 */
export const ConfirmDialog = ({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', tone = 'danger', requireReason = false, reasonLabel = 'Reason', reasonPlaceholder = '' }) => {
    const [reason, setReason] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open) { setReason(''); setError(''); setBusy(false) }
    }, [open])

    const submit = async (e) => {
        e?.preventDefault()
        if (requireReason && reason.trim().length < 3) {
            setError('Please add a short reason (at least 3 characters).')
            return
        }
        setBusy(true)
        try {
            await onConfirm(reason.trim())
            onClose()
        } catch {
            setBusy(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={busy ? undefined : onClose}
            title={title}
            description={description}
            size='sm'
            footer={
                <>
                    <Button variant='secondary' onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={submit} loading={busy}>{confirmLabel}</Button>
                </>
            }
        >
            {requireReason ? (
                <form onSubmit={submit}>
                    <Field label={reasonLabel} error={error} required>
                        {(a) => (
                            <Textarea {...a} data-autofocus value={reason} maxLength={500} placeholder={reasonPlaceholder}
                                onChange={(e) => { setReason(e.target.value); setError('') }} error={error} />
                        )}
                    </Field>
                    <p className='mt-2 text-xs text-ink-500'>This is recorded in the moderation log.</p>
                </form>
            ) : (
                <p className='text-sm text-ink-600'>This action cannot be undone.</p>
            )}
        </Modal>
    )
}
