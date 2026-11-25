import 'dotenv/config'
import './config/instrument.js'
import connectCloudinary from './config/cloudinary.js'
import { checkEnv } from './config/env.js'
import { createApp } from './app.js'

checkEnv()
await connectCloudinary()

// Initialize Express
const app = createApp()

// On Vercel the exported app is the serverless handler; locally we listen on a port.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  })
}

export default app
