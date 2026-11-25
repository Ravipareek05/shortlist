import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppContextProvider } from './context/AppContext.jsx'
import { ClerkProvider } from '@clerk/clerk-react'
import ConfigError from './components/ConfigError.jsx'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// Clerk theme aligned with the Shortlist design tokens
const clerkAppearance = {
  variables: {
    colorPrimary: '#3F47EE',
    colorText: '#0F1422',
    colorTextSecondary: '#5E6779',
    borderRadius: '0.625rem',
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif',
  },
}

const root = createRoot(document.getElementById('root'))

const missing = [
  !/^pk_(test|live)_/.test(PUBLISHABLE_KEY ?? '') && 'VITE_CLERK_PUBLISHABLE_KEY',
  !BACKEND_URL && 'VITE_BACKEND_URL',
].filter(Boolean)

if (missing.length) {
  root.render(<ConfigError missing={missing} />)
} else {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/" appearance={clerkAppearance}>
        <BrowserRouter>
          <AppContextProvider>
            <App />
          </AppContextProvider>
        </BrowserRouter>
      </ClerkProvider>
    </StrictMode>,
  )
}
