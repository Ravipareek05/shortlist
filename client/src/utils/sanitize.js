import DOMPurify from 'dompurify'

// Second line of defence: the API already sanitizes descriptions on write, and we sanitize
// again on render (covers records stored before server-side sanitization existed).
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'ol', 'ul', 'li', 'blockquote', 'pre', 'code', 'a', 'span']

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer nofollow')
    }
})

export const sanitizeHtml = (html) => DOMPurify.sanitize(String(html ?? ''), {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-list'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
})

// Plain-text excerpt for cards (never renders HTML)
export const htmlToText = (html) => {
    const doc = new DOMParser().parseFromString(sanitizeHtml(html), 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}
