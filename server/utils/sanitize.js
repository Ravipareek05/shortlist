import sanitizeHtml from 'sanitize-html'

// Allow-list matching what the Quill editor produces. Everything else (scripts, iframes,
// event handlers, style attributes, javascript:/data: URLs) is stripped.
const OPTIONS = {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'ol', 'ul', 'li', 'blockquote', 'pre', 'code', 'a', 'span'],
    allowedAttributes: {
        a: ['href', 'target', 'rel'],
        li: ['data-list'],
        '*': ['class'],
    },
    allowedClasses: {
        '*': ['ql-*'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
        a: (tagName, attribs) => ({
            tagName: 'a',
            attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
        }),
    },
}

export const sanitizeDescription = (html) => sanitizeHtml(String(html ?? ''), OPTIONS).trim()

export const htmlToText = (html) =>
    sanitizeHtml(String(html ?? ''), { allowedTags: [], allowedAttributes: {} })
        .replace(/\s+/g, ' ')
        .trim()
