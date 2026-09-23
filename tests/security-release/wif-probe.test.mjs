import assert from 'node:assert/strict'
import test from 'node:test'
import {
    constantTimeSecretMatch,
    createWifProbeHandler,
    gcpProviderAudience,
    runOidcDiagnostic
} from '../../api/internal/security/wif-probe.js'

const audience = 'https://iam.googleapis.com/projects/615087307444/locations/global/workloadIdentityPools/vercel-production/providers/vercel-3yar-production'
const projectId = 'prj_MGTs8Foutto6Oh9gijiUJobv2x6u'
const oidcSentinel = 'oidc-token-must-not-escape'
const federatedSentinel = 'federated-token-must-not-escape'
const serviceAccountSentinel = 'impersonated-token-must-not-escape'
const firestoreScope = 'https://www.googleapis.com/auth/cloud-platform'

const productionEnv = {
    VERCEL_ENV: 'production',
    VERCEL_PROJECT_ID: projectId,
    FIREBASE_PROJECT_ID: 'yar-3yar-free',
    GCP_PROJECT_ID: 'yar-3yar-free',
    GCP_PROJECT_NUMBER: '615087307444',
    GCP_SERVICE_ACCOUNT_EMAIL: 'three-yar-runtime-prod@yar-3yar-free.iam.gserviceaccount.com',
    GCP_WORKLOAD_IDENTITY_POOL_ID: 'vercel-production',
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'vercel-3yar-production'
}

const expectedPayload = {
    iss: 'https://oidc.vercel.com/mojahed1s-projects',
    aud: audience,
    project_id: projectId,
    environment: 'production',
    sub: 'owner:mojahed1s-projects:project:3yar-app-lpha:environment:production'
}

function fakeResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: undefined,
        setHeader(name, value) { this.headers[name] = value },
        status(code) { this.statusCode = code; return this },
        json(value) { this.body = value; return this }
    }
}

function apiResponse(payload, status = 200) {
    return { ok: status >= 200 && status < 300, status, async json() { return payload } }
}

function successfulDependencies({ firestoreResponse = apiResponse({ error: { status: 'NOT_FOUND', message: 'Document was not found.' } }, 404) } = {}) {
    const calls = []
    return {
        calls,
        getOidcToken: async options => {
            assert.deepEqual(options, { audience, skipCache: true })
            return oidcSentinel
        },
        verifyOidcToken: async (token, options) => {
            assert.equal(token, oidcSentinel)
            assert.deepEqual(options, { audience, issuer: expectedPayload.iss, projectId: '*', environment: '*' })
            return { payload: expectedPayload }
        },
        fetchImpl: async (url, options) => {
            calls.push({ url, options })
            if (calls.length === 1) return apiResponse({ access_token: federatedSentinel })
            if (calls.length === 2) return apiResponse({ accessToken: serviceAccountSentinel })
            return firestoreResponse
        }
    }
}

test('probe secret comparison accepts exact values and rejects mismatches safely', () => {
    assert.equal(constantTimeSecretMatch('test-only-secret', 'test-only-secret'), true)
    assert.equal(constantTimeSecretMatch('wrong', 'test-only-secret'), false)
    assert.equal(constantTimeSecretMatch(undefined, 'test-only-secret'), false)
})

test('probe audience is the explicit Google provider audience', () => {
    assert.equal(gcpProviderAudience(productionEnv), audience)
    assert.equal(gcpProviderAudience({ ...productionEnv, GCP_PROJECT_ID: 'another-project' }), null)
})

test('probe only allows GET and never runs for other methods', async () => {
    let calls = 0
    const handler = createWifProbeHandler({
        env: { ...productionEnv, SECURITY_PROBE_ENABLED: 'true', SECURITY_PROBE_SECRET: 'test-only-secret' },
        probe: async () => { calls++; return { ok: true, stage: 'firestore_read', code: 'DIRECT_FIRESTORE_REST_PASS' } }
    })
    const response = fakeResponse()
    await handler({ method: 'POST', headers: { 'x-3yar-security-probe': 'test-only-secret' } }, response)
    assert.equal(response.statusCode, 405)
    assert.deepEqual(response.body, { ok: false, stage: 'authorization', code: 'METHOD_NOT_ALLOWED' })
    assert.equal(calls, 0)
})

test('probe is hidden unless Production, enabled, and authorized by header', async () => {
    let calls = 0
    const probe = async () => { calls++; return { ok: true, stage: 'firestore_read', code: 'DIRECT_FIRESTORE_REST_PASS' } }
    for (const env of [
        { ...productionEnv, SECURITY_PROBE_ENABLED: 'true', SECURITY_PROBE_SECRET: 'test-only-secret', VERCEL_ENV: 'preview' },
        { ...productionEnv, SECURITY_PROBE_ENABLED: 'false', SECURITY_PROBE_SECRET: 'test-only-secret' }
    ]) {
        const response = fakeResponse()
        await createWifProbeHandler({ env, probe })({ method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } }, response)
        assert.equal(response.statusCode, 404)
        assert.deepEqual(response.body, { ok: false, stage: 'authorization', code: 'NOT_FOUND' })
    }
    const missingHeader = fakeResponse()
    await createWifProbeHandler({
        env: { ...productionEnv, SECURITY_PROBE_ENABLED: 'true', SECURITY_PROBE_SECRET: 'test-only-secret' },
        probe
    })({ method: 'GET', headers: {} }, missingHeader)
    assert.equal(missingHeader.statusCode, 404)
    assert.equal(calls, 0)
})

test('diagnostic explicitly obtains and verifies the Vercel token, then checks STS, impersonation, and read-only Firestore', async () => {
    const dependencies = successfulDependencies()
    const result = await runOidcDiagnostic({ env: productionEnv, ...dependencies })

    assert.deepEqual(result, {
        stage: 'firestore_rest',
        httpStatus: 404,
        transportFailure: false
    })
    assert.equal(dependencies.calls.length, 3)

    const stsRequest = dependencies.calls[0]
    assert.equal(stsRequest.url, 'https://sts.googleapis.com/v1/token')
    assert.equal(stsRequest.options.method, 'POST')
    const stsForm = new globalThis.URLSearchParams(stsRequest.options.body)
    assert.equal(stsForm.get('audience'), audience.replace(/^https:/, ''))
    assert.equal(stsForm.get('subject_token'), oidcSentinel)
    assert.equal(stsForm.get('requested_token_type'), 'urn:ietf:params:oauth:token-type:access_token')

    const impersonationRequest = dependencies.calls[1]
    assert.match(impersonationRequest.url, /three-yar-runtime-prod@yar-3yar-free\.iam\.gserviceaccount\.com:generateAccessToken$/)
    assert.equal(impersonationRequest.options.headers.Authorization, `Bearer ${federatedSentinel}`)
    assert.equal(JSON.parse(impersonationRequest.options.body).lifetime, '900s')
    assert.deepEqual(JSON.parse(impersonationRequest.options.body).scope, [firestoreScope])

    const firestoreRequest = dependencies.calls[2]
    assert.equal(firestoreRequest.options.method, 'GET')
    assert.match(firestoreRequest.url, /documents\/security_probe\/oidc-validation$/)
    assert.equal(firestoreRequest.options.headers.Authorization, `Bearer ${serviceAccountSentinel}`)

    const serialized = JSON.stringify(result)
    for (const secret of [oidcSentinel, federatedSentinel, serviceAccountSentinel]) {
        assert.equal(serialized.includes(secret), false)
    }
})

test('Stage A returns only a safe code when token acquisition fails', async () => {
    const result = await runOidcDiagnostic({
        env: productionEnv,
        getOidcToken: async () => { throw new Error(oidcSentinel) },
        verifyOidcToken: async () => { throw new Error('must not verify') },
        fetchImpl: async () => { throw new Error('must not call Google') }
    })
    assert.deepEqual(result, {
        ok: false,
        stage: 'vercel_oidc_token',
        code: 'VERCEL_OIDC_TOKEN_UNAVAILABLE'
    })
})

test('Stage A verifies the exact audience, issuer, project, environment, and subject before STS', async () => {
    let fetchCalls = 0
    const result = await runOidcDiagnostic({
        env: productionEnv,
        getOidcToken: async () => oidcSentinel,
        verifyOidcToken: async () => ({ payload: { ...expectedPayload, sub: 'owner:other:project:other:environment:production' } }),
        fetchImpl: async () => { fetchCalls++; return apiResponse({}) }
    })
    assert.deepEqual(result, {
        ok: false,
        stage: 'vercel_oidc_token',
        code: 'PROVIDER_CONDITION_REJECTED',
        claimsMatchExpected: false
    })
    assert.equal(fetchCalls, 0)
})

test('Stage A classifies audience verification failure without returning the underlying error', async () => {
    const result = await runOidcDiagnostic({
        env: productionEnv,
        getOidcToken: async () => oidcSentinel,
        verifyOidcToken: async () => { throw Object.assign(new Error(oidcSentinel), { claim: 'aud' }) },
        fetchImpl: async () => { throw new Error('must not call Google') }
    })
    assert.deepEqual(result, {
        ok: false,
        stage: 'vercel_oidc_token',
        code: 'OIDC_AUDIENCE_MISMATCH'
    })
})

test('Stage B maps Google STS failures to safe diagnostic codes only', async t => {
    const cases = [
        ['OIDC_AUDIENCE_MISMATCH', { error: 'invalid_target', error_description: 'The audience is invalid' }],
        ['OIDC_ISSUER_MISMATCH', { error: 'invalid_grant', error_description: 'The issuer does not match' }],
        ['PROVIDER_CONDITION_REJECTED', { error: 'invalid_grant', error_description: 'The given credential is rejected by the attribute condition' }],
        ['WIF_PROVIDER_NOT_FOUND', { error: { status: 'NOT_FOUND', message: 'The workload identity pool provider does not exist' } }],
        ['STS_DISABLED', { error: { status: 'PERMISSION_DENIED', message: 'Security Token Service API has not been used', details: [{ reason: 'SERVICE_DISABLED', metadata: { service: 'sts.googleapis.com' } }] } }],
        ['STS_UNKNOWN', { error: 'temporarily_unavailable', error_description: oidcSentinel }]
    ]

    for (const [code, errorPayload] of cases) {
        await t.test(code, async () => {
            const dependencies = successfulDependencies()
            dependencies.fetchImpl = async () => apiResponse(errorPayload, 400)
            const result = await runOidcDiagnostic({ env: productionEnv, ...dependencies })
            assert.deepEqual(result, {
                ok: false,
                stage: 'google_sts_exchange',
                code,
                claimsMatchExpected: true
            })
            assert.equal(JSON.stringify(result).includes(oidcSentinel), false)
        })
    }
})

test('Stage C distinguishes a disabled IAM Credentials API and a missing impersonation binding', async t => {
    const cases = [
        ['IAM_CREDENTIALS_API_DISABLED', { error: { status: 'PERMISSION_DENIED', message: 'IAM Service Account Credentials API has not been used', details: [{ reason: 'SERVICE_DISABLED', metadata: { service: 'iamcredentials.googleapis.com' } }] } }],
        ['WIF_PRINCIPAL_BINDING_MISSING', { error: { status: 'PERMISSION_DENIED', message: 'Permission iam.serviceAccounts.getAccessToken denied' } }],
        ['WIF_IMPERSONATION_DENIED', { error: { status: 'PERMISSION_DENIED', message: serviceAccountSentinel } }]
    ]

    for (const [code, errorPayload] of cases) {
        await t.test(code, async () => {
            const dependencies = successfulDependencies()
            dependencies.fetchImpl = async (_url, options) => {
                dependencies.calls.push({ options })
                return dependencies.calls.length === 1
                    ? apiResponse({ access_token: federatedSentinel })
                    : apiResponse(errorPayload, 403)
            }
            const result = await runOidcDiagnostic({ env: productionEnv, ...dependencies })
            assert.deepEqual(result, {
                ok: false,
                stage: 'service_account_impersonation',
                code,
                claimsMatchExpected: true
            })
            assert.equal(JSON.stringify(result).includes(serviceAccountSentinel), false)
        })
    }
})

test('Stage D returns the original Firestore HTTP status without reading its body', async t => {
    for (const status of [404, 401, 403, 429, 500, 503]) {
        await t.test(String(status), async () => {
            const responseBodySentinel = 'google-error-body-must-not-escape'
            const dependencies = successfulDependencies({
                firestoreResponse: {
                    ok: status >= 200 && status < 300,
                    status,
                    async json() { throw new Error(responseBodySentinel) }
                }
            })
            const result = await runOidcDiagnostic({ env: productionEnv, ...dependencies })
            assert.deepEqual(result, {
                stage: 'firestore_rest',
                httpStatus: status,
                transportFailure: false
            })
            assert.equal(dependencies.calls[2].options.method, 'GET')
            assert.equal(dependencies.calls[2].options.headers.Authorization, `Bearer ${serviceAccountSentinel}`)
            assert.equal(JSON.stringify(result).includes(responseBodySentinel), false)
        })
    }
})

test('Stage D returns only safe transport metadata when fetch throws before a response', async () => {
    const transportError = new TypeError(oidcSentinel, {
        cause: Object.assign(new Error('private transport detail'), { code: 'ECONNRESET' })
    })
    const dependencies = successfulDependencies({
        firestoreResponse: undefined
    })
    dependencies.fetchImpl = async (url, options) => {
        dependencies.calls.push({ url, options })
        if (dependencies.calls.length === 1) return apiResponse({ access_token: federatedSentinel })
        if (dependencies.calls.length === 2) return apiResponse({ accessToken: serviceAccountSentinel })
        throw transportError
    }
    const result = await runOidcDiagnostic({ env: productionEnv, ...dependencies })
    assert.deepEqual(result, {
        transportFailure: true,
        errorClass: 'TypeError',
        causeCode: 'ECONNRESET'
    })
    for (const secret of [oidcSentinel, federatedSentinel, serviceAccountSentinel, 'private transport detail']) {
        assert.equal(JSON.stringify(result).includes(secret), false)
    }
})

test('HTTP probe serializes only safe diagnostic fields and never reveals thrown errors', async () => {
    const env = {
        ...productionEnv,
        SECURITY_PROBE_ENABLED: 'true',
        SECURITY_PROBE_SECRET: 'test-only-secret'
    }
    const response = fakeResponse()
    await createWifProbeHandler({
        env,
        probe: async () => { throw new Error(oidcSentinel) }
    })(
        { method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } },
        response
    )

    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.body, {
        ok: false,
        stage: 'vercel_oidc_token',
        code: 'OIDC_TOKEN_UNAVAILABLE'
    })
    assert.equal(response.headers['Cache-Control'], 'no-store')
    assert.equal(JSON.stringify(response.body).includes(oidcSentinel), false)
})

test('HTTP probe preserves the Firestore status and serializes only the requested status fields', async () => {
    const response = fakeResponse()
    await createWifProbeHandler({
        env: {
            ...productionEnv,
            SECURITY_PROBE_ENABLED: 'true',
            SECURITY_PROBE_SECRET: 'test-only-secret'
        },
        probe: async () => ({ stage: 'firestore_rest', httpStatus: 404, transportFailure: false })
    })(
        { method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } },
        response
    )
    assert.equal(response.statusCode, 404)
    assert.deepEqual(response.body, {
        stage: 'firestore_rest',
        httpStatus: 404,
        transportFailure: false
    })
})

test('HTTP probe sanitizes transport failures to safe class and cause code only', async () => {
    const response = fakeResponse()
    await createWifProbeHandler({
        env: {
            ...productionEnv,
            SECURITY_PROBE_ENABLED: 'true',
            SECURITY_PROBE_SECRET: 'test-only-secret'
        },
        probe: async () => ({
            transportFailure: true,
            errorClass: 'TypeError',
            causeCode: 'ECONNRESET',
            message: oidcSentinel,
            stack: oidcSentinel
        })
    })(
        { method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } },
        response
    )
    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.body, {
        transportFailure: true,
        errorClass: 'TypeError',
        causeCode: 'ECONNRESET'
    })
    assert.equal(JSON.stringify(response.body).includes(oidcSentinel), false)
})

test('HTTP probe rejects an unrecognized diagnostic code instead of serializing it', async () => {
    const response = fakeResponse()
    await createWifProbeHandler({
        env: {
            ...productionEnv,
            SECURITY_PROBE_ENABLED: 'true',
            SECURITY_PROBE_SECRET: 'test-only-secret'
        },
        probe: async () => ({
            ok: false,
            stage: 'google_sts_exchange',
            code: oidcSentinel,
            claimsMatchExpected: true
        })
    })(
        { method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } },
        response
    )

    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.body, {
        ok: false,
        stage: 'vercel_oidc_token',
        code: 'OIDC_TOKEN_UNAVAILABLE'
    })
    assert.equal(JSON.stringify(response.body).includes(oidcSentinel), false)
})

test('HTTP probe passes the environment using the diagnostic options contract', async () => {
    const env = {
        ...productionEnv,
        SECURITY_PROBE_ENABLED: 'true',
        SECURITY_PROBE_SECRET: 'test-only-secret'
    }
    let received
    const response = fakeResponse()
    await createWifProbeHandler({
        env,
        probe: async options => {
            received = options
            return { stage: 'firestore_rest', httpStatus: 404, transportFailure: false }
        }
    })({ method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } }, response)

    assert.deepEqual(received, { env })
    assert.equal(response.statusCode, 404)
})
