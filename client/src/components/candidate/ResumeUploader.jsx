import { useId, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { FileText, Upload } from 'lucide-react'
import Button from '../ui/Button'
import { userApi } from '../../lib/api'
import { UPLOAD_LIMITS } from '../../lib/constants'
import { validateResume } from '../../lib/validation'
import { useApp } from '../../context/AppContext'

const ResumeUploader = ({ onUploaded, compact = false }) => {
    const { setUserData } = useApp()
    const [file, setFile] = useState(null)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef(null)
    const inputId = useId()

    const choose = (f) => {
        const problem = validateResume(f)
        setError(problem ?? '')
        setFile(problem ? null : f)
    }

    const upload = async () => {
        const problem = validateResume(file)
        if (problem) return setError(problem)
        setBusy(true)
        try {
            const d = await userApi.uploadResume(file)
            setUserData((u) => (u ? { ...u, resume: d.resume } : u))
            toast.success('Resume uploaded')
            setFile(null)
            if (inputRef.current) inputRef.current.value = ''
            onUploaded?.(d.resume)
        } catch (e) {
            setError(e.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div>
            <label
                htmlFor={inputId}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files?.[0]) }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors ${compact ? 'py-6' : 'py-10'} ${dragging ? 'border-brand-400 bg-brand-50' : error ? 'border-rose-300 bg-rose-50/40' : 'border-ink-200 bg-ink-50/50 hover:border-ink-300 hover:bg-ink-50'}`}
            >
                {file ? <FileText className='h-6 w-6 text-brand-600' aria-hidden='true' /> : <Upload className='h-6 w-6 text-ink-400' aria-hidden='true' />}
                <span className='mt-3 text-sm font-medium text-ink-800'>{file ? file.name : 'Choose a PDF or drag it here'}</span>
                <span className='mt-1 text-xs text-ink-500'>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `PDF only, up to ${UPLOAD_LIMITS.resumeMB} MB`}</span>
                <input ref={inputRef} id={inputId} type='file' accept='application/pdf,.pdf' className='sr-only' onChange={(e) => choose(e.target.files?.[0])} />
            </label>
            {error && <p className='mt-2 text-sm font-medium text-rose-600' role='alert'>{error}</p>}
            <div className='mt-3 flex justify-end gap-2'>
                {file && <Button variant='ghost' onClick={() => { setFile(null); setError(''); if (inputRef.current) inputRef.current.value = '' }} disabled={busy}>Cancel</Button>}
                <Button onClick={upload} disabled={!file} loading={busy}>Upload resume</Button>
            </div>
        </div>
    )
}

export default ResumeUploader
