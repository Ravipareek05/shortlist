// Admin provisioning. The ONLY way to grant or revoke admin rights.
//
// Run from server/ with database credentials in server/.env:
//   npm run admin -- list
//   npm run admin -- promote someone@example.com
//   npm run admin -- demote someone@example.com
//
// The person must have signed in to Shortlist at least once (so their Clerk user exists in
// the database). Admins then sign in with their normal Clerk account and see the Admin panel.
import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import User from '../models/User.js'

const [command, emailArg] = process.argv.slice(2)

const usage = () => {
    console.log('Usage: npm run admin -- <list | promote <email> | demote <email>>')
    process.exit(1)
}

const main = async () => {
    if (!['list', 'promote', 'demote'].includes(command)) usage()

    await connectDB()

    if (command === 'list') {
        const admins = await User.find({ role: 'admin' }).select('name email status').lean()
        if (admins.length === 0) console.log('No admins yet.')
        for (const a of admins) console.log(`- ${a.name} <${a.email}> (${a.status ?? 'active'})`)
        return
    }

    if (!emailArg) usage()
    const email = emailArg.trim().toLowerCase()
    const user = await User.findOne({ email })
    if (!user) {
        console.error(`No user with email ${email}. They must sign in to Shortlist once before being promoted.`)
        process.exitCode = 1
        return
    }

    if (command === 'promote') {
        user.role = 'admin'
        user.status = 'active'
    } else {
        const admins = await User.countDocuments({ role: 'admin' })
        if (admins <= 1 && user.role === 'admin') console.warn('Warning: removing the last admin.')
        user.role = 'candidate'
    }
    await user.save()
    console.log(`${user.name} <${user.email}> is now ${user.role === 'admin' ? 'an admin' : 'a regular user'}.`)
}

main()
    .catch((error) => {
        console.error(error.message)
        process.exitCode = 1
    })
    .finally(() => mongoose.disconnect())
