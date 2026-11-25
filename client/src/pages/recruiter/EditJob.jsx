import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import JobForm from '../../components/recruiter/JobForm'
import { PageHeader } from '../../components/ui/Misc'
import { ErrorState, Notice, PageLoader } from '../../components/ui/Feedback'
import { ModerationBadge } from '../../components/ui/Badge'
import { companyApi } from '../../lib/api'
import { useQuery } from '../../hooks/useQuery'
import { usePageMeta } from '../../hooks/usePageMeta'

const EditJob = () => {
    usePageMeta({ title: 'Edit job', noindex: true })
    const { id } = useParams()
    const navigate = useNavigate()
    const { data, error, loading, reload } = useQuery(() => companyApi.job(id), [id])

    if (loading) return <PageLoader />
    if (error) return <ErrorState title={error.status === 404 ? 'Job not found' : 'Could not load this job'} error={error} onRetry={error.status === 404 ? undefined : reload} />

    const job = data.job
    const moderation = job.moderationStatus ?? 'approved'

    const submit = async (fields) => {
        const d = await companyApi.updateJob(id, fields)
        toast.success(d.message)
        navigate('/dashboard/manage-jobs')
    }

    return (
        <div className='max-w-3xl'>
            <PageHeader title='Edit job' description={job.title} actions={moderation !== 'approved' && <ModerationBadge status={moderation} />} />
            {moderation === 'rejected' && (
                <Notice tone='danger' className='mb-6' title='This job was rejected by a moderator'>
                    {job.moderationReason && <>Reason: {job.moderationReason}. </>}Saving your changes sends it back for review.
                </Notice>
            )}
            {moderation === 'hidden' && (
                <Notice className='mb-6' title='Hidden by a moderator'>{job.moderationReason ?? 'Contact support for details.'}</Notice>
            )}
            {moderation === 'pending' && <Notice tone='info' className='mb-6' title='Waiting for review'>A moderator will review this job before it is shown to candidates.</Notice>}
            <JobForm initial={job} onSubmit={submit} submitLabel='Save changes' showVisibility onCancel={() => navigate(-1)} />
        </div>
    )
}

export default EditJob
