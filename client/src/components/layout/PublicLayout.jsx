import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import Footer from '../Footer'

const PublicLayout = () => (
    <div className='flex min-h-screen flex-col'>
        <a href='#main' className='sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4'>Skip to content</a>
        <Navbar />
        <main id='main' className='flex-1'>
            <Outlet />
        </main>
        <Footer />
    </div>
)

export default PublicLayout
