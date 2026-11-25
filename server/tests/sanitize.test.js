import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { sanitizeDescription } from '../utils/sanitize.js'

// Regression payloads from published sanitize-html advisories (GHSA-vccv-cmxp-4j9h,
// GHSA-g8qq-57p8-ggw5, GHSA-jxwj-j7wr-gfrw, GHSA-x3q4-9hxx-gx8m, GHSA-cv27-6wvh-8x7j)
// plus common XSS vectors. None may survive sanitization.
const PAYLOADS = [
    '<form action="javascript:alert(1)"><button formaction="javascript:alert(2)">x</button></form>',
    '<object data="javascript:alert(1)"></object><video poster="javascript:alert(1)"></video>',
    '<table background="javascript:alert(1)"><tr><td>x</td></tr></table>',
    '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a></svg>',
    '<textarea/></textarea/><img src=x onerror=alert(1)>',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    '<a href="jav&#x09;ascript:alert(1)">x</a><a href=" javascript:alert(1)">y</a>',
    '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">z</a>',
    '<p style="background:url(javascript:alert(1))" onmouseover="alert(1)">hover</p>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
]

describe('Description sanitizer', () => {
    it('loads under plain CommonJS require (as on Vercel)', () => {
        const require = createRequire(import.meta.url)
        assert.equal(typeof require('sanitize-html'), 'function')
    })

    for (const payload of PAYLOADS) {
        it(`neutralizes ${payload.slice(0, 50)}…`, () => {
            const out = sanitizeDescription(payload)
            assert.doesNotMatch(out, /javascript:|data:text|onerror|onmouseover|<script|<img|<svg|<meta|<form|<object|<video|<textarea|<noscript|<style|style=/i, out)
        })
    }

    it('keeps the formatting the editor produces', () => {
        const html = '<h2>Role</h2><p><strong>Bold</strong> and <em>italic</em></p><ol><li data-list="bullet">One</li></ol><p class="ql-align-center">c</p><a href="https://example.com">link</a>'
        const out = sanitizeDescription(html)
        for (const s of ['<h2>Role</h2>', '<strong>Bold</strong>', '<em>italic</em>', 'data-list="bullet"', 'class="ql-align-center"', 'href="https://example.com"']) {
            assert.ok(out.includes(s), `missing ${s} in ${out}`)
        }
    })
})
