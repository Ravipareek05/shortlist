import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AppContextProvider } from './context/AppContext.jsx'
import { ClerkProvider } from '@clerk/clerk-react'
import axios from 'axios'

// The API now uses real HTTP status codes; surface its message instead of
// axios's generic "Request failed with status code 4xx".
axios.interceptors.response.use(undefined, (error) => {
  const serverMessage = error?.response?.data?.message
  if (serverMessage) error.message = serverMessage
  return Promise.reject(error)
})

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
    <BrowserRouter>
      <AppContextProvider>
        <App />
      </AppContextProvider>
    </BrowserRouter>
  </ClerkProvider>,
)
