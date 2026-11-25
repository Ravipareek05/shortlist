import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import PublicLayout from './components/layout/PublicLayout'
import { PageLoader } from './components/ui/Feedback'
import Home from './pages/Home'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import NotFound from './pages/NotFound'

// Dashboards (and the Quill editor they use) are split into separate chunks
const RecruiterAuth = lazy(() => import('./pages/RecruiterAuth'))
const CandidateLayout = lazy(() => import('./pages/candidate/CandidateLayout'))
const CandidateOverview = lazy(() => import('./pages/candidate/CandidateOverview'))
const CandidateApplications = lazy(() => import('./pages/candidate/CandidateApplications'))
const SavedJobs = lazy(() => import('./pages/candidate/SavedJobs'))
const CandidateProfile = lazy(() => import('./pages/candidate/CandidateProfile'))
const RecruiterLayout = lazy(() => import('./pages/recruiter/RecruiterLayout'))
const RecruiterOverview = lazy(() => import('./pages/recruiter/RecruiterOverview'))
const AddJob = lazy(() => import('./pages/recruiter/AddJob'))
const EditJob = lazy(() => import('./pages/recruiter/EditJob'))
const ManageJobs = lazy(() => import('./pages/recruiter/ManageJobs'))
const ViewApplications = lazy(() => import('./pages/recruiter/ViewApplications'))
const CompanyProfile = lazy(() => import('./pages/recruiter/CompanyProfile'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'))
const AdminAccounts = lazy(() => import('./pages/admin/AdminAccounts'))
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'))
const AdminApplications = lazy(() => import('./pages/admin/AdminApplications'))
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity'))

// Old URL kept working for shared links
const LegacyApplyRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/jobs/${id}`} replace />
}

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

const App = () => {

  return (
    <>
      <ScrollToTop />
      <ToastContainer position='bottom-right' autoClose={3500} newestOnTop closeOnClick hideProgressBar={false} theme='light' />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path='/' element={<Home />} />
            <Route path='/jobs' element={<Jobs />} />
            <Route path='/jobs/:id' element={<JobDetail />} />
            <Route path='*' element={<NotFound />} />
          </Route>

          <Route path='/apply-job/:id' element={<LegacyApplyRedirect />} />
          <Route path='/applications' element={<Navigate to='/candidate/applications' replace />} />

          <Route path='/recruiter/login' element={<RecruiterAuth mode='login' />} />
          <Route path='/recruiter/signup' element={<RecruiterAuth mode='signup' />} />

          <Route path='/candidate' element={<CandidateLayout />}>
            <Route index element={<CandidateOverview />} />
            <Route path='applications' element={<CandidateApplications />} />
            <Route path='saved' element={<SavedJobs />} />
            <Route path='profile' element={<CandidateProfile />} />
          </Route>

          <Route path='/dashboard' element={<RecruiterLayout />}>
            <Route index element={<RecruiterOverview />} />
            <Route path='add-job' element={<AddJob />} />
            <Route path='manage-jobs' element={<ManageJobs />} />
            <Route path='jobs/:id/edit' element={<EditJob />} />
            <Route path='view-applications' element={<ViewApplications />} />
            <Route path='company' element={<CompanyProfile />} />
          </Route>

          <Route path='/admin' element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path='jobs' element={<AdminJobs />} />
            <Route path='users' element={<AdminAccounts kind='users' />} />
            <Route path='companies' element={<AdminAccounts kind='companies' />} />
            <Route path='applications' element={<AdminApplications />} />
            <Route path='activity' element={<AdminActivity />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
