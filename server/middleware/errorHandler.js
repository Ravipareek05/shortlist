import multer from 'multer'
import { HttpError } from '../utils/httpError.js'

export const notFoundHandler = (req, res) => {
    res.status(404).json({ success: false, message: 'Endpoint not found' })
}

// Converts any error into { success: false, message } with an appropriate status.
// Internal details are logged, never sent to the client.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    let status = 500
    let message = 'Something went wrong. Please try again.'

    if (err instanceof HttpError) {
        status = err.status
        message = err.message
    } else if (err instanceof multer.MulterError) {
        status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
        message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Invalid file upload'
    } else if (err?.name === 'CastError') {
        status = 400
        message = 'Invalid identifier'
    } else if (err?.name === 'ValidationError') {
        status = 400
        message = Object.values(err.errors ?? {})[0]?.message ?? 'Invalid data'
    } else if (err?.code === 11000) {
        status = 409
        message = 'This record already exists'
    } else if (err?.type === 'entity.parse.failed') {
        status = 400
        message = 'Malformed request body'
    } else if (err?.type === 'entity.too.large') {
        status = 413
        message = 'Request is too large'
    }

    if (status >= 500 && !(err instanceof HttpError)) {
        console.error(err)
    }

    if (res.headersSent) return
    res.status(status).json({ success: false, message })
}
