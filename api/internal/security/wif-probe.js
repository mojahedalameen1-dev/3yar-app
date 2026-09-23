import { createHash, timingSafeEqual } from 'node:crypto'
import { getVercelOidcToken, verifyVercelOidcToken } from '@vercel/oidc'

const PROJECT_ID = 'yar-3yar-free'
const VERCEL_PROJECT_ID = 'prj_MGTs8Foutto6Oh9gijiUJobv2x6u'
const SERVICE_ACCOUNT = 'three-yar-runtime-prod@yar-3yar-free.iam.gserviceaccount.com'
const VERCEL_ISSUER = 'https://oidc.vercel.com/mojahed1s-projects'
const VERCEL_SUBJECT = 'owner:mojahed1s-projects:project:3yar-app-lpha:environment:production'
const STS_URL = 'https://sts.googleapis.com/v1/token'
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const TOKEN_EXCHANGE_GRANT = 'urn:ietf:params:oauth:grant-type:token-exchange'
const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token'
const JWT_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:jwt'

export function constantTimeSecretMatch(candidate, expected) {
    if (typeof candidate !== 'string' || typeof expected !== 'string' || !expected) return false
    const candidateHash = createHash('sha256').update(candidate).digest()
    const expectedHash = createHash('sha256').update(expected).digest()
    return timingSafeEqual(candidateHash, expectedHash)
}

export function gcpProviderAudience(env) {
    const required = [
        'FIREBASE_PROJECT_ID',
        'GCP_PROJECT_ID',
        'GCP_PROJECT_NUMBER',
        'GCP_SERVICE_ACCOUNT_EMAIL',
        'GCP_WORKLOAD_IDENTITY_POOL_ID',
        'GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID'
    ]
    if (required.some(name => !env[name])) return null
    if (
        env.FIREBASE_PROJECT_ID !== PROJECT_ID ||
        env.GCP_PROJECT_ID !== PROJECT_ID ||
        env.GCP_SERVICE_ACCOUNT_EMAIL !== SERVICE_ACCOUNT
    ) return null

    return `https://iam.googleapis.com/projects/${env.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${env.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`
}

function claimsMatchExpected(payload, env, audience) {
    const actualAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    return payload.iss === VERCEL_ISSUER &&
        actualAudiences.includes(audience) &&
        payload.project_id === VERCEL_PROJECT_ID &&
        env.VERCEL_PROJECT_ID === VERCEL_PROJECT_ID &&
        payload.environment === 'production' &&
        payload.sub === VERCEL_SUBJECT
}

function safeOidcVerificationCode(error) {
    if (error?.claim === 'aud' || /audience/i.test(String(error?.code || ''))) {
        return 'OIDC_AUDIENCE_MISMATCH'
    }
    if (error?.claim === 'iss' || /issuer/i.test(String(error?.code || ''))) {
        return 'OIDC_ISSUER_MISMATCH'
    }
    return 'OIDC_TOKEN_INVALID'
}

async function safeJson(response) {
    try {
        return await response.json()
    } catch {
        return null
    }
}

function internalGoogleErrorText(payload) {
    const error = payload?.error
    const details = Array.isArray(error?.details) ? error.details : []
    const detailText = details.map(detail => [
        detail?.reason,
        detail?.metadata?.service,
        detail?.metadata?.permission
    ].filter(value => typeof value === 'string').join(' ')).join(' ')
    return [
        typeof error === 'string' ? error : error?.status,
        error?.message,
        error?.error_description,
        payload?.error_description,
        payload?.message,
        detailText
    ].filter(value => typeof value === 'string').join(' ').toLowerCase()
}

function classifyStsFailure(response, payload) {
    const error = payload?.error
    const text = internalGoogleErrorText(payload)
    if (
        text.includes('service_disabled') ||
        text.includes('security token service api has not been used') ||
        text.includes('sts.googleapis.com has not been used')
    ) return 'STS_DISABLED'
    if (text.includes('audience') && /(invalid|mismatch|does not match|not allowed)/.test(text)) {
        return 'OIDC_AUDIENCE_MISMATCH'
    }
    if (text.includes('issuer') && /(invalid|mismatch|does not match|not allowed)/.test(text)) {
        return 'OIDC_ISSUER_MISMATCH'
    }
    if (text.includes('attribute condition') || text.includes('condition was not met')) {
        return 'PROVIDER_CONDITION_REJECTED'
    }
    if (text.includes('workload identity pool') && /(not found|does not exist)/.test(text)) {
        return 'WIF_PROVIDER_NOT_FOUND'
    }
    if (text.includes('provider') && /(not found|does not exist)/.test(text)) {
        return 'WIF_PROVIDER_NOT_FOUND'
    }
    if (error === 'invalid_target') {
        return text.includes('audience') ? 'OIDC_AUDIENCE_MISMATCH' : 'WIF_PROVIDER_NOT_FOUND'
    }
    if (error?.status === 'INVALID_ARGUMENT') {
        return 'OIDC_AUDIENCE_MISMATCH'
    }
    if (response.status === 403) return 'PROVIDER_CONDITION_REJECTED'
    return 'STS_UNKNOWN'
}

function classifyImpersonationFailure(response, payload) {
    const text = internalGoogleErrorText(payload)
    if (
        text.includes('service_disabled') ||
        text.includes('iam service account credentials api has not been used') ||
        text.includes('iamcredentials.googleapis.com has not been used')
    ) return 'IAM_CREDENTIALS_API_DISABLED'
    if (text.includes('iam.serviceaccounts.getaccesstoken')) {
        return 'WIF_PRINCIPAL_BINDING_MISSING'
    }
    if (response.status === 403) return 'WIF_IMPERSONATION_DENIED'
    return 'UNKNOWN_IMPERSONATION_ERROR'
}

function classifyFirestoreFailure(response, payload) {
    const text = internalGoogleErrorText(payload)
    if (text.includes('firestore.googleapis.com has not been used') || text.includes('service_disabled')) {
        return 'FIRESTORE_API_DISABLED'
    }
    if (response.status === 403) return 'FIRESTORE_READ_DENIED'
    return 'FIRESTORE_READ_FAILED'
}

function diagnosticResult(ok, stage, code, claimsMatch) {
    const result = { ok, stage, code }
    if (typeof claimsMatch === 'boolean') result.claimsMatchExpected = claimsMatch
    return result
}

const SAFE_DIAGNOSTIC_CODES = new Set([
    'OIDC_CONFIGURATION_INVALID',
    'VERCEL_OIDC_TOKEN_UNAVAILABLE',
    'OIDC_AUDIENCE_MISMATCH',
    'OIDC_ISSUER_MISMATCH',
    'OIDC_TOKEN_INVALID',
    'PROVIDER_CONDITION_REJECTED',
    'STS_DISABLED',
    'WIF_PROVIDER_NOT_FOUND',
    'STS_UNKNOWN',
    'IAM_CREDENTIALS_API_DISABLED',
    'WIF_PRINCIPAL_BINDING_MISSING',
    'WIF_IMPERSONATION_DENIED',
    'UNKNOWN_IMPERSONATION_ERROR',
    'FIRESTORE_READ_OK',
    'FIRESTORE_DOCUMENT_EXISTS',
    'FIRESTORE_READ_DENIED',
    'FIRESTORE_API_DISABLED',
    'FIRESTORE_READ_FAILED',
    'OIDC_TOKEN_UNAVAILABLE'
])

export async function runOidcDiagnostic({
    env = process.env,
    getOidcToken = getVercelOidcToken,
    verifyOidcToken = verifyVercelOidcToken,
    fetchImpl = globalThis.fetch
} = {}) {
    const audience = gcpProviderAudience(env)
    if (!audience) {
        return diagnosticResult(false, 'vercel_oidc_token', 'OIDC_CONFIGURATION_INVALID')
    }

    let oidcToken
    try {
        oidcToken = await getOidcToken({ audience, skipCache: true })
    } catch {
        return diagnosticResult(false, 'vercel_oidc_token', 'VERCEL_OIDC_TOKEN_UNAVAILABLE')
    }
    if (typeof oidcToken !== 'string' || !oidcToken) {
        return diagnosticResult(false, 'vercel_oidc_token', 'VERCEL_OIDC_TOKEN_UNAVAILABLE')
    }

    let payload
    try {
        const verified = await verifyOidcToken(oidcToken, {
            audience,
            issuer: VERCEL_ISSUER,
            projectId: '*',
            environment: '*'
        })
        payload = verified?.payload
    } catch (error) {
        return diagnosticResult(false, 'vercel_oidc_token', safeOidcVerificationCode(error))
    }

    const claimsMatch = payload && claimsMatchExpected(payload, env, audience)
    if (!claimsMatch) {
        return diagnosticResult(false, 'vercel_oidc_token', 'PROVIDER_CONDITION_REJECTED', false)
    }

    const stsAudience = audience.replace(/^https:/, '')
    const stsBody = new globalThis.URLSearchParams({
        grant_type: TOKEN_EXCHANGE_GRANT,
        audience: stsAudience,
        requested_token_type: ACCESS_TOKEN_TYPE,
        scope: FIRESTORE_SCOPE,
        subject_token_type: JWT_TOKEN_TYPE,
        subject_token: oidcToken
    })

    let stsResponse
    let stsPayload
    try {
        stsResponse = await fetchImpl(STS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: stsBody,
            signal: globalThis.AbortSignal.timeout(10000)
        })
        stsPayload = await safeJson(stsResponse)
    } catch {
        return diagnosticResult(false, 'google_sts_exchange', 'STS_UNKNOWN', true)
    }
    if (!stsResponse.ok) {
        return diagnosticResult(false, 'google_sts_exchange', classifyStsFailure(stsResponse, stsPayload), true)
    }
    const federatedAccessToken = stsPayload?.access_token
    if (typeof federatedAccessToken !== 'string' || !federatedAccessToken) {
        return diagnosticResult(false, 'google_sts_exchange', 'STS_UNKNOWN', true)
    }

    let impersonationResponse
    let impersonationPayload
    try {
        impersonationResponse = await fetchImpl(
            `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT}:generateAccessToken`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${federatedAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scope: [FIRESTORE_SCOPE],
                    lifetime: '900s'
                }),
                signal: globalThis.AbortSignal.timeout(10000)
            }
        )
        impersonationPayload = await safeJson(impersonationResponse)
    } catch {
        return diagnosticResult(false, 'service_account_impersonation', 'UNKNOWN_IMPERSONATION_ERROR', true)
    }
    if (!impersonationResponse.ok) {
        return diagnosticResult(
            false,
            'service_account_impersonation',
            classifyImpersonationFailure(impersonationResponse, impersonationPayload),
            true
        )
    }
    const serviceAccountAccessToken = impersonationPayload?.accessToken
    if (typeof serviceAccountAccessToken !== 'string' || !serviceAccountAccessToken) {
        return diagnosticResult(false, 'service_account_impersonation', 'UNKNOWN_IMPERSONATION_ERROR', true)
    }

    let firestoreResponse
    let firestorePayload
    try {
        firestoreResponse = await fetchImpl(
            `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/__security_probe__/oidc-validation`,
            {
                method: 'GET',
                headers: { Authorization: `Bearer ${serviceAccountAccessToken}` },
                signal: globalThis.AbortSignal.timeout(10000)
            }
        )
        firestorePayload = firestoreResponse.status === 404 ? await safeJson(firestoreResponse) : null
    } catch {
        return diagnosticResult(false, 'firestore_read', 'FIRESTORE_READ_FAILED', true)
    }

    const missingDocumentText = internalGoogleErrorText(firestorePayload)
    const expectedDocumentMissing = firestoreResponse.status === 404 &&
        missingDocumentText.includes('document') &&
        (missingDocumentText.includes('not found') || missingDocumentText.includes('does not exist'))
    if (expectedDocumentMissing) return diagnosticResult(true, 'firestore_read', 'FIRESTORE_READ_OK', true)
    if (firestoreResponse.ok) return diagnosticResult(false, 'firestore_read', 'FIRESTORE_DOCUMENT_EXISTS', true)

    return diagnosticResult(false, 'firestore_read', classifyFirestoreFailure(firestoreResponse, firestorePayload), true)
}

export function createWifProbeHandler({ env = process.env, probe = runOidcDiagnostic } = {}) {
    return async function wifProbe(request, response) {
        response.setHeader('Cache-Control', 'no-store')

        if (request.method !== 'GET') {
            response.status(405).json(diagnosticResult(false, 'authorization', 'METHOD_NOT_ALLOWED'))
            return
        }

        const expected = env.SECURITY_PROBE_SECRET
        if (
            env.VERCEL_ENV !== 'production' ||
            env.SECURITY_PROBE_ENABLED !== 'true' ||
            !expected ||
            !constantTimeSecretMatch(request.headers?.['x-3yar-security-probe'], expected)
        ) {
            response.status(404).json(diagnosticResult(false, 'authorization', 'NOT_FOUND'))
            return
        }

        let result
        try {
            result = await probe({ env })
        } catch {
            result = diagnosticResult(false, 'vercel_oidc_token', 'OIDC_TOKEN_UNAVAILABLE')
        }
        const safeStages = new Set([
            'vercel_oidc_token',
            'google_sts_exchange',
            'service_account_impersonation',
            'firestore_read'
        ])
        if (
            !result ||
            !safeStages.has(result.stage) ||
            typeof result.ok !== 'boolean' ||
            !SAFE_DIAGNOSTIC_CODES.has(result.code)
        ) {
            result = diagnosticResult(false, 'vercel_oidc_token', 'OIDC_TOKEN_UNAVAILABLE')
        }

        const safeResult = diagnosticResult(
            result.ok,
            result.stage,
            result.code,
            typeof result.claimsMatchExpected === 'boolean' ? result.claimsMatchExpected : undefined
        )
        response.status(result.ok ? 200 : 503).json(safeResult)
    }
}

export default createWifProbeHandler()
