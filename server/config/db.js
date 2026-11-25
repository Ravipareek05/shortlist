import mongoose from "mongoose";

// Cached across serverless invocations (Vercel reuses warm instances), so each request
// doesn't open a new connection.
const cache = globalThis.__shortlistMongo ?? (globalThis.__shortlistMongo = { conn: null, promise: null })

// The database name is passed as an option rather than appended to the URI, so URIs with
// query strings (Atlas default: ...mongodb.net/?retryWrites=true) work. Defaults to the
// database the original app used ("job-portal"), so existing data is preserved.
export const mongoOptions = () => ({
    dbName: process.env.MONGODB_DB || 'job-portal',
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
})

const connectDB = async (uri = process.env.MONGODB_URI) => {
    if (cache.conn && mongoose.connection.readyState === 1) return cache.conn

    if (!uri) throw new Error('MONGODB_URI is not set')

    if (!cache.promise) {
        cache.promise = mongoose.connect(uri, mongoOptions())
            .then((m) => {
                console.log('Database Connected')
                return m
            })
            .catch((error) => {
                cache.promise = null
                throw error
            })
    }

    cache.conn = await cache.promise
    return cache.conn
}

export const disconnectDB = async () => {
    await mongoose.disconnect()
    cache.conn = null
    cache.promise = null
}

export default connectDB
