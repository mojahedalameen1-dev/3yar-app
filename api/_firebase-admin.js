import { getVercelOidcToken } from '@vercel/oidc'
import { ExternalAccountClient } from 'google-auth-library'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function localServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured for local development')

    const serviceAccount = JSON.parse(raw)
    if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
    return serviceAccount
}

export function createVercelFederatedCredential(env = process.env) {
    const required = [
        'FIREBASE_PROJECT_ID',
        'GCP_PROJECT_ID',
        'GCP_PROJECT_NUMBER',
        'GCP_SERVICE_ACCOUNT_EMAIL',
        'GCP_WORKLOAD_IDENTITY_POOL_ID',
        'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID'
    ]
    const missing = required.filter(name => !env[name])
    if (missing.length) throw new Error(`Vercel Firebase federation is missing configuration: ${missing.join(', ')}`)
    if (env.FIREBASE_PROJECT_ID !== env.GCP_PROJECT_ID) {
        throw new Error('Firebase and Google Cloud project IDs do not match')
    }

    const audience = gcpWorkloadIdentityAudience(env)
    const externalAccount = ExternalAccountClient.fromJSON({
        type: 'external_account',
        audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${env.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
        subject_token_supplier: {
            getSubjectToken: () => getVercelOidcToken({ audience })
        }
    })

    if (!externalAccount) throw new Error('Unable to create the Vercel workload identity credential')

    return {
        async getAccessToken() {
            const { token } = await externalAccount.getAccessToken()
            if (!token) throw new Error('Google Cloud did not return an access token')
            const expiryDate = externalAccount.credentials.expiry_date
            const expiresIn = expiryDate
                ? Math.max(1, Math.floor((expiryDate - Date.now()) / 1000))
                : 3600
            return { access_token: token, expires_in: expiresIn }
        }
    }
}

export function gcpWorkloadIdentityAudience(env) {
    return `https://iam.googleapis.com/projects/${env.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${env.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`
}

export function adminApp() {
    const existing = getApps()[0]
    if (existing) return existing

    if (process.env.VERCEL_ENV === 'production') {
        return initializeApp({
            credential: createVercelFederatedCredential(),
            projectId: process.env.FIREBASE_PROJECT_ID
        })
    }

    const serviceAccount = localServiceAccount()
    return initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
    })
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
