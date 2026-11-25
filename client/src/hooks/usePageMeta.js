import { useEffect } from 'react'

const SITE = 'Shortlist'
const DEFAULT_DESCRIPTION = 'Shortlist connects talented candidates with companies that are hiring. Search open roles, apply with your resume and track every application in one place.'

const setMeta = (selector, attr, value) => {
    let el = document.head.querySelector(selector)
    if (!el) {
        el = document.createElement('meta')
        const [, key, name] = selector.match(/\[(\w+)="([^"]+)"\]/) ?? []
        if (key) el.setAttribute(key, name)
        document.head.appendChild(el)
    }
    el.setAttribute(attr, value)
}

// Per-page <title>, description and social tags; also controls indexing of private pages.
export const usePageMeta = ({ title, description = DEFAULT_DESCRIPTION, noindex = false } = {}) => {
    useEffect(() => {
        const fullTitle = title ? `${title} · ${SITE}` : `${SITE} · Find work at companies that are hiring`
        document.title = fullTitle
        setMeta('meta[name="description"]', 'content', description)
        setMeta('meta[property="og:title"]', 'content', fullTitle)
        setMeta('meta[property="og:description"]', 'content', description)
        setMeta('meta[name="twitter:title"]', 'content', fullTitle)
        setMeta('meta[name="twitter:description"]', 'content', description)
        setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow')
    }, [title, description, noindex])
}
