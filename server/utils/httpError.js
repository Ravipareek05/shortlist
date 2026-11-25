// Error type whose message is safe to show to API clients.
export class HttpError extends Error {
    constructor(status, message) {
        super(message)
        this.status = status
        this.expose = true
    }
}

export const badRequest = (message = 'Invalid request') => new HttpError(400, message)
export const unauthorized = (message = 'Please log in to continue') => new HttpError(401, message)
export const forbidden = (message = 'You do not have permission to do that') => new HttpError(403, message)
export const notFound = (message = 'Not found') => new HttpError(404, message)
export const conflict = (message = 'This record already exists') => new HttpError(409, message)

// Express 4 does not forward rejected promises to error handlers; this does.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
