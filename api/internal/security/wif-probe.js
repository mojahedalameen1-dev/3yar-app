import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createVercelFederatedCredential } from '../../_firebase-admin.js'

const PROJECT_ID = 'yar-3yar-free'
const SERVICE_ACCOUNT = 'three-yar-runtime-prod@yar-3yar-free.iam.gserviceaccount.com'

export function constantTimeSecretMatch(candidate, expected) {
    if (typeof candidate !== 'string' || typeof expected !== 'string' || !expected) return false
    const candidateHash = createHash('sha256').update(candidate).digest()
    const expectedHash = createHash('sha256').update(expected).digest()
    return timingSafeEqual(candidateHash, expectedHash)
}

async function readOnlyOidcProbe(env) {
    if (
        env.FIREBASE_PROJECT_ID !== PROJECT_ID ||
        env.GCP_PROJECT_ID !== PROJECT_ID ||
        env.GCP_SERVICE_ACCOUNT_EMAIL !== SERVICE_ACCOUNT
    ) {
        throw new Error('OIDC probe configuration does not match the production runtime identity')
    }

    const app = initializeApp({
        credential: createVercelFederatedCredential(env),
        projectId: PROJECT_ID
    }, `security-wif-probe-${randomUUID()}`)

    try {
        const snapshot = await getFirestore(app).doc('security_probe/oidc-validation').get()
        return snapshot.exists
    } finally {
        await deleteApp(app)
    }
}

export function createWifProbeHandler({ env = process.env, probe = readOnlyOidcProbe } = {}) {
    return async function wifProbe(request, response) {
        response.setHeader('Cache-Control', 'no-store')

        if (request.method !== 'GET') {
            response.status(405).json({ error: 'Method not allowed' })
            return
        }

        const expected = env.SECURITY_PROBE_SECRET
        if (
            env.VERCEL_ENV !== 'production' ||
            env.SECURITY_PROBE_ENABLED !== 'true' ||
            !expected ||
            !constantTimeSecretMatch(request.headers?.['x-3yar-security-probe'], expected)
        ) {
            response.status(404).json({ error: 'Not found' })
            return
        }

        try {
            const documentExists = await probe(env)
            const ok = documentExists === false
            response.status(ok ? 200 : 409).json({
                ok,
                authMode: 'oidc',
                projectId: PROJECT_ID,
                firestoreReachable: true,
                documentExists
            })
        } catch {
            console.error('[security-wif-probe] OIDC read-only verification failed')
            response.status(503).json({
                ok: false,
                authMode: 'oidc',
                projectId: PROJECT_ID,
                firestoreReachable: false,
                documentExists: null
            })
        }
    }
}

export default createWifProbeHandler()
