import { useEffect, useState } from 'react'
import { Briefcase, RefreshCw } from 'lucide-react'
import { PageHeader, Tabs } from '../../components/ui/Misc'
import { EmptyState } from '../../components/ui/Feedback'
import Button from '../../components/ui/Button'
import ApplicationList from '../../components/candidate/ApplicationList'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useApp } from '../../context/AppContext'

const CandidateApplications = () => {
    usePageMeta({ title: 'My applications', noindex: true })
    const { userApplications, fetchUserApplications } = useApp()
    const [tab, setTab] = useState('all')
    const [refreshing, setRefreshing] = useState(false)

    const refresh = async () => {
        setRefreshing(true)
        await fetchUserApplications()
        setRefreshing(false)
    }

    // Pick up status changes made by recruiters since the app loaded
    useEffect(() => { fetchUserApplications() }, [fetchUserApplications])

    const count = (s) => userApplications.filter((a) => a.status === s).length
    const filtered = tab === 'all' ? userApplications : userApplications.filter((a) => a.status === tab)

    return (
        <>
            <PageHeader title='Applications' description='Track the status of every job you have applied to.'
                actions={<Button variant='secondary' size='sm' onClick={refresh} loading={refreshing}>{!refreshing && <RefreshCw className='h-3.5 w-3.5' aria-hidden='true' />}Refresh</Button>} />

            <Tabs className='mb-5 w-fit max-w-full' value={tab} onChange={setTab} tabs={[
                { value: 'all', label: 'All', count: userApplications.length },
                { value: 'Pending', label: 'In review', count: count('Pending') },
                { value: 'Accepted', label: 'Accepted', count: count('Accepted') },
                { value: 'Rejected', label: 'Not selected', count: count('Rejected') },
            ]} />

            {filtered.length === 0
                ? <EmptyState icon={Briefcase} title={tab === 'all' ? 'No applications yet' : 'Nothing here'}
                    description={tab === 'all' ? 'Find a role you like and apply with your resume.' : 'No applications have this status.'}
                    action={tab === 'all' && <Button to='/jobs' variant='secondary'>Browse jobs</Button>} />
                : <ApplicationList applications={filtered} />}
        </>
    )
}

export default CandidateApplications
