import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromJSON } = vi.hoisted(() => ({ fromJSON: vi.fn() }))

vi.mock('@vercel/oidc', () => ({ getVercelOidcToken: vi.fn() }))
vi.mock('google-auth-library', () => ({ ExternalAccountClient: { fromJSON } }))

import { createVercelFederatedCredential } from '../../api/_firebase-admin.js'
import {
    getPassportDiagnosticStage,
    markPassportDiagnosticStage
} from '../../api/_passport-diagnostics.js'

const productionConfig = {
    FIREBASE_PROJECT_ID: 'yar-3yar-free',
    GCP_PROJECT_ID: 'yar-3yar-free',
    GCP_PROJECT_NUMBER: '615087307444',
    GCP_SERVICE_ACCOUNT_EMAIL: 'three-yar-runtime-prod@yar-3yar-free.iam.gserviceaccount.com',
    GCP_WORKLOAD_IDENTITY_POOL_ID: 'vercel-production',
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'vercel-prod'
}

describe('Firebase WIF diagnostic stage', () => {
    beforeEach(() => fromJSON.mockReset())

    it('marks access-token exchange failures as WIF acquisition without changing the thrown error', async () => {
        const wifError = Object.assign(new Error('PRIVATE-WIF-DETAILS'), { code: 'PERMISSION_DENIED' })
        const getAccessToken = vi.fn().mockRejectedValue(wifError)
        fromJSON.mockReturnValue({ getAccessToken, credentials: {} })

        const credential = createVercelFederatedCredential(productionConfig)
        await expect(credential.getAccessToken()).rejects.toBe(wifError)

        expect(getAccessToken).toHaveBeenCalledOnce()
        expect(getPassportDiagnosticStage(wifError)).toBe('oidc_wif_credential_acquisition')
        expect(wifError.message).toBe('PRIVATE-WIF-DETAILS')
    })

    it('preserves a diagnostic stage through a wrapped credential error', () => {
        const original = new Error('PRIVATE-WIF-DETAILS')
        const wrapped = new Error('outer wrapper', { cause: original })
        // The WIF marker is assigned by the credential adapter before SDK wrappers propagate it.
        markPassportDiagnosticStage(original, 'oidc_wif_credential_acquisition')

        expect(getPassportDiagnosticStage(wrapped)).toBe('oidc_wif_credential_acquisition')
    })
})
