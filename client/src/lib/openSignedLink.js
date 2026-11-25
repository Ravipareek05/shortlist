import { toast } from 'react-toastify'

// Resumes are private: the API returns a short-lived signed link on demand.
// The tab is opened synchronously inside the click handler (so pop-up blockers allow it)
// and pointed at the link once it arrives.
export const openSignedLink = async (getLink) => {
    const tab = window.open('about:blank', '_blank')
    try {
        const { url } = await getLink()
        if (tab) {
            tab.opener = null
            tab.location.href = url
        } else {
            window.location.href = url
        }
    } catch (error) {
        tab?.close()
        toast.error(error.message)
    }
}
