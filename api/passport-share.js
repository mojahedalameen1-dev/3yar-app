import { adminDb, requireUser } from './_firebase-admin.js'
import {
    authenticatePassportOwner,
    createPassportToken,
    isPassportCarId,
    isPassportToken,
    passportBody,
    PassportRequestError,
    sendPassportFailure,
    setPassportPrivacyHeaders
} from './_passport-security.js'

const OPERATIONS = new Set(['getStatus', 'enable', 'disable', 'rotate'])

export function createPassportShareHandler({ getDb = adminDb, authenticate = requireUser } = {}) {
    return async function handler(request, response) {
        setPassportPrivacyHeaders(response)
        if (request.method !== 'POST') {
            response.setHeader('Allow', 'POST')
            return response.status(405).json({ error: 'Method not allowed' })
        }
        try {
            const user = await authenticatePassportOwner(request, authenticate)
            const body = passportBody(request)
            if (!body || !isPassportCarId(body.carId) || !OPERATIONS.has(body.operation)) throw new PassportRequestError(400)

            const db = getDb()
            const carRef = db.collection('cars').doc(body.carId)
            const result = await db.runTransaction(async transaction => {
                const snapshot = await transaction.get(carRef)
                if (!snapshot.exists || snapshot.data().user_id !== user.uid) throw new PassportRequestError(403)
                const car = snapshot.data()
                if (car.deletion_requested === true) throw new PassportRequestError(409)

                if (body.operation === 'getStatus') {
                    const enabled = car.public_share_enabled === true && isPassportToken(car.share_token)
                    return { enabled, token: enabled ? car.share_token : null }
                }
                if (body.operation === 'disable') {
                    transaction.update(carRef, { public_share_enabled: false, share_token: null })
                    return { enabled: false, token: null }
                }

                // Both enable and rotate mint a fresh 256-bit bearer token.
                const token = createPassportToken()
                transaction.update(carRef, { public_share_enabled: true, share_token: token })
                return { enabled: true, token }
            })
            return response.status(200).json(result)
        } catch (error) {
            return sendPassportFailure(response, error)
        }
    }
}

export default createPassportShareHandler()
