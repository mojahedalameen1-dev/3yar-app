import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function serviceAccount() {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured')
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
    return parsed
}

export function adminApp() {
    return getApps()[0] || initializeApp({ credential: cert(serviceAccount()) })
}

export function adminAuth() {
    return getAuth(adminApp())
}

export function adminDb() {
    return getFirestore(adminApp())
}

export async function requireUser(request, { admin = false } = {}) {
    const header = request.headers.authorization || ''
    if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Authentication required'), { status: 401 })
    const decoded = await adminAuth().verifyIdToken(header.slice(7))
    if (admin && decoded.admin !== true) throw Object.assign(new Error('Admin access required'), { status: 403 })
    return decoded
}

export function sendError(response, error) {
    console.error(error)
    response.status(error.status || 500).json({ error: error.message || 'Internal server error' })
}
