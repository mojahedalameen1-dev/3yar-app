import { adminDb, requireUser } from './_firebase-admin.js'
import {
    getPassportDiagnosticStage,
    logPassportShareFailure,
    markPassportDiagnosticStage
} from './_passport-diagnostics.js'
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
        let operation = 'unknown'
        let stage = 'unexpected_server_failure'
        try {
            const requestedBody = passportBody(request)
            if (requestedBody && OPERATIONS.has(requestedBody.operation)) operation = requestedBody.operation

            stage = 'firebase_token_verification'
            const user = await authenticatePassportOwner(request, authenticate)
            stage = 'unexpected_server_failure'
            const body = passportBody(request)
            if (!body || !isPassportCarId(body.carId) || !OPERATIONS.has(body.operation)) throw new PassportRequestError(400)
            operation = body.operation

            stage = 'firestore_client_create'
            let db
            try {
                db = getDb()
            } catch (error) {
                markPassportDiagnosticStage(error, 'firestore_client_create')
                throw error
            }

            stage = 'firestore_transaction_read'
            let carRef
            try {
                carRef = db.collection('cars').doc(body.carId)
            } catch (error) {
                markPassportDiagnosticStage(error, 'firestore_transaction_read')
                throw error
            }

            let result
            try {
                result = await db.runTransaction(async transaction => {
                    let snapshot
                    try {
                        snapshot = await transaction.get(carRef)
                    } catch (error) {
                        markPassportDiagnosticStage(error, 'firestore_transaction_read')
                        throw error
                    }
                    if (!snapshot.exists || snapshot.data().user_id !== user.uid) throw new PassportRequestError(403)
                    const car = snapshot.data()
                    if (car.deletion_requested === true) throw new PassportRequestError(409)

                    if (body.operation === 'getStatus') {
                        const enabled = car.public_share_enabled === true && isPassportToken(car.share_token)
                        return { enabled, token: enabled ? car.share_token : null }
                    }
                    if (body.operation === 'disable') {
                        try {
                            transaction.update(carRef, { public_share_enabled: false, share_token: null })
                        } catch (error) {
                            markPassportDiagnosticStage(error, 'firestore_transaction_write')
                            throw error
                        }
                        return { enabled: false, token: null }
                    }

                    // Both enable and rotate mint a fresh 256-bit bearer token.
                    const token = createPassportToken()
                    try {
                        transaction.update(carRef, { public_share_enabled: true, share_token: token })
                    } catch (error) {
                        markPassportDiagnosticStage(error, 'firestore_transaction_write')
                        throw error
                    }
                    return { enabled: true, token }
                })
            } catch (error) {
                const transactionStage = body.operation === 'getStatus'
                    ? 'firestore_transaction_read'
                    : 'firestore_transaction_write'
                markPassportDiagnosticStage(error, transactionStage)
                stage = getPassportDiagnosticStage(error) || transactionStage
                throw error
            }

            stage = 'response_serialization'
            return response.status(200).json(result)
        } catch (error) {
            if (!(error instanceof PassportRequestError)) {
                logPassportShareFailure({
                    operation,
                    stage: getPassportDiagnosticStage(error) || stage || 'unexpected_server_failure',
                    error
                })
            }
            return sendPassportFailure(response, error)
        }
    }
}

export default createPassportShareHandler()
