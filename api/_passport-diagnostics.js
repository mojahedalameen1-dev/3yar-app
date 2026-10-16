const PASSPORT_DIAGNOSTIC_STAGES = new Set([
    'firebase_admin_initialization',
    'firebase_token_verification',
    'oidc_wif_configuration',
    'oidc_wif_credential_acquisition',
    'firestore_transaction_read',
    'firestore_transaction_write',
    'response_serialization',
    'unexpected_server_failure'
])

const PASSPORT_OPERATIONS = new Set(['getStatus', 'enable', 'disable', 'rotate'])

const SAFE_ERROR_CODES = new Set([
    'auth/argument-error',
    'auth/invalid-id-token',
    'auth/id-token-expired',
    'auth/id-token-revoked',
    'auth/user-disabled',
    'auth/internal-error',
    'auth/network-request-failed',
    'auth/invalid-credential',
    'app/invalid-credential',
    'app/no-app',
    'firestore/permission-denied',
    'firestore/failed-precondition',
    'permission-denied',
    'unauthenticated',
    'failed-precondition',
    'not-found',
    'resource-exhausted',
    'unavailable',
    'deadline-exceeded',
    'internal',
    'aborted',
    'invalid_grant',
    'unauthorized_client',
    'invalid_scope',
    'invalid_target',
    'access_denied',
    'PERMISSION_DENIED',
    'UNAUTHENTICATED',
    'FAILED_PRECONDITION',
    'NOT_FOUND',
    'RESOURCE_EXHAUSTED',
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'INTERNAL',
    'ABORTED',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ERR_NETWORK',
    'ERR_BAD_REQUEST',
    'ERR_BAD_RESPONSE'
])

const SAFE_ERROR_CLASSES = new Set([
    'Error',
    'TypeError',
    'SyntaxError',
    'FirebaseError',
    'FirebaseAuthError',
    'GaxiosError',
    'FetchError'
])

const failureStages = new WeakMap()

export function markPassportDiagnosticStage(error, stage) {
    if (error && (typeof error === 'object' || typeof error === 'function')
        && PASSPORT_DIAGNOSTIC_STAGES.has(stage)
        && !failureStages.has(error)) {
        failureStages.set(error, stage)
    }
    return error
}

export function getPassportDiagnosticStage(error) {
    let current = error
    let remaining = 4
    while (current && remaining > 0) {
        const stage = failureStages.get(current)
        if (stage) return stage
        current = current.cause
        remaining -= 1
    }
    return undefined
}

function safeErrorClass(error) {
    const name = error && typeof error.name === 'string' ? error.name : ''
    return SAFE_ERROR_CLASSES.has(name) ? name : 'Unknown'
}

function safeErrorCode(error) {
    const code = error?.code
    if (typeof code === 'string' && SAFE_ERROR_CODES.has(code)) return code

    const status = Number.isInteger(error?.status)
        ? error.status
        : Number.isInteger(error?.response?.status) ? error.response.status : null
    if (status !== null && status >= 400 && status <= 599) return `HTTP_${status}`

    return 'UNCLASSIFIED'
}

export function logPassportShareFailure({ operation, stage, error }) {
    const safeEvent = {
        operation: PASSPORT_OPERATIONS.has(operation) ? operation : 'unknown',
        stage: PASSPORT_DIAGNOSTIC_STAGES.has(stage) ? stage : 'unexpected_server_failure',
        errorClass: safeErrorClass(error),
        errorCode: safeErrorCode(error)
    }

    try {
        console.error('passport_share_failure', safeEvent)
    } catch {
        // Diagnostics must never change the API result if the runtime logger fails.
    }
}
