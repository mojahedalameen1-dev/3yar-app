import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fakeDb, verifyIdToken } = vi.hoisted(() => ({
  fakeDb: {
    collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }),
    runTransaction: async () => undefined
  },
  verifyIdToken: vi.fn(async token => {
    if (token === 'user-token') return { uid: 'verified-user' }
    if (token === 'admin-token') return { uid: 'verified-admin', admin: true }
    throw new Error('invalid token')
  })
}))

vi.mock('../../api/_firebase-admin.js', () => ({
  adminAuth: () => ({ verifyIdToken }),
  adminDb: () => fakeDb
}))

const routes = [
  (await import('../../api/v2/attachments/upload-grant.js')).default,
  (await import('../../api/v2/attachments/finalize.js')).default,
  (await import('../../api/v2/attachments/link.js')).default,
  (await import('../../api/v2/attachments/read-grant.js')).default,
  (await import('../../api/v2/attachments/proxy.js')).default,
  (await import('../../api/v2/deletions/request.js')).default,
  (await import('../../api/v2/internal/orphan-cleanup.js')).default,
  (await import('../../api/v2/internal/cascade-worker.js')).default
]

function responseMock() {
  return {
    statusCode: 0,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
    setHeader(name, value) { this.headers[name] = value }
  }
}

function request({ token, method = 'POST', body = { userId: 'forged-user' } } = {}) {
  return {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
    query: { userId: 'forged-query-user', attachmentId: 'synthetic-id' }
  }
}

describe('V2 API route authentication and authorization boundary', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('FIREBASE_ENVIRONMENT', '')
    vi.stubEnv('FIREBASE_PROJECT_ID', '')
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_JSON', '')
  })

  it('rejects unauthenticated calls at every V2 API route before reading request identity', async () => {
    for (const handler of routes) {
      const response = responseMock()
      await handler(request(), response)
      expect(response.statusCode).toBe(401)
      expect(response.body.code).toBe('unauthenticated')
    }
  })

  it('uses the verified token identity and keeps new attachment features safely Off by default', async () => {
    const response = responseMock()
    await routes[0](request({ token: 'user-token', body: {
      userId: 'forged-user', filename: 'receipt.pdf', contentType: 'application/pdf', size: 12
    } }), response)

    expect(verifyIdToken).toHaveBeenCalledWith('user-token')
    expect(response.statusCode).toBe(404)
    expect(response.body.code).toBe('feature_unavailable')
  })

  it('requires the verified admin claim for internal workers and still rejects non-Staging execution', async () => {
    const userResponse = responseMock()
    await routes[6](request({ token: 'user-token' }), userResponse)
    expect(userResponse.statusCode).toBe(403)
    expect(userResponse.body.code).toBe('forbidden')

    const adminResponse = responseMock()
    await routes[7](request({ token: 'admin-token', body: { jobId: 'a'.repeat(64) } }), adminResponse)
    expect(adminResponse.statusCode).toBe(403)
    expect(adminResponse.body.code).toBe('staging_only')
  })
})
