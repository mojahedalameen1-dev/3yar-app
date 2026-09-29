import { randomBytes } from 'node:crypto'

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export class PassportRequestError extends Error {
    constructor(status) {
        super('Passport request rejected')
        this.name = 'PassportRequestError'
        this.status = status
    }
}

export function createPassportToken() {
    return randomBytes(32).toString('base64url')
}

export function isPassportToken(value) {
    return typeof value === 'string'
        && SHARE_TOKEN_PATTERN.test(value)
        && Buffer.from(value, 'base64url').toString('base64url') === value
}

export function isPassportCarId(value) {
    return typeof value === 'string'
        && value.length > 0
        && Buffer.byteLength(value, 'utf8') <= 1500
        && !value.includes('/')
        && value !== '.'
        && value !== '..'
        && !/^__.*__$/.test(value)
        && !/\p{Cc}/u.test(value)
}

export function passportBody(request) {
    const body = request.body
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
}

export function setPassportPrivacyHeaders(response) {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Robots-Tag', 'noindex, nofollow')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
}

export function sendPassportFailure(response, error) {
    // Never send or log Firebase errors, stacks, request bodies, or bearer tokens.
    const status = error instanceof PassportRequestError ? error.status : 500
    const messages = {
        400: 'Invalid request',
        401: 'Authentication required',
        403: 'Forbidden',
        404: 'Passport unavailable',
        409: 'Car unavailable'
    }
    return response.status(status).json({ error: messages[status] || 'Passport temporarily unavailable' })
}

export async function authenticatePassportOwner(request, requireUser) {
    try {
        const user = await requireUser(request)
        if (typeof user?.uid !== 'string' || !user.uid) throw new PassportRequestError(401)
        return user
    } catch (error) {
        if (error instanceof PassportRequestError) throw error
        if (error?.status === 401 || (typeof error?.code === 'string' && [
            'auth/argument-error',
            'auth/invalid-id-token',
            'auth/id-token-expired',
            'auth/id-token-revoked',
            'auth/user-disabled'
        ].includes(error.code))) throw new PassportRequestError(401)
        throw error
    }
}
