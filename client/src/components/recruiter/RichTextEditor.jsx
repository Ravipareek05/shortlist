import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const TOOLBAR = [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'blockquote'],
    ['clean'],
]

// Thin wrapper around the existing Quill editor. Emits HTML; the API sanitizes it.
const RichTextEditor = ({ value, onChange, error, id, describedBy, placeholder = 'Describe the role, responsibilities and requirements…' }) => {
    const containerRef = useRef(null)
    const quillRef = useRef(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    useEffect(() => {
        if (quillRef.current || !containerRef.current) return
        const editorEl = document.createElement('div')
        containerRef.current.appendChild(editorEl)
        const quill = new Quill(editorEl, { theme: 'snow', placeholder, modules: { toolbar: TOOLBAR } })
        quillRef.current = quill
        if (value) quill.clipboard.dangerouslyPasteHTML(value)
        quill.root.setAttribute('role', 'textbox')
        quill.root.setAttribute('aria-multiline', 'true')
        if (id) quill.root.setAttribute('id', id)
        if (describedBy) quill.root.setAttribute('aria-describedby', describedBy)
        quill.on('text-change', () => {
            const text = quill.getText().trim()
            onChangeRef.current?.(text ? quill.root.innerHTML : '', text)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Allow the parent to reset/replace content (e.g. after loading a job to edit)
    useEffect(() => {
        const quill = quillRef.current
        if (!quill) return
        const current = quill.getText().trim() ? quill.root.innerHTML : ''
        if ((value ?? '') !== current) {
            if (value) quill.clipboard.dangerouslyPasteHTML(value)
            else quill.setText('')
        }
    }, [value])

    return <div ref={containerRef} className={`editor ${error ? 'editor-error' : ''}`} />
}

export default RichTextEditor
