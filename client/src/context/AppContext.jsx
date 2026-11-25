import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { companyApi, configureAuth, userApi } from "../lib/api";

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext(null)

const TOKEN_KEY = 'companyToken'

const readStoredToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

export const AppContextProvider = (props) => {

    const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser()
    const { getToken } = useAuth()
    const { openSignIn } = useClerk()

    // ---------- Recruiter session (custom JWT) ----------
    const [companyToken, setCompanyToken] = useState(() => {
        const t = readStoredToken()
        configureAuth({ recruiterToken: t })
        return t
    })
    const [companyData, setCompanyData] = useState(null)
    const [companyLoading, setCompanyLoading] = useState(Boolean(companyToken))

    const logoutRecruiter = useCallback((reason) => {
        try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
        configureAuth({ recruiterToken: null })
        setCompanyToken(null)
        setCompanyData(null)
        setCompanyLoading(false)
        if (typeof reason === 'string' && reason) toast.info(reason)
    }, [])

    const loginRecruiter = useCallback((token, company) => {
        try { localStorage.setItem(TOKEN_KEY, token) } catch { /* storage unavailable */ }
        configureAuth({ recruiterToken: token })
        setCompanyToken(token)
        setCompanyData(company)
    }, [])

    useEffect(() => {
        configureAuth({
            clerkTokenGetter: () => getToken(),
            onRecruiterLogout: (message) => logoutRecruiter(message),
        })
    }, [getToken, logoutRecruiter])

    useEffect(() => {
        if (!companyToken) return
        let cancelled = false
        setCompanyLoading(true)
        companyApi.me()
            .then((d) => { if (!cancelled) setCompanyData(d.company) })
            .catch(() => { /* 401/403 handled by the API client (logs out) */ })
            .finally(() => { if (!cancelled) setCompanyLoading(false) })
        return () => { cancelled = true }
    }, [companyToken])

    // ---------- Candidate session (Clerk) ----------
    const [userData, setUserData] = useState(null)
    const [userLoading, setUserLoading] = useState(false)
    const [userError, setUserError] = useState(null)
    const [userApplications, setUserApplications] = useState([])
    const [savedJobIds, setSavedJobIds] = useState(() => new Set())
    const [savedLoaded, setSavedLoaded] = useState(false)

    const fetchUserData = useCallback(async () => {
        setUserLoading(true)
        setUserError(null)
        try {
            const d = await userApi.me()
            setUserData(d.user)
            return d.user
        } catch (error) {
            setUserError(error)
            return null
        } finally {
            setUserLoading(false)
        }
    }, [])

    const fetchUserApplications = useCallback(async () => {
        try {
            const d = await userApi.applications()
            setUserApplications(d.applications)
            return d.applications
        } catch {
            return []
        }
    }, [])

    const fetchSavedJobIds = useCallback(async () => {
        try {
            const d = await userApi.savedJobs()
            setSavedJobIds(new Set(d.savedJobs.map((s) => String(s.jobId))))
            setSavedLoaded(true)
            return d.savedJobs
        } catch {
            return []
        }
    }, [])

    useEffect(() => {
        if (!clerkLoaded) return
        if (isSignedIn) {
            fetchUserData()
            fetchUserApplications()
            fetchSavedJobIds()
        } else {
            setUserData(null)
            setUserApplications([])
            setSavedJobIds(new Set())
            setSavedLoaded(false)
            setUserError(null)
        }
    }, [clerkLoaded, isSignedIn, clerkUser?.id, fetchUserData, fetchUserApplications, fetchSavedJobIds])

    const appliedJobIds = useMemo(
        () => new Set(userApplications.map((a) => String(a.jobId?._id ?? a.jobId)).filter(Boolean)),
        [userApplications]
    )

    // Optimistic save/unsave; returns the new saved state
    const toggleSaveJob = useCallback(async (jobId) => {
        if (!isSignedIn) {
            openSignIn()
            return false
        }
        const id = String(jobId)
        const wasSaved = savedJobIds.has(id)
        setSavedJobIds((prev) => {
            const next = new Set(prev)
            if (wasSaved) next.delete(id)
            else next.add(id)
            return next
        })
        try {
            if (wasSaved) await userApi.unsaveJob(id)
            else await userApi.saveJob(id)
            toast.success(wasSaved ? 'Removed from saved jobs' : 'Job saved')
            return !wasSaved
        } catch (error) {
            setSavedJobIds((prev) => {
                const next = new Set(prev)
                if (wasSaved) next.add(id)
                else next.delete(id)
                return next
            })
            toast.error(error.message)
            return wasSaved
        }
    }, [isSignedIn, openSignIn, savedJobIds])

    const value = {
        // recruiter
        companyToken, companyData, setCompanyData, companyLoading, loginRecruiter, logoutRecruiter,
        // candidate
        clerkLoaded, isSignedIn: Boolean(isSignedIn), clerkUser,
        userData, setUserData, userLoading, userError, fetchUserData,
        userApplications, fetchUserApplications, appliedJobIds,
        savedJobIds, savedLoaded, fetchSavedJobIds, toggleSaveJob,
        isAdmin: userData?.role === 'admin',
    }

    return (<AppContext.Provider value={value}>
        {props.children}
    </AppContext.Provider>)

}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used inside AppContextProvider')
    return ctx
}
