import assert from 'node:assert/strict'
import test from 'node:test'
import { constantTimeSecretMatch, createWifProbeHandler } from '../../api/internal/security/wif-probe.js'

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

const productionEnv = {
    VERCEL_ENV: 'production',
    SECURITY_PROBE_ENABLED: 'true',
    SECURITY_PROBE_SECRET: 'test-only-secret'
}

test('probe secret comparison accepts exact values and rejects mismatches safely', () => {
    assert.equal(constantTimeSecretMatch('test-only-secret', 'test-only-secret'), true)
    assert.equal(constantTimeSecretMatch('wrong', 'test-only-secret'), false)
    assert.equal(constantTimeSecretMatch(undefined, 'test-only-secret'), false)
})

test('probe only allows GET and never runs for other methods', async () => {
    let calls = 0
    const handler = createWifProbeHandler({ env: productionEnv, probe: async () => { calls++; return false } })
    const response = fakeResponse()
    await handler({ method: 'POST', headers: { 'x-3yar-security-probe': 'test-only-secret' } }, response)
    assert.equal(response.statusCode, 405)
    assert.equal(calls, 0)
})

test('probe is hidden unless Production, enabled, and authorized by header', async () => {
    let calls = 0
    const probe = async () => { calls++; return false }
    for (const env of [
        { ...productionEnv, VERCEL_ENV: 'preview' },
        { ...productionEnv, SECURITY_PROBE_ENABLED: 'false' }
    ]) {
        const response = fakeResponse()
        await createWifProbeHandler({ env, probe })({ method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } }, response)
        assert.equal(response.statusCode, 404)
    }
    const missingHeader = fakeResponse()
    await createWifProbeHandler({ env: productionEnv, probe })({ method: 'GET', headers: {} }, missingHeader)
    assert.equal(missingHeader.statusCode, 404)
    assert.equal(calls, 0)
})

test('probe returns only the read-only OIDC verification result', async () => {
    const response = fakeResponse()
    await createWifProbeHandler({ env: productionEnv, probe: async () => false })(
        { method: 'GET', headers: { 'x-3yar-security-probe': 'test-only-secret' } },
        response
    )
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, {
        ok: true,
        authMode: 'oidc',
        projectId: 'yar-3yar-free',
        firestoreReachable: true,
        documentExists: false
    })
    assert.equal(response.headers['Cache-Control'], 'no-store')
})
