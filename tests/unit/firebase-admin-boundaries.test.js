import { describe, expect, it, vi } from 'vitest'
import { createFirebaseAdmin } from '../../api/_firebase-admin.js'
import { createPassportShareHandler } from '../../api/passport-share.js'
import {
    getPassportDiagnosticStage,
    logPassportShareFailure,
    markPassportDiagnosticStage
} from '../../api/_passport-diagnostics.js'

const ownerId = 'synthetic-owner'
const carId = 'synthetic-car'
const app = { name: 'synthetic-app' }

function responseRecorder() {
    return {
        headers: {}, statusCode: null, body: null,
        setHeader(name, value) { this.headers[name] = value },
        status(code) { this.statusCode = code; return this },
        json(body) { this.body = body; return this }
    }
}

function createHarness(failedBoundary) {
    const failure = new Error('PRIVATE-DETAILS-DO-NOT-LOG')
    const transactionUpdate = vi.fn()
    const getApps = failedBoundary === 'firebase_app_lookup'
        ? () => { throw failure }
        : () => failedBoundary === 'firebase_app_initialize' ? [] : [app]
    const initializeApp = failedBoundary === 'firebase_app_initialize'
        ? () => { throw failure }
        : () => app
    const auth = {
        verifyIdToken: failedBoundary === 'firebase_token_verification'
            ? async () => { throw failure }
            : async () => ({ uid: ownerId })
    }
    const getAuth = failedBoundary === 'firebase_auth_client_create'
        ? () => { throw failure }
        : () => auth
    const getFirestore = failedBoundary === 'firestore_client_create'
        ? () => { throw failure }
        : () => ({
            collection: () => ({ doc: id => ({ id }) }),
            runTransaction: async callback => callback({
                get: async () => ({
                    exists: true,
                    data: () => ({ user_id: ownerId, public_share_enabled: false, share_token: null })
                }),
                update: transactionUpdate
            })
        })

    const admin = createFirebaseAdmin({
        env: {
            VERCEL_ENV: 'production',
            FIREBASE_PROJECT_ID: 'synthetic-project'
        },
        getApps,
        initializeApp,
        getAuth,
        getFirestore,
        createFederatedCredential: () => ({ synthetic: true })
    })
    const handler = createPassportShareHandler({
        authenticate: admin.requireUser,
        getDb: admin.adminDb
    })

    return { failure, admin, handler, transactionUpdate }
}

async function runGetStatus(handler) {
    const response = responseRecorder()
    await handler({
        method: 'POST',
        body: { carId, operation: 'getStatus' },
        headers: { authorization: 'Bearer synthetic-id-token' }
    }, response)
    return response
}

describe('precise Firebase Admin diagnostic boundaries', () => {
    it.each([
        ['getApps', 'firebase_app_lookup'],
        ['initializeApp', 'firebase_app_initialize'],
        ['getAuth', 'firebase_auth_client_create'],
        ['verifyIdToken', 'firebase_token_verification'],
        ['getFirestore', 'firestore_client_create']
    ])('identifies %s independently and preserves a plain original Error', async (boundary, expectedStage) => {
        const logs = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const { failure, handler, admin } = createHarness(expectedStage)
            const executeBoundary = {
                firebase_app_lookup: () => admin.adminAuth(),
                firebase_app_initialize: () => admin.adminAuth(),
                firebase_auth_client_create: () => admin.adminAuth(),
                firebase_token_verification: () => admin.requireUser({
                    headers: { authorization: 'Bearer synthetic-id-token' }
                }),
                firestore_client_create: () => admin.adminDb()
            }[expectedStage]

            if (expectedStage === 'firebase_token_verification') {
                await expect(executeBoundary()).rejects.toBe(failure)
            } else {
                try {
                    executeBoundary()
                    expect.fail('Expected the injected Firebase Admin boundary to fail')
                } catch (error) {
                    expect(error).toBe(failure)
                }
            }

            const response = await runGetStatus(handler)

            expect(response.statusCode).toBe(500)
            expect(response.body).toEqual({ error: 'Passport temporarily unavailable' })
            expect(getPassportDiagnosticStage(failure)).toBe(expectedStage)
            expect(logs).toHaveBeenCalledTimes(1)
            expect(logs).toHaveBeenCalledWith('passport_share_failure', {
                operation: 'getStatus',
                stage: expectedStage,
                errorClass: 'Error',
                errorCode: 'UNCLASSIFIED'
            })
            const loggedText = JSON.stringify(logs.mock.calls)
            expect(loggedText).not.toContain('PRIVATE-')
            expect(loggedText).not.toContain(ownerId)
            expect(loggedText).not.toContain(carId)
            expect(loggedText).not.toContain('synthetic-id-token')
        } finally { logs.mockRestore() }
    })

    it('keeps the earliest specific stage when a later boundary attempts a broader mark', () => {
        const error = new Error('PRIVATE-DETAILS')
        markPassportDiagnosticStage(error, 'oidc_wif_configuration')
        markPassportDiagnosticStage(error, 'firestore_client_create')

        expect(getPassportDiagnosticStage(error)).toBe('oidc_wif_configuration')
    })

    it('keeps valid-token authentication and read-only getStatus behavior unchanged', async () => {
        const { handler, transactionUpdate } = createHarness(null)
        const response = await runGetStatus(handler)

        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({ enabled: false, token: null })
        expect(transactionUpdate).not.toHaveBeenCalled()
    })

    it('keeps invalid Firebase ID token responses as 401 without diagnostics', async () => {
        const logs = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            const error = Object.assign(new Error('PRIVATE-TOKEN-DETAILS'), { code: 'auth/invalid-id-token' })
            const admin = createFirebaseAdmin({
                env: { VERCEL_ENV: 'production', FIREBASE_PROJECT_ID: 'synthetic-project' },
                getApps: () => [app],
                getAuth: () => ({ verifyIdToken: async () => { throw error } })
            })
            const handler = createPassportShareHandler({ authenticate: admin.requireUser })
            const response = await runGetStatus(handler)

            expect(response.statusCode).toBe(401)
            expect(response.body).toEqual({ error: 'Authentication required' })
            expect(logs).not.toHaveBeenCalled()
        } finally { logs.mockRestore() }
    })

    it('does not treat arbitrary HTTP status fields as allowlisted error codes', () => {
        const logs = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            logPassportShareFailure({
                operation: 'getStatus',
                stage: 'firebase_app_initialize',
                error: Object.assign(new Error('PRIVATE-DETAILS'), { status: 503 })
            })

            expect(logs).toHaveBeenCalledWith('passport_share_failure', expect.objectContaining({
                errorCode: 'UNCLASSIFIED'
            }))
            expect(JSON.stringify(logs.mock.calls)).not.toContain('PRIVATE-')
        } finally { logs.mockRestore() }
    })
})
