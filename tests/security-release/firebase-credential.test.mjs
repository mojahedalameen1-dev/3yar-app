import assert from 'node:assert/strict'
import test from 'node:test'
import {
    createVercelFederatedCredential,
    gcpWorkloadIdentityAudience
} from '../../api/_firebase-admin.js'

const stagingLikeConfig = {
    FIREBASE_PROJECT_ID: 'yar-3yar-free',
    GCP_PROJECT_ID: 'yar-3yar-free',
    GCP_PROJECT_NUMBER: '615087307444',
    GCP_SERVICE_ACCOUNT_EMAIL: 'three-yar-runtime-prod@yar-3yar-free.iam.gserviceaccount.com',
    GCP_WORKLOAD_IDENTITY_POOL_ID: 'vercel-production',
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'vercel-prod'
}

test('production federation fails closed when configuration is missing', () => {
    assert.throws(
        () => createVercelFederatedCredential({ FIREBASE_PROJECT_ID: 'yar-3yar-free' }),
        /missing configuration/
    )
})

test('production federation refuses a Firebase and Google Cloud project mismatch', () => {
    assert.throws(
        () => createVercelFederatedCredential({ ...stagingLikeConfig, GCP_PROJECT_ID: 'another-project' }),
        /project IDs do not match/
    )
})

test('production federation constructs a short-lived external credential without reading a JSON key', () => {
    const credential = createVercelFederatedCredential(stagingLikeConfig)
    assert.equal(typeof credential.getAccessToken, 'function')
})

test('Vercel OIDC audience matches the Google workload identity provider resource name', () => {
    assert.equal(
        gcpWorkloadIdentityAudience(stagingLikeConfig),
        'https://iam.googleapis.com/projects/615087307444/locations/global/workloadIdentityPools/vercel-production/providers/vercel-prod'
    )
})
