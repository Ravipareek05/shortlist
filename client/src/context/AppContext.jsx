import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";

export const AppContext = createContext()

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const { user } = useUser()
    const { getToken } = useAuth()

    const [searchFilter, setSearchFilter] = useState({
        title: '',
        location: ''
    })

    const [isSearched, setIsSearched] = useState(false)

    const [jobs, setJobs] = useState([])

    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false)

    // Read synchronously so dashboard routes exist on the first render after a refresh
    const [companyToken, setCompanyToken] = useState(() => localStorage.getItem('companyToken'))
    const [companyData, setCompanyData] = useState(null)

    const [userData, setUserData] = useState(null)
    const [userApplications, setUserApplications] = useState([])

    // Function to Fetch Jobs 
    const fetchJobs = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/jobs')

            if (data.success) {
                setJobs(data.jobs)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    // Function to Fetch Company Data
    const fetchCompanyData = async () => {
        try {

            const { data } = await axios.get(backendUrl + '/api/company/company', { headers: { token: companyToken } })

            if (data.success) {
                setCompanyData(data.company)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            // Expired/invalid/suspended session: log the recruiter out
            if ([401, 403].includes(error?.response?.status)) {
                localStorage.removeItem('companyToken')
                setCompanyToken(null)
                setCompanyData(null)
            }
            toast.error(error.message)
        }
    }

    // Function to Fetch User Data
    const fetchUserData = async () => {
        try {

            const token = await getToken();

            const { data } = await axios.get(backendUrl + '/api/users/user',
                { headers: { Authorization: `Bearer ${token}` } })

            if (data.success) {
                setUserData(data.user)
            } else (
                toast.error(data.message)
            )

        } catch (error) {
            toast.error(error.message)
        }
    }

    // Function to Fetch User's Applied Applications
    const fetchUserApplications = async () => {
        try {

            const token = await getToken()

            const { data } = await axios.get(backendUrl + '/api/users/applications',
                { headers: { Authorization: `Bearer ${token}` } }
            )
            if (data.success) {
                setUserApplications(data.applications)
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    // Retrive Company Token From LocalStorage
    useEffect(() => {
        fetchJobs()
    }, [])

    // Fetch Company Data if Company Token is Available
    useEffect(() => {
        if (companyToken) {
            fetchCompanyData()
        }
    }, [companyToken])

    // Fetch User's Applications & Data if User is Logged In
    useEffect(() => {
        if (user) {
            fetchUserData()
            fetchUserApplications()
        }
    }, [user])

    const value = {
        setSearchFilter, searchFilter,
        isSearched, setIsSearched,
        jobs, setJobs,
        showRecruiterLogin, setShowRecruiterLogin,
        companyToken, setCompanyToken,
        companyData, setCompanyData,
        backendUrl,
        userData, setUserData,
        userApplications, setUserApplications,
        fetchUserData,
        fetchUserApplications,

    }

    return (<AppContext.Provider value={value}>
        {props.children}
    </AppContext.Provider>)

}