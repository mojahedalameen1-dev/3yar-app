import { adminDb } from './_firebase-admin.js'
import { buildPublicPassport, PUBLIC_MAINTENANCE_LIMIT, PUBLIC_VEHICLE_DOCUMENTS } from './_passport-projection.js'
import {
    isPassportToken,
    passportBody,
    PassportRequestError,
    sendPassportFailure,
    setPassportPrivacyHeaders
} from './_passport-security.js'

function shareMatches(car, token) {
    return car?.public_share_enabled === true
        && car.share_token === token
        && car.deletion_requested !== true
        && typeof car.user_id === 'string'
        && car.user_id.length > 0
}

function scopedRows(snapshot, ownerId, carId, type) {
    // Retain a second ownership guard even though every server query is scoped.
    return snapshot.docs.map(document => document.data()).filter(row => row.user_id === ownerId
        && row.car_id === carId && (type === undefined || row.type === type))
}

export function createPublicPassportHandler({ getDb = adminDb, now = () => new Date() } = {}) {
    return async function handler(request, response) {
        setPassportPrivacyHeaders(response)
        if (request.method !== 'POST') {
            response.setHeader('Allow', 'POST')
            return response.status(405).json({ error: 'Method not allowed' })
        }
        try {
            const token = passportBody(request)?.token
            // Malformed, absent, disabled, rotated, and revoked shares have the same response.
            if (!isPassportToken(token)) throw new PassportRequestError(404)
            const db = getDb()
            const matches = await db.collection('cars')
                .where('share_token', '==', token)
                .where('public_share_enabled', '==', true)
                .limit(2).get()
            if (matches.docs.length !== 1) throw new PassportRequestError(404)
            const carSnapshot = matches.docs[0]
            const car = carSnapshot.data()
            if (!shareMatches(car, token)) throw new PassportRequestError(404)
            const ownerId = car.user_id
            const carId = carSnapshot.id

            const [recordSnapshot, ...documentSnapshots] = await Promise.all([
                db.collection('maintenance_records')
                    .where('user_id', '==', ownerId)
                    .where('car_id', '==', carId)
                    .orderBy('date', 'desc')
                    .limit(PUBLIC_MAINTENANCE_LIMIT + 1).get(),
                // Equality-only, bounded singleton queries use existing index merging.
                // Exclude personal driving licences and custom documents at query time.
                ...PUBLIC_VEHICLE_DOCUMENTS.map(({ type }) => db.collection('documents')
                    .where('user_id', '==', ownerId)
                    .where('car_id', '==', carId)
                    .where('type', '==', type)
                    .limit(2).get())
            ])

            // Re-check immediately before returning: a disable/rotate/delete committed
            // while child queries were running must not return the old projection.
            const latest = await carSnapshot.ref.get()
            if (!latest.exists || latest.data().user_id !== ownerId || !shareMatches(latest.data(), token)) {
                throw new PassportRequestError(404)
            }
            const records = scopedRows(recordSnapshot, ownerId, carId)
            const documentRows = documentSnapshots.flatMap((snapshot, index) =>
                scopedRows(snapshot, ownerId, carId, PUBLIC_VEHICLE_DOCUMENTS[index].type).slice(0, 1))
            const truncated = recordSnapshot.docs.length > PUBLIC_MAINTENANCE_LIMIT
                || documentSnapshots.some(snapshot => snapshot.docs.length > 1)
            const result = buildPublicPassport(latest.data(), records, documentRows, { now: now(), truncated })
            return response.status(200).json(result)
        } catch (error) {
            return sendPassportFailure(response, error)
        }
    }
}

export default createPublicPassportHandler()
