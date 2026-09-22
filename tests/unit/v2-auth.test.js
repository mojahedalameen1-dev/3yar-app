import { describe, expect, it, vi } from 'vitest'
import { createV2Authenticator, requireV2Owner, requireV2Role, assertV2MutationAllowed, withV2Auth } from '../../server/auth/v2-auth.js'
import { HttpError } from '../../server/http/http-error.js'

describe('V2 authentication and authorization', () => {
  it('derives userId exclusively from a verified Firebase token', async () => {
    const verifyIdToken = vi.fn(async token => ({ uid: token === 'valid' ? 'firebase-user' : null }))
    const authenticate = createV2Authenticator({ verifyIdToken })
    const identity = await authenticate({
      headers: { authorization: 'Bearer valid' },
      body: { userId: 'attacker-user' },
      query: { userId: 'attacker-query-user' }
    })

    expect(identity.userId).toBe('firebase-user')
    expect(verifyIdToken).toHaveBeenCalledWith('valid')
  })

  it('rejects anonymous and invalid Firebase ID tokens as 401', async () => {
    const authenticate = createV2Authenticator({ verifyIdToken: async () => { throw new Error('bad token') } })
    await expect(authenticate({ headers: {} })).rejects.toMatchObject({ status: 401 })
    await expect(authenticate({ headers: { authorization: 'Bearer invalid' } })).rejects.toMatchObject({ status: 401 })
  })

  it('enforces ownership independently of authentication', () => {
    expect(requireV2Owner({ identity: { userId: 'owner' }, resource: { userId: 'owner' } })).toBe(true)
    expect(() => requireV2Owner({ identity: { userId: 'other' }, resource: { userId: 'owner' } }))
      .toThrowError(expect.objectContaining({ status: 403 }))
  })

  it('enforces role from verified custom claims independently of ownership', () => {
    expect(requireV2Role({ identity: { userId: 'admin', claims: { admin: true } } })).toBe(true)
    expect(requireV2Role({ identity: { userId: 'moderator', claims: { role: 'moderator' } }, allowedRoles: ['moderator'] })).toBe(true)
    expect(() => requireV2Role({ identity: { userId: 'user', claims: { role: 'user' } }, allowedRoles: ['admin'] }))
      .toThrowError(expect.objectContaining({ status: 403 }))
  })

  it('blocks mutations after tombstoning and exposes the auth middleware status', async () => {
    expect(() => assertV2MutationAllowed({ deletionState: 'tombstoned' })).toThrowError(HttpError)
    const handler = withV2Auth(async (_request, response, identity) => response.status(200).json({ uid: identity.userId }), {
      verifyIdToken: async () => ({ uid: 'verified-user' })
    })
    const response = {
      statusCode: 0,
      status(code) { this.statusCode = code; return this },
      json(value) { this.value = value; return this },
      setHeader() {}
    }
    await handler({ headers: { authorization: 'Bearer token' }, body: { userId: 'spoofed' } }, response)
    expect(response.statusCode).toBe(200)
    expect(response.value).toEqual({ uid: 'verified-user' })
  })
})
