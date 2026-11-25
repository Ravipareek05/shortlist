import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import JobForm from '../../components/recruiter/JobForm'
import { PageHeader } from '../../components/ui/Misc'
import { companyApi } from '../../lib/api'
import { usePageMeta } from '../../hooks/usePageMeta'

const AddJob = () => {
    usePageMeta({ title: 'Post a job', noindex: true })
    const navigate = useNavigate()

    const submit = async (job) => {
        const d = await companyApi.postJob(job)
        toast.success(d.message)
        navigate('/dashboard/manage-jobs')
    }

    return (
        <div className='max-w-3xl'>
            <PageHeader title='Post a job' description='Your listing goes live as soon as you publish it.' />
            <JobForm onSubmit={submit} submitLabel='Publish job' onCancel={() => navigate(-1)} />
        </div>
    )
}

export default AddJob
