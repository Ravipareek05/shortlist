import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal data-fetching hook: { data, error, loading, reload, setData }.
// Ignores stale responses when inputs change quickly (e.g. typing in a search box).
export const useQuery = (fetcher, deps = [], { enabled = true } = {}) => {
    const [state, setState] = useState({ data: null, error: null, loading: enabled })
    const requestId = useRef(0)
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const run = useCallback(async ({ silent = false } = {}) => {
        const id = ++requestId.current
        if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
        try {
            const data = await fetcherRef.current()
            if (id === requestId.current) setState({ data, error: null, loading: false })
        } catch (error) {
            if (id === requestId.current) setState((s) => ({ ...s, error, loading: false }))
        }
    }, [])

    useEffect(() => {
        if (!enabled) {
            setState((s) => ({ ...s, loading: false }))
            return
        }
        run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, run, ...deps])

    const setData = useCallback((updater) => {
        setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
    }, [])

    return { ...state, reload: run, setData }
}
